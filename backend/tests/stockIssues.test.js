import request from 'supertest';

import app from '../src/app.js';
import { authHeaders, createAdminUser, loginAndGetToken } from './helpers/auth.js';

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
});
