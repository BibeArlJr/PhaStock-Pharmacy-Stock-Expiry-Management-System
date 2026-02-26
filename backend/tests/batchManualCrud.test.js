import request from 'supertest';

import app from '../src/app.js';
import { authHeaders, createAdminUser, loginAndGetToken } from './helpers/auth.js';

const futureDate = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

describe('Manual batch CRUD and source guard', () => {
  test('manual batch can be edited/deleted and receipt-derived batch is blocked', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const supplier = await request(app)
      .post('/api/v1/suppliers')
      .set(authHeaders(token))
      .send({ name: 'Manual Supplier', phone: '9800011112', address: 'Lalitpur' });
    const supplierId = supplier.body.data.id;

    const medicine = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'ManualMed', strength: '250mg' });
    const medicineId = medicine.body.data.id;

    const receipt = await request(app)
      .post('/api/v1/receipts')
      .set(authHeaders(token))
      .send({
        supplier_id: supplierId,
        invoice_number: 'SRC-001',
        invoice_date: '2026-02-18',
        payment_mode: 'CASH',
        receipt_type: 'NORMAL_PURCHASE',
        items: [
          {
            medicine_id: medicineId,
            pack: '10x10',
            batch_no: 'SRC-BATCH',
            expiry_date: futureDate(210),
            quantity_boxes: 5,
            purchase_price: 110,
            mrp: 140,
          },
        ],
      });

    expect(receipt.status).toBe(201);
    const receiptBatchId = receipt.body.data.batch_updates[0].batch_stock_id;

    const sourceInfo = await request(app)
      .get(`/api/v1/batch-stocks/${receiptBatchId}/source`)
      .set(authHeaders(token));

    expect(sourceInfo.status).toBe(200);
    expect(sourceInfo.body.data.sourceType).toBe('RECEIPT');
    expect(sourceInfo.body.data.receiptId).toBe(receipt.body.data.receipt_id);

    const blockUpdate = await request(app)
      .put(`/api/v1/batch-stocks/${receiptBatchId}`)
      .set(authHeaders(token))
      .send({
        medicine_id: medicineId,
        pack: '10x10',
        batch_no: 'SRC-BATCH',
        expiry_date: futureDate(210),
        available_boxes: 20,
        purchase_price: 120,
        mrp: 150,
        notes: 'try edit receipt batch',
      });

    expect(blockUpdate.status).toBe(400);
    expect(blockUpdate.body.code).toBe('BATCH_EDIT_BLOCKED');

    const blockDelete = await request(app)
      .delete(`/api/v1/batch-stocks/${receiptBatchId}`)
      .set(authHeaders(token));

    expect(blockDelete.status).toBe(400);
    expect(blockDelete.body.code).toBe('BATCH_EDIT_BLOCKED');

    const manualCreate = await request(app)
      .post('/api/v1/batch-stocks/manual')
      .set(authHeaders(token))
      .send({
        medicine_id: medicineId,
        pack: '20x10',
        batch_no: 'MANUAL-1',
        expiry_date: futureDate(300),
        available_boxes: 9,
        purchase_price: 130,
        mrp: 180,
        notes: 'manual stock',
      });

    expect(manualCreate.status).toBe(201);
    const manualId = manualCreate.body.data.id;
    expect(manualCreate.body.data.source_type).toBe('MANUAL');

    const manualUpdate = await request(app)
      .put(`/api/v1/batch-stocks/${manualId}`)
      .set(authHeaders(token))
      .send({
        medicine_id: medicineId,
        pack: '20x10',
        batch_no: 'MANUAL-1A',
        expiry_date: futureDate(320),
        available_boxes: 11,
        purchase_price: 135,
        mrp: 190,
        notes: 'updated manual stock',
      });

    expect(manualUpdate.status).toBe(200);
    expect(manualUpdate.body.data.batch_no).toBe('MANUAL-1A');
    expect(manualUpdate.body.data.available_boxes).toBe(11);

    const manualDelete = await request(app)
      .delete(`/api/v1/batch-stocks/${manualId}`)
      .set(authHeaders(token));

    expect(manualDelete.status).toBe(200);
  });
});
