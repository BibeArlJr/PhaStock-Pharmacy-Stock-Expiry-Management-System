import mongoose from 'mongoose';

import { connectDB } from '../config/db.js';
import Medicine from '../models/Medicine.js';
import BatchStock from '../models/BatchStock.js';
import PurchaseReceipt from '../models/PurchaseReceipt.js';
import Settings from '../models/Settings.js';
import StockIssue from '../models/StockIssue.js';
import Supplier from '../models/Supplier.js';
import User from '../models/User.js';
import { hashPassword } from '../services/auth.service.js';
import * as ReceiptService from '../services/receipt.service.js';
import * as StockIssueService from '../services/stockIssue.service.js';

const now = new Date();

const supplierSeeds = [
  { name: 'Everest Pharma Distributors', phone: '9800000001', address: 'Kathmandu' },
  { name: 'Himal Care Supplies', phone: '9800000002', address: 'Pokhara' },
  { name: 'Valley Med Traders', phone: '9800000003', address: 'Lalitpur' },
];

const medicineSeeds = [
  { name: 'Paracetamol', strength: '500mg', category: 'Analgesic' },
  { name: 'Amoxicillin', strength: '250mg', category: 'Antibiotic' },
  { name: 'Cetirizine', strength: '10mg', category: 'Antihistamine' },
  { name: 'Ibuprofen', strength: '400mg', category: 'NSAID' },
  { name: 'Azithromycin', strength: '500mg', category: 'Antibiotic' },
  { name: 'Pantoprazole', strength: '40mg', category: 'Gastro' },
  { name: 'Metformin', strength: '500mg', category: 'Diabetes' },
  { name: 'Amlodipine', strength: '5mg', category: 'Cardiac' },
  { name: 'Losartan', strength: '50mg', category: 'Cardiac' },
  { name: 'Vitamin C', strength: '500mg', category: 'Supplement' },
];

const receiptSeeds = [
  {
    supplierName: 'Everest Pharma Distributors',
    invoiceNumber: 'DEMO-INV-1001',
    invoiceDate: '2026-01-15',
    paymentMode: 'CREDIT',
    receiptType: 'NORMAL_PURCHASE',
    items: [
      {
        medicine: { name: 'Paracetamol', strength: '500mg' },
        pack: '10x10',
        batchNo: 'PAR500A',
        expiryDate: '2027-01-31',
        quantityBoxes: 40,
        purchasePrice: 110,
        mrp: 145,
      },
      {
        medicine: { name: 'Amoxicillin', strength: '250mg' },
        pack: '10x10',
        batchNo: 'AMX250A',
        expiryDate: '2026-11-30',
        quantityBoxes: 30,
        purchasePrice: 185,
        mrp: 240,
      },
      {
        medicine: { name: 'Cetirizine', strength: '10mg' },
        pack: '10x10',
        batchNo: 'CET10A',
        expiryDate: '2026-09-30',
        quantityBoxes: 25,
        purchasePrice: 70,
        mrp: 95,
      },
      {
        medicine: { name: 'Ibuprofen', strength: '400mg' },
        pack: '10x10',
        batchNo: 'IBU400A',
        expiryDate: '2026-08-31',
        quantityBoxes: 20,
        purchasePrice: 120,
        mrp: 160,
      },
    ],
  },
  {
    supplierName: 'Himal Care Supplies',
    invoiceNumber: 'DEMO-INV-1002',
    invoiceDate: '2026-02-05',
    paymentMode: 'BANK',
    receiptType: 'NORMAL_PURCHASE',
    items: [
      {
        medicine: { name: 'Pantoprazole', strength: '40mg' },
        pack: '10x10',
        batchNo: 'PAN40A',
        expiryDate: '2027-03-31',
        quantityBoxes: 35,
        purchasePrice: 220,
        mrp: 290,
      },
      {
        medicine: { name: 'Metformin', strength: '500mg' },
        pack: '10x10',
        batchNo: 'MET500A',
        expiryDate: '2026-12-31',
        quantityBoxes: 45,
        purchasePrice: 95,
        mrp: 130,
      },
      {
        medicine: { name: 'Amlodipine', strength: '5mg' },
        pack: '10x10',
        batchNo: 'AML5A',
        expiryDate: '2027-02-28',
        quantityBoxes: 22,
        purchasePrice: 80,
        mrp: 112,
      },
      {
        medicine: { name: 'Losartan', strength: '50mg' },
        pack: '10x10',
        batchNo: 'LOS50A',
        expiryDate: '2026-10-31',
        quantityBoxes: 18,
        purchasePrice: 140,
        mrp: 185,
      },
      {
        medicine: { name: 'Vitamin C', strength: '500mg' },
        pack: '10x10',
        batchNo: 'VITC500A',
        expiryDate: '2026-07-31',
        quantityBoxes: 28,
        purchasePrice: 60,
        mrp: 90,
      },
    ],
  },
];

const stockIssueSeeds = [
  {
    identity: {
      medicine: { name: 'Paracetamol', strength: '500mg' },
      pack: '10x10',
      batchNo: 'PAR500A',
      expiryDate: '2027-01-31',
    },
    issuedBoxes: 6,
    issuedDate: '2026-02-10',
    remark: 'DEMO-STOCK-ISSUE-1',
  },
  {
    identity: {
      medicine: { name: 'Amoxicillin', strength: '250mg' },
      pack: '10x10',
      batchNo: 'AMX250A',
      expiryDate: '2026-11-30',
    },
    issuedBoxes: 4,
    issuedDate: '2026-02-12',
    remark: 'DEMO-STOCK-ISSUE-2',
  },
  {
    identity: {
      medicine: { name: 'Pantoprazole', strength: '40mg' },
      pack: '10x10',
      batchNo: 'PAN40A',
      expiryDate: '2027-03-31',
    },
    issuedBoxes: 5,
    issuedDate: '2026-02-16',
    remark: 'DEMO-STOCK-ISSUE-3',
  },
];

const summary = {
  settings: { created: 0, updated: 0, skipped: 0 },
  users: { created: 0, skipped: 0 },
  suppliers: { created: 0, skipped: 0 },
  medicines: { created: 0, skipped: 0 },
  receipts: { created: 0, skipped: 0 },
  stockIssues: { created: 0, skipped: 0 },
};

const logStep = (label, message) => {
  console.log(`[${label}] ${message}`);
};

const seedSettings = async () => {
  const existing = await Settings.findOne();

  if (!existing) {
    await Settings.create({
      lowStockLimitBoxes: 2,
      expiryAlertDays: 30,
    });
    summary.settings.created += 1;
    logStep('settings', 'created default settings');
    return;
  }

  let changed = false;

  if (existing.lowStockLimitBoxes === undefined || existing.lowStockLimitBoxes === null) {
    existing.lowStockLimitBoxes = 2;
    changed = true;
  }

  if (existing.expiryAlertDays === undefined || existing.expiryAlertDays === null) {
    existing.expiryAlertDays = 30;
    changed = true;
  }

  if (changed) {
    await existing.save();
    summary.settings.updated += 1;
    logStep('settings', 'updated missing default fields');
    return;
  }

  summary.settings.skipped += 1;
  logStep('settings', 'already present, skipped');
};

const seedUsers = async () => {
  const userSeeds = [
    { fullName: 'Admin User', username: 'admin', password: 'admin123', isActive: true },
    { fullName: 'Staff User', username: 'staff', password: 'staff123', isActive: true },
  ];

  const usernames = userSeeds.map((user) => user.username);
  const existingUsers = await User.find({ username: { $in: usernames } }, { username: 1 }).lean();
  const existingSet = new Set(existingUsers.map((user) => user.username));

  const toInsert = [];

  for (const seed of userSeeds) {
    if (existingSet.has(seed.username)) {
      summary.users.skipped += 1;
      logStep('users', `skipped ${seed.username}`);
      continue;
    }

    const passwordHash = await hashPassword(seed.password);
    toInsert.push({
      fullName: seed.fullName,
      username: seed.username,
      passwordHash,
      isActive: seed.isActive,
    });
  }

  if (toInsert.length > 0) {
    await User.insertMany(toInsert, { ordered: true });
    summary.users.created += toInsert.length;
    logStep('users', `created ${toInsert.length} user(s)`);
  }
};

const seedSuppliers = async () => {
  const existing = await Supplier.find(
    { name: { $in: supplierSeeds.map((supplier) => supplier.name) } },
    { name: 1 }
  ).lean();
  const existingSet = new Set(existing.map((supplier) => supplier.name));

  const toInsert = supplierSeeds.filter((supplier) => !existingSet.has(supplier.name));

  if (toInsert.length > 0) {
    await Supplier.insertMany(toInsert, { ordered: true });
    summary.suppliers.created += toInsert.length;
    logStep('suppliers', `created ${toInsert.length} supplier(s)`);
  }

  summary.suppliers.skipped += supplierSeeds.length - toInsert.length;

  if (toInsert.length === 0) {
    logStep('suppliers', 'all suppliers already present, skipped');
  }
};

const medicineKey = (medicine) => `${medicine.name.toLowerCase()}::${(medicine.strength || '').toLowerCase()}`;

const seedMedicines = async () => {
  const existing = await Medicine.find(
    {
      $or: medicineSeeds.map((medicine) => ({
        name: medicine.name,
        strength: medicine.strength,
      })),
    },
    { name: 1, strength: 1 }
  ).lean();

  const existingSet = new Set(existing.map((medicine) => medicineKey(medicine)));
  const toInsert = medicineSeeds.filter((medicine) => !existingSet.has(medicineKey(medicine)));

  if (toInsert.length > 0) {
    await Medicine.insertMany(toInsert, { ordered: true });
    summary.medicines.created += toInsert.length;
    logStep('medicines', `created ${toInsert.length} medicine(s)`);
  }

  summary.medicines.skipped += medicineSeeds.length - toInsert.length;

  if (toInsert.length === 0) {
    logStep('medicines', 'all medicines already present, skipped');
  }
};

const buildReferenceMaps = async () => {
  const [users, suppliers, medicines] = await Promise.all([
    User.find({ username: { $in: ['admin', 'staff'] } }, { username: 1 }).lean(),
    Supplier.find({ name: { $in: supplierSeeds.map((supplier) => supplier.name) } }, { name: 1 }).lean(),
    Medicine.find(
      {
        $or: medicineSeeds.map((medicine) => ({
          name: medicine.name,
          strength: medicine.strength,
        })),
      },
      { name: 1, strength: 1 }
    ).lean(),
  ]);

  const userByUsername = new Map(users.map((user) => [user.username, user]));
  const supplierByName = new Map(suppliers.map((supplier) => [supplier.name, supplier]));
  const medicineByKey = new Map(medicines.map((medicine) => [medicineKey(medicine), medicine]));

  return {
    userByUsername,
    supplierByName,
    medicineByKey,
  };
};

const seedReceipts = async (refs) => {
  const admin = refs.userByUsername.get('admin');

  for (const seed of receiptSeeds) {
    const supplier = refs.supplierByName.get(seed.supplierName);

    if (!supplier || !admin) {
      throw new Error('Missing required references for receipt seeding.');
    }

    const existing = await PurchaseReceipt.findOne(
      {
        supplierId: supplier._id,
        invoiceNumber: seed.invoiceNumber,
      },
      { _id: 1 }
    ).lean();

    if (existing) {
      summary.receipts.skipped += 1;
      logStep('receipts', `skipped ${seed.invoiceNumber}`);
      continue;
    }

    const items = seed.items.map((item) => {
      const medicine = refs.medicineByKey.get(medicineKey(item.medicine));

      if (!medicine) {
        throw new Error(`Medicine not found for receipt item: ${item.medicine.name} ${item.medicine.strength}`);
      }

      return {
        medicineId: medicine._id.toString(),
        pack: item.pack,
        batchNo: item.batchNo,
        expiryDate: new Date(item.expiryDate),
        quantityBoxes: item.quantityBoxes,
        purchasePrice: item.purchasePrice,
        mrp: item.mrp,
      };
    });

    await ReceiptService.createReceipt({
      header: {
        supplierId: supplier._id.toString(),
        invoiceNumber: seed.invoiceNumber,
        invoiceDate: new Date(seed.invoiceDate),
        paymentMode: seed.paymentMode,
        receiptType: seed.receiptType,
      },
      items,
      userId: admin._id.toString(),
    });

    summary.receipts.created += 1;
    logStep('receipts', `created ${seed.invoiceNumber}`);
  }
};

const seedStockIssues = async (refs) => {
  const staff = refs.userByUsername.get('staff') || refs.userByUsername.get('admin');

  for (const seed of stockIssueSeeds) {
    const existing = await StockIssue.findOne({ remark: seed.remark }, { _id: 1 }).lean();

    if (existing) {
      summary.stockIssues.skipped += 1;
      logStep('stock-issues', `skipped ${seed.remark}`);
      continue;
    }

    const medicine = refs.medicineByKey.get(medicineKey(seed.identity.medicine));

    if (!medicine) {
      throw new Error(`Medicine not found for stock issue seed: ${seed.remark}`);
    }

    const batch = await BatchStock.findOne(
      {
        medicineId: medicine._id,
        pack: seed.identity.pack,
        batchNo: seed.identity.batchNo,
        expiryDate: new Date(seed.identity.expiryDate),
      },
      { _id: 1 }
    ).lean();

    if (!batch) {
      summary.stockIssues.skipped += 1;
      logStep('stock-issues', `batch missing for ${seed.remark}, skipped`);
      continue;
    }

    await StockIssueService.createStockIssue({
      batchStockId: batch._id.toString(),
      issuedBoxes: seed.issuedBoxes,
      issuedDate: new Date(seed.issuedDate),
      remark: seed.remark,
      userId: staff._id.toString(),
    });

    summary.stockIssues.created += 1;
    logStep('stock-issues', `created ${seed.remark}`);
  }
};

const printSummary = () => {
  console.log('\nSeed Summary');
  console.log('------------');
  console.log(`Settings    created:${summary.settings.created} updated:${summary.settings.updated} skipped:${summary.settings.skipped}`);
  console.log(`Users       created:${summary.users.created} skipped:${summary.users.skipped}`);
  console.log(`Suppliers   created:${summary.suppliers.created} skipped:${summary.suppliers.skipped}`);
  console.log(`Medicines   created:${summary.medicines.created} skipped:${summary.medicines.skipped}`);
  console.log(`Receipts    created:${summary.receipts.created} skipped:${summary.receipts.skipped}`);
  console.log(`StockIssues created:${summary.stockIssues.created} skipped:${summary.stockIssues.skipped}`);
};

const run = async () => {
  await connectDB();

  logStep('seed', `started at ${now.toISOString()}`);

  await seedSettings();
  await seedUsers();
  await seedSuppliers();
  await seedMedicines();

  const refs = await buildReferenceMaps();

  await seedReceipts(refs);
  await seedStockIssues(refs);

  printSummary();
};

run()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
