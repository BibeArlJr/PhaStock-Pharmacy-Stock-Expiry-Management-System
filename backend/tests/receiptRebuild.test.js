import request from 'supertest';

import app from '../src/app.js';
import { authHeaders, createAdminUser, loginAndGetToken } from './helpers/auth.js';

const futureDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

describe('Receipt rebuild integrity', () => {
  test('update receipt rebuilds stock and delete receipt rebuilds stock', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const supplier = await request(app)
      .post('/api/v1/suppliers')
      .set(authHeaders(token))
      .send({ name: 'Rebuild Supplier', phone: '9800011112', address: 'Kathmandu' });
    const supplierId = supplier.body.data.id;

    const medicine = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'RebuildMed', strength: '500mg' });
    const medicineId = medicine.body.data.id;

    const receipt1 = await request(app)
      .post('/api/v1/receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplierId,
        invoice_number: 'RB-001',
        invoice_date: '2026-02-18',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: medicineId,
            pack: '10x10',
            batch_no: 'RBATCH-A',
            expiry_date: futureDate(200),
            quantity_boxes: 10,
            purchase_price: 100,
            mrp: 120,
          },
        ],
      });

    expect(receipt1.status).toBe(201);

    const receipt2 = await request(app)
      .post('/api/v1/receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplierId,
        invoice_number: 'RB-002',
        invoice_date: '2026-02-19',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: medicineId,
            pack: '10x10',
            batch_no: 'RBATCH-A',
            expiry_date: futureDate(200),
            quantity_boxes: 4,
            purchase_price: 101,
            mrp: 121,
          },
        ],
      });

    expect(receipt2.status).toBe(201);

    const lookupBefore = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: medicineId,
        pack: '10x10',
        batch_no: 'RBATCH-A',
        expiry_date: futureDate(200),
      })
      .set(authHeaders(token));

    expect(lookupBefore.status).toBe(200);
    expect(lookupBefore.body.data.available_boxes).toBe(14);

    const updateReceipt = await request(app)
      .put(`/api/v1/receipts/${receipt1.body.data.receipt_id}`)
      .set(authHeaders(token))
      .send({
        supplier_id: supplierId,
        invoice_number: 'RB-001',
        invoice_date: '2026-02-18',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: medicineId,
            pack: '10x10',
            batch_no: 'RBATCH-A',
            expiry_date: futureDate(200),
            quantity_boxes: 6,
            purchase_price: 99,
            mrp: 119,
          },
        ],
      });

    expect(updateReceipt.status).toBe(200);

    const lookupAfterUpdate = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: medicineId,
        pack: '10x10',
        batch_no: 'RBATCH-A',
        expiry_date: futureDate(200),
      })
      .set(authHeaders(token));

    expect(lookupAfterUpdate.status).toBe(200);
    expect(lookupAfterUpdate.body.data.available_boxes).toBe(10);

    const deleteReceipt = await request(app)
      .delete(`/api/v1/receipts/${receipt2.body.data.receipt_id}`)
      .set(authHeaders(token));

    expect(deleteReceipt.status).toBe(200);

    const lookupAfterDelete = await request(app)
      .get('/api/v1/batches/lookup')
      .query({
        medicine_id: medicineId,
        pack: '10x10',
        batch_no: 'RBATCH-A',
        expiry_date: futureDate(200),
      })
      .set(authHeaders(token));

    expect(lookupAfterDelete.status).toBe(200);
    expect(lookupAfterDelete.body.data.available_boxes).toBe(6);
  });
});
