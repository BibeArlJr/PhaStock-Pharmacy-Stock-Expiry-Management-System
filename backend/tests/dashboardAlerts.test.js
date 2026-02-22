import request from 'supertest';

import app from '../src/app.js';
import { authHeaders, createAdminUser, loginAndGetToken } from './helpers/auth.js';

const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

describe('Dashboard and Alerts Integration', () => {
  test('dashboard summary counts and alerts lists', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const supplier = await request(app)
      .post('/api/v1/suppliers')
      .set(authHeaders(token))
      .send({ name: 'Dashboard Supplier', phone: '9800011115', address: 'Kathmandu' });

    const medExpired = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'DashExpired', strength: '10mg' });
    const medSoon = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'DashSoon', strength: '20mg' });
    const medLow = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'DashLow', strength: '30mg' });
    const medOut = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'DashOut', strength: '40mg' });

    await request(app)
      .post('/api/v1/purchase-receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplier.body.data.id,
        invoice_number: 'INV-DASH-001',
        invoice_date: '2026-02-18',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: medExpired.body.data.id,
            pack: '10x10',
            batch_no: 'D-EXP',
            expiry_date: dateOffset(-1),
            quantity_boxes: 5,
            purchase_price: 100,
            mrp: 130,
          },
          {
            medicine_id: medSoon.body.data.id,
            pack: '10x10',
            batch_no: 'D-SOON',
            expiry_date: dateOffset(4),
            quantity_boxes: 5,
            purchase_price: 100,
            mrp: 130,
          },
          {
            medicine_id: medLow.body.data.id,
            pack: '10x10',
            batch_no: 'D-LOW',
            expiry_date: dateOffset(60),
            quantity_boxes: 2,
            purchase_price: 100,
            mrp: 130,
          },
          {
            medicine_id: medOut.body.data.id,
            pack: '10x10',
            batch_no: 'D-OUT',
            expiry_date: dateOffset(90),
            quantity_boxes: 1,
            purchase_price: 100,
            mrp: 130,
          },
        ],
      });

    const lookupOut = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: medOut.body.data.id,
        pack: '10x10',
        batch_no: 'D-OUT',
        expiry_date: dateOffset(90),
      })
      .set(authHeaders(token));

    await request(app)
      .post('/api/v1/stock-issues')
      .set(authHeaders(token))
      .send({
        batch_stock_id: lookupOut.body.data.batch_stock_id,
        issued_boxes: 1,
        issued_date: '2026-02-20',
        remark: 'DASH-OUT-ISSUE',
      });

    const summary = await request(app)
      .get('/api/v1/dashboard/summary')
      .set(authHeaders(token));

    expect(summary.status).toBe(200);
    expect(summary.body.data.total_medicines).toBe(4);
    expect(summary.body.data.expired_batches).toBe(1);
    expect(summary.body.data.expiring_soon_batches).toBe(1);
    expect(summary.body.data.low_stock_batches).toBe(1);
    expect(summary.body.data.out_of_stock_batches).toBe(1);

    const expSoon = await request(app)
      .get('/api/v1/alerts/expiring-soon?page=1&limit=20')
      .set(authHeaders(token));
    expect(expSoon.status).toBe(200);
    expect(expSoon.body.data.total).toBe(1);

    const expired = await request(app)
      .get('/api/v1/alerts/expired?page=1&limit=20')
      .set(authHeaders(token));
    expect(expired.status).toBe(200);
    expect(expired.body.data.total).toBe(1);

    const low = await request(app)
      .get('/api/v1/alerts/low-stock?page=1&limit=20')
      .set(authHeaders(token));
    expect(low.status).toBe(200);
    expect(low.body.data.total).toBe(1);

    const out = await request(app)
      .get('/api/v1/alerts/out-of-stock?page=1&limit=20')
      .set(authHeaders(token));
    expect(out.status).toBe(200);
    expect(out.body.data.total).toBe(1);
  });
});
