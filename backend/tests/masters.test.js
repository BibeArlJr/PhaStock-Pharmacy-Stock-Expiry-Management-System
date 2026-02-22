import request from 'supertest';

import app from '../src/app.js';
import { authHeaders, createAdminUser, loginAndGetToken } from './helpers/auth.js';

describe('Masters Integration', () => {
  test('create medicine -> list -> update', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const createRes = await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'TestMed', strength: '100mg', category: 'Test' });

    expect(createRes.status).toBe(201);
    const medicineId = createRes.body.data.id;

    const listRes = await request(app)
      .get('/api/v1/medicines?page=1&limit=20&q=TestMed')
      .set(authHeaders(token));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.page).toBe(1);
    expect(listRes.body.data.limit).toBe(20);
    expect(listRes.body.data.items.length).toBeGreaterThanOrEqual(1);

    const updateRes = await request(app)
      .patch(`/api/v1/medicines/${medicineId}`)
      .set(authHeaders(token))
      .send({ category: 'Updated' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.category).toBe('Updated');
  });

  test('create supplier -> list -> update', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const createRes = await request(app)
      .post('/api/v1/suppliers')
      .set(authHeaders(token))
      .send({ name: 'Supplier A', phone: '9800011111', address: 'Kathmandu' });

    expect(createRes.status).toBe(201);
    const supplierId = createRes.body.data.id;

    const listRes = await request(app)
      .get('/api/v1/suppliers?page=1&limit=20&q=Supplier')
      .set(authHeaders(token));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.page).toBe(1);
    expect(listRes.body.data.limit).toBe(20);
    expect(listRes.body.data.items.length).toBeGreaterThanOrEqual(1);

    const updateRes = await request(app)
      .patch(`/api/v1/suppliers/${supplierId}`)
      .set(authHeaders(token))
      .send({ address: 'Pokhara' });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.address).toBe('Pokhara');
  });

  test('list supports pagination and q search', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'Panadol', strength: '500mg' });

    await request(app)
      .post('/api/v1/medicines')
      .set(authHeaders(token))
      .send({ name: 'Pantocid', strength: '40mg' });

    const listRes = await request(app)
      .get('/api/v1/medicines?page=1&limit=1&q=Pan')
      .set(authHeaders(token));

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.page).toBe(1);
    expect(listRes.body.data.limit).toBe(1);
    expect(listRes.body.data.total).toBeGreaterThanOrEqual(2);
    expect(listRes.body.data.items.length).toBe(1);
  });
});
