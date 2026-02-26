import mongoose from 'mongoose';

import { connectDB } from '../config/db.js';
import BatchStock from '../models/BatchStock.js';
import PurchaseReceiptItem from '../models/PurchaseReceiptItem.js';
import User from '../models/User.js';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const forcePharmacyArg = args.find((arg) => arg.startsWith('--force-pharmacy='));
const forcedPharmacyId = forcePharmacyArg ? forcePharmacyArg.split('=')[1]?.trim() : '';
const hasForcedPharmacyId = Boolean(forcedPharmacyId);

if (hasForcedPharmacyId && !mongoose.Types.ObjectId.isValid(forcedPharmacyId)) {
  console.error('Invalid --force-pharmacy value. Expected a valid ObjectId.');
  process.exit(1);
}

const getPharmacyIdsFromReceipts = async (batch) => {
  const rows = await PurchaseReceiptItem.aggregate([
    {
      $match: {
        medicineId: batch.medicineId,
        pack: batch.pack,
        batchNo: batch.batchNo,
        expiryDate: batch.expiryDate,
      },
    },
    {
      $lookup: {
        from: 'purchasereceipts',
        localField: 'receiptId',
        foreignField: '_id',
        as: 'receipt',
        pipeline: [{ $project: { _id: 1, createdBy: 1 } }],
      },
    },
    {
      $unwind: {
        path: '$receipt',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'receipt.createdBy',
        foreignField: '_id',
        as: 'creator',
        pipeline: [{ $project: { _id: 1, pharmacyId: 1 } }],
      },
    },
    {
      $unwind: {
        path: '$creator',
        preserveNullAndEmptyArrays: false,
      },
    },
    {
      $match: {
        'creator.pharmacyId': { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$creator.pharmacyId',
      },
    },
  ]);

  return rows.map((row) => row._id.toString());
};

const run = async () => {
  console.log(
    `[backfill:batch-pharmacy] mode=${isDryRun ? 'dry-run' : 'write'} forcePharmacy=${
      hasForcedPharmacyId ? forcedPharmacyId : 'none'
    }`
  );

  await connectDB();

  const filter = {
    $or: [{ pharmacyId: { $exists: false } }, { pharmacyId: null }],
  };

  const totalLegacy = await BatchStock.countDocuments(filter);
  console.log(`Legacy batchstocks without pharmacyId: ${totalLegacy}`);

  if (totalLegacy === 0) {
    await mongoose.disconnect();
    console.log('No backfill needed.');
    return;
  }

  let updated = 0;
  let unresolved = 0;
  let conflicts = 0;
  let failed = 0;
  let forced = 0;

  const cursor = BatchStock.find(filter)
    .select('_id medicineId pack batchNo expiryDate createdBy')
    .lean()
    .cursor();

  for await (const batch of cursor) {
    try {
      let pharmacyId = null;

      if (batch.createdBy) {
        const creator = await User.findById(batch.createdBy).select('_id pharmacyId').lean();
        if (creator?.pharmacyId) {
          pharmacyId = creator.pharmacyId.toString();
        }
      }

      if (!pharmacyId) {
        const inferred = await getPharmacyIdsFromReceipts(batch);

        if (inferred.length === 1) {
          pharmacyId = inferred[0];
        } else if (inferred.length > 1) {
          if (hasForcedPharmacyId) {
            pharmacyId = forcedPharmacyId;
            forced += 1;
          } else {
            conflicts += 1;
            console.warn(
              `Conflict: batch ${batch._id} matches multiple pharmacies [${inferred.join(', ')}]`
            );
            continue;
          }
        }
      }

      if (!pharmacyId) {
        if (hasForcedPharmacyId) {
          pharmacyId = forcedPharmacyId;
          forced += 1;
        } else {
          unresolved += 1;
          console.warn(`Unresolved: batch ${batch._id} has no pharmacy link`);
          continue;
        }
      }

      if (!isDryRun) {
        await BatchStock.updateOne(
          { _id: batch._id },
          { $set: { pharmacyId: new mongoose.Types.ObjectId(pharmacyId) } }
        );
      }

      updated += 1;
    } catch (error) {
      failed += 1;
      console.error(`Failed: batch ${batch._id}`, error.message);
    }
  }

  await mongoose.disconnect();

  console.log('Backfill complete.');
  console.log(`DryRun: ${isDryRun ? 'yes' : 'no'}`);
  console.log(`ForcedByFlag: ${forced}`);
  console.log(`Updated: ${updated}`);
  console.log(`Unresolved: ${unresolved}`);
  console.log(`Conflicts: ${conflicts}`);
  console.log(`Failed: ${failed}`);
};

run().catch(async (error) => {
  console.error('Backfill script error:', error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
