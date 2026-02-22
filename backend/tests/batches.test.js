import request from 'supertest';

import app from '../src/app.js';
import { authHeaders, createAdminUser, loginAndGetToken } from './helpers/auth.js';

const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

describe('Batches Integration', () => {
  test('batch list and filters work', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const supplier = await request(app)
      .post('/api/v1/suppliers')
      .set(authHeaders(token))
      .send({ name: 'Batch Supplier', phone: '9800011113', address: 'Bhaktapur' });

    const medSoon = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'BatchSoon', strength: '10mg' });

    const medLow = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'BatchLow', strength: '20mg' });

    await request(app)
      .post('/api/v1/purchase-receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplier.body.data.id,
        invoice_number: 'INV-BATCH-001',
        invoice_date: '2026-02-18',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: medSoon.body.data.id,
            pack: '10x10',
            batch_no: 'SOON-1',
            expiry_date: dateOffset(5),
            quantity_boxes: 5,
            purchase_price: 90,
            mrp: 120,
          },
          {
            medicine_id: medLow.body.data.id,
            pack: '10x10',
            batch_no: 'LOW-1',
            expiry_date: dateOffset(120),
            quantity_boxes: 5,
            purchase_price: 95,
            mrp: 130,
          },
        ],
      });

    const lookupLow = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: medLow.body.data.id,
        pack: '10x10',
        batch_no: 'LOW-1',
        expiry_date: dateOffset(120),
      })
      .set(authHeaders(token));

    await request(app)
      .post('/api/v1/stock-issues')
      .set(authHeaders(token))
      .send({
        batch_stock_id: lookupLow.body.data.batch_stock_id,
        issued_boxes: 3,
        issued_date: '2026-02-19',
        remark: 'LOW-STOCK-TEST',
      });

    const all = await request(app).get('/api/v1/batches').set(authHeaders(token));
    expect(all.status).toBe(200);
    expect(all.body.data.items.length).toBeGreaterThan(0);

    const expSoon = await request(app)
      .get('/api/v1/batches')
      .query({ expiry_status: 'expiring_soon' })
      .set(authHeaders(token));

    expect(expSoon.status).toBe(200);
    expect(expSoon.body.data.items.some((item) => item.batch_no === 'SOON-1')).toBe(true);

    const lowStock = await request(app)
      .get('/api/v1/batches')
      .query({ stock_status: 'low_stock' })
      .set(authHeaders(token));

    expect(lowStock.status).toBe(200);
    expect(lowStock.body.data.items.some((item) => item.batch_no === 'LOW-1')).toBe(true);
  });
});
