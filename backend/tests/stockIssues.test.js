import request from 'supertest';

import app from '../src/app.js';
import { authHeaders, createAdminUser, loginAndGetToken } from './helpers/auth.js';
import StockIssue from '../src/models/StockIssue.js';
import User from '../src/models/User.js';

const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

describe('Stock Issues Integration', () => {
  test('fefo suggest, issue success, insufficient stock, expired batch, invalid issue date', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const supplier = await request(app)
      .post('/api/v1/suppliers')
      .set(authHeaders(token))
      .send({ name: 'Issue Supplier', phone: '9800011114', address: 'Lalitpur' });

    const med = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'IssueMed', strength: '25mg' });

    await request(app)
      .post('/api/v1/purchase-receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplier.body.data.id,
        invoice_number: 'INV-ISS-001',
        invoice_date: '2026-02-18',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: med.body.data.id,
            pack: '10x10',
            batch_no: 'ISS-EARLY',
            expiry_date: dateOffset(20),
            quantity_boxes: 6,
            purchase_price: 110,
            mrp: 145,
          },
          {
            medicine_id: med.body.data.id,
            pack: '10x10',
            batch_no: 'ISS-LATE',
            expiry_date: dateOffset(120),
            quantity_boxes: 6,
            purchase_price: 112,
            mrp: 150,
          },
          {
            medicine_id: med.body.data.id,
            pack: '10x10',
            batch_no: 'ISS-EXPIRED',
            expiry_date: dateOffset(-2),
            quantity_boxes: 3,
            purchase_price: 90,
            mrp: 120,
          },
        ],
      });

    const fefo = await request(app)
      .get('/api/v1/stock-issues/fefo-suggest')
      .query({ medicine_id: med.body.data.id })
      .set(authHeaders(token));

    expect(fefo.status).toBe(200);
    expect(fefo.body.data.suggested.batch_no).toBe('ISS-EARLY');

    const lookupEarly = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: med.body.data.id,
        pack: '10x10',
        batch_no: 'ISS-EARLY',
        expiry_date: dateOffset(20),
      })
      .set(authHeaders(token));

    const issueOk = await request(app)
      .post('/api/v1/stock-issues')
      .set(authHeaders(token))
      .send({
        batch_stock_id: lookupEarly.body.data.batch_stock_id,
        issued_boxes: 2,
        issued_date: '2026-02-20',
        remark: 'ISSUE-OK',
      });

    expect(issueOk.status).toBe(201);
    expect(issueOk.body.data.remaining_boxes).toBe(4);

    const issueInsufficient = await request(app)
      .post('/api/v1/stock-issues')
      .set(authHeaders(token))
      .send({
        batch_stock_id: lookupEarly.body.data.batch_stock_id,
        issued_boxes: 999,
        issued_date: '2026-02-21',
        remark: 'ISSUE-TOO-MUCH',
      });

    expect(issueInsufficient.status).toBe(400);
    expect(issueInsufficient.body.code).toBe('INSUFFICIENT_STOCK');

    const lookupExpired = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: med.body.data.id,
        pack: '10x10',
        batch_no: 'ISS-EXPIRED',
        expiry_date: dateOffset(-2),
      })
      .set(authHeaders(token));

    const issueExpired = await request(app)
      .post('/api/v1/stock-issues')
      .set(authHeaders(token))
      .send({
        batch_stock_id: lookupExpired.body.data.batch_stock_id,
        issued_boxes: 1,
        issued_date: '2026-02-21',
        remark: 'ISSUE-EXPIRED',
      });

    expect(issueExpired.status).toBe(400);
    expect(issueExpired.body.code).toBe('BATCH_EXPIRED');

    const issueInvalidDate = await request(app)
      .post('/api/v1/stock-issues')
      .set(authHeaders(token))
      .send({
        batch_stock_id: lookupEarly.body.data.batch_stock_id,
        issued_boxes: 1,
        issued_date: '2026-02-01',
        remark: 'ISSUE-INVALID-DATE',
      });

    expect(issueInvalidDate.status).toBe(400);
    expect(issueInvalidDate.body.code).toBe('INVALID_ISSUE_DATE');
  });

  test('list endpoint handles legacy doc without items', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    await StockIssue.collection.insertOne({
      issueNo: 'ISS-LEGACY',
      issueDate: new Date(),
      status: 'ACTIVE',
      totalQty: 0,
      createdBy: adminUser._id,
    });

    const response = await request(app)
      .get('/api/v1/stock-issues')
      .set(authHeaders(token))
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data?.items)).toBe(true);
  });

  test('update rewrites items transactionally', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const supplier = await request(app)
      .post('/api/v1/suppliers')
      .set(authHeaders(token))
      .send({ name: 'Edit Supplier', phone: '9800011117', address: 'Lalitpur' });

    const med = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'EditMed3', strength: '10mg' });

    await request(app)
      .post('/api/v1/purchase-receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplier.body.data.id,
        invoice_number: 'INV-ISS-004',
        invoice_date: '2026-02-18',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: med.body.data.id,
            pack: '5x10',
            batch_no: 'EDIT-NEW',
            expiry_date: dateOffset(30),
            quantity_boxes: 10,
            purchase_price: 100,
            mrp: 130,
          },
        ],
      });

    const lookup = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: med.body.data.id,
        pack: '5x10',
        batch_no: 'EDIT-NEW',
        expiry_date: dateOffset(30),
      })
      .set(authHeaders(token));

    const initial = await request(app)
      .post('/api/v1/stock-issues')
      .set(authHeaders(token))
      .send({
        batch_stock_id: lookup.body.data.batch_stock_id,
        issued_boxes: 2,
        issued_date: '2026-03-01',
        remark: 'Editable',
      });
    expect(initial.status).toBe(201);
    const issueId = initial.body.data.stock_issue_id;

    const before = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: med.body.data.id,
        pack: '5x10',
        batch_no: 'EDIT-NEW',
        expiry_date: dateOffset(30),
      })
      .set(authHeaders(token));

    const update = await request(app)
      .patch(`/api/v1/stock-issues/${issueId}`)
      .set(authHeaders(token))
      .send({
        issue_date: '2026-03-02',
        reference: 'Updated',
        notes: 'New qty',
        items: [
          {
            batch_stock_id: lookup.body.data.batch_stock_id,
            qty_boxes: 4,
          },
        ],
      });

    expect(update.status).toBe(200);

    const after = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: med.body.data.id,
        pack: '5x10',
        batch_no: 'EDIT-NEW',
        expiry_date: dateOffset(30),
      })
      .set(authHeaders(token));

    expect(after.body.data.available_boxes).toBe(before.body.data.available_boxes - 4);
  });

  test('update rejects insufficient stock and leaves quantities intact', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const supplier = await request(app)
      .post('/api/v1/suppliers')
      .set(authHeaders(token))
      .send({ name: 'Edit Supplier 2', phone: '9800011118', address: 'Lalitpur' });

    const med = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'EditMed4', strength: '12mg' });

    await request(app)
      .post('/api/v1/purchase-receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplier.body.data.id,
        invoice_number: 'INV-ISS-005',
        invoice_date: '2026-02-18',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: med.body.data.id,
            pack: '5x20',
            batch_no: 'EDIT-NEW2',
            expiry_date: dateOffset(30),
            quantity_boxes: 2,
            purchase_price: 100,
            mrp: 130,
          },
        ],
      });

    const lookup = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: med.body.data.id,
        pack: '5x20',
        batch_no: 'EDIT-NEW2',
        expiry_date: dateOffset(30),
      })
      .set(authHeaders(token));

    const initial = await request(app)
      .post('/api/v1/stock-issues')
      .set(authHeaders(token))
      .send({
        batch_stock_id: lookup.body.data.batch_stock_id,
        issued_boxes: 1,
        issued_date: '2026-03-01',
        remark: 'Editable fail',
      });
    expect(initial.status).toBe(201);
    const issueId = initial.body.data.stock_issue_id;

    const attempt = await request(app)
      .patch(`/api/v1/stock-issues/${issueId}`)
      .set(authHeaders(token))
      .send({
        items: [
          {
            batch_stock_id: lookup.body.data.batch_stock_id,
            qty_boxes: 999,
          },
        ],
      });

    expect(attempt.status).toBe(400);
    expect(attempt.body.code).toBe('INSUFFICIENT_STOCK');

    const after = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: med.body.data.id,
        pack: '5x20',
        batch_no: 'EDIT-NEW2',
        expiry_date: dateOffset(30),
      })
      .set(authHeaders(token));

    expect(after.body.data.available_boxes).toBe(lookup.body.data.available_boxes - 1);
  });
});
