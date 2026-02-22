import request from 'supertest';

import app from '../src/app.js';
import { authHeaders, createAdminUser, loginAndGetToken } from './helpers/auth.js';

describe('Auth Integration', () => {
  test('login success returns token', async () => {
    await createAdminUser();

    const response = await request(app).post('/api/v1/auth/login').send({
      username: 'admin',
      password: 'admin123',
    });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(typeof response.body.data.token).toBe('string');
    expect(response.body.data.user.username).toBe('admin');
  });

  test('login wrong password returns 400 INVALID_CREDENTIALS', async () => {
    await createAdminUser();

    const response = await request(app).post('/api/v1/auth/login').send({
      username: 'admin',
      password: 'wrong-pass',
    });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_CREDENTIALS');
  });

  test('protected endpoint without token returns 401', async () => {
    await createAdminUser();
    const token = await loginAndGetToken();

    const okResponse = await request(app)
      .get('/api/v1/settings')
      .set(authHeaders(token));
    expect(okResponse.status).toBe(200);

    const unauthorized = await request(app).get('/api/v1/settings');
    expect(unauthorized.status).toBe(401);
    expect(unauthorized.body.code).toBe('UNAUTHORIZED');
  });
});
