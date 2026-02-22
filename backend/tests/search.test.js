import request from 'supertest';

import app from '../src/app.js';
import { authHeaders, createAdminUser, loginAndGetToken } from './helpers/auth.js';

const dateOffset = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

describe('Search Integration', () => {
  test('receipt-search by batch_no returns rows and price-history newest first', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const supplier = await request(app)
      .post('/api/v1/suppliers')
      .set(authHeaders(token))
      .send({ name: 'Search Supplier', phone: '9800011116', address: 'Kathmandu' });

    const med = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'SearchMed', strength: '55mg' });

    await request(app)
      .post('/api/v1/purchase-receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplier.body.data.id,
        invoice_number: 'INV-SRCH-001',
        invoice_date: '2026-02-18',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: med.body.data.id,
            pack: '10x10',
            batch_no: 'SRCH-BATCH',
            expiry_date: dateOffset(200),
            quantity_boxes: 4,
            purchase_price: 100,
            mrp: 130,
          },
        ],
      });

    await request(app)
      .post('/api/v1/purchase-receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplier.body.data.id,
        invoice_number: 'INV-SRCH-002',
        invoice_date: '2026-02-19',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: med.body.data.id,
            pack: '10x10',
            batch_no: 'SRCH-BATCH',
            expiry_date: dateOffset(200),
            quantity_boxes: 3,
            purchase_price: 120,
            mrp: 150,
          },
        ],
      });

    const receiptSearch = await request(app)
      .get('/api/v1/receipt-search')
      .query({ batch_no: 'SRCH-BATCH', page: 1, limit: 20 })
      .set(authHeaders(token));

    expect(receiptSearch.status).toBe(200);
    expect(receiptSearch.body.data.total).toBe(2);
    expect(receiptSearch.body.data.items[0].batch_no).toBe('SRCH-BATCH');

    const priceHistory = await request(app)
      .get('/api/v1/price-history')
      .query({ medicine_id: med.body.data.id, limit: 20 })
      .set(authHeaders(token));

    expect(priceHistory.status).toBe(200);
    expect(priceHistory.body.data.latest.invoice_number).toBe('INV-SRCH-002');
    expect(priceHistory.body.data.history.length).toBe(2);
    expect(priceHistory.body.data.history[0].invoice_number).toBe('INV-SRCH-002');
    expect(priceHistory.body.data.history[1].invoice_number).toBe('INV-SRCH-001');
  });
});
