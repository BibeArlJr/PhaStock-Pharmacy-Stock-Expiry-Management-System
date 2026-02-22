import mongoose from 'mongoose';

import { connectDB } from '../../src/config/db.js';
import BatchStock from '../../src/models/BatchStock.js';
import Medicine from '../../src/models/Medicine.js';
import PurchaseReceipt from '../../src/models/PurchaseReceipt.js';
import PurchaseReceiptItem from '../../src/models/PurchaseReceiptItem.js';
import Settings from '../../src/models/Settings.js';
import StockIssue from '../../src/models/StockIssue.js';
import Supplier from '../../src/models/Supplier.js';
import User from '../../src/models/User.js';

beforeAll(async () => {
  await connectDB();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Settings.deleteMany({}),
    Medicine.deleteMany({}),
    Supplier.deleteMany({}),
    PurchaseReceipt.deleteMany({}),
    PurchaseReceiptItem.deleteMany({}),
    BatchStock.deleteMany({}),
    StockIssue.deleteMany({}),
  ]);
});

afterAll(async () => {
  await mongoose.connection.close();
});
