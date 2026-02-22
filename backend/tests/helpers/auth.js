import request from 'supertest';

import app from '../../src/app.js';
import User from '../../src/models/User.js';
import { hashPassword } from '../../src/services/auth.service.js';

export const createAdminUser = async ({
  username = 'admin',
  password = 'admin123',
  fullName = 'Admin User',
} = {}) => {
  const passwordHash = await hashPassword(password);

  await User.create({
    fullName,
    username,
    passwordHash,
    isActive: true,
  });

  return { username, password, fullName };
};

export const loginAndGetToken = async ({ username = 'admin', password = 'admin123' } = {}) => {
  const response = await request(app).post('/api/v1/auth/login').send({ username, password });

  if (response.status !== 200 || !response.body?.data?.token) {
    throw new Error(`Failed to login test user: ${response.status}`);
  }

  return response.body.data.token;
};

export const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});
