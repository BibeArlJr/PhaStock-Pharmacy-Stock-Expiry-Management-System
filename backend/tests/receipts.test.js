import request from 'supertest';

import app from '../src/app.js';
import { authHeaders, createAdminUser, loginAndGetToken } from './helpers/auth.js';

const futureDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

describe('Receipts Integration', () => {
  test('create receipts and verify batch updates and duplicate invoice', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const supplier = await request(app)
      .post('/api/v1/suppliers')
      .set(authHeaders(token))
      .send({ name: 'Receipt Supplier', phone: '9800011112', address: 'Kathmandu' });
    const supplierId = supplier.body.data.id;

    const med1 = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'ReceiptMed1', strength: '100mg' });
    const med2 = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'ReceiptMed2', strength: '200mg' });

    const receipt1 = await request(app)
      .post('/api/v1/purchase-receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplierId,
        invoice_number: 'INV-TEST-001',
        invoice_date: '2026-02-18',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: med1.body.data.id,
            pack: '10x10',
            batch_no: 'BATCH-A',
            expiry_date: futureDate(180),
            quantity_boxes: 8,
            purchase_price: 120,
            mrp: 150,
          },
          {
            medicine_id: med2.body.data.id,
            pack: '10x5',
            batch_no: 'BATCH-B',
            expiry_date: futureDate(200),
            quantity_boxes: 5,
            purchase_price: 200,
            mrp: 260,
          },
        ],
      });

    expect(receipt1.status).toBe(201);
    expect(typeof receipt1.body.data.receipt_id).toBe('string');

    const lookupA1 = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: med1.body.data.id,
        pack: '10x10',
        batch_no: 'BATCH-A',
        expiry_date: futureDate(180),
      })
      .set(authHeaders(token));

    expect(lookupA1.status).toBe(200);
    expect(lookupA1.body.data.available_boxes).toBe(8);

    const receipt2 = await request(app)
      .post('/api/v1/purchase-receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplierId,
        invoice_number: 'INV-TEST-002',
        invoice_date: '2026-02-19',
        payment_mode: 'BANK',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: med1.body.data.id,
            pack: '10x10',
            batch_no: 'BATCH-A',
            expiry_date: futureDate(180),
            quantity_boxes: 4,
            purchase_price: 125,
            mrp: 155,
          },
        ],
      });

    expect(receipt2.status).toBe(201);

    const lookupA2 = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: med1.body.data.id,
        pack: '10x10',
        batch_no: 'BATCH-A',
        expiry_date: futureDate(180),
      })
      .set(authHeaders(token));

    expect(lookupA2.status).toBe(200);
    expect(lookupA2.body.data.available_boxes).toBe(12);

    const duplicate = await request(app)
      .post('/api/v1/purchase-receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplierId,
        invoice_number: 'INV-TEST-002',
        invoice_date: '2026-02-20',
        payment_mode: 'BANK',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: med2.body.data.id,
            pack: '10x10',
            batch_no: 'BATCH-C',
            expiry_date: futureDate(220),
            quantity_boxes: 3,
            purchase_price: 210,
            mrp: 280,
          },
        ],
      });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('DUPLICATE_INVOICE');

    const detail = await request(app)
      .get(`/api/v1/purchase-receipts/${receipt1.body.data.receipt_id}`)
      .set(authHeaders(token));

    expect(detail.status).toBe(200);
    expect(detail.body.data.items.length).toBe(2);
  });
});
