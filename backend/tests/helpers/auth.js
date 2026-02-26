import request from 'supertest';

import app from '../../src/app.js';
import Pharmacy from '../../src/models/Pharmacy.js';
import User from '../../src/models/User.js';
import { hashPassword } from '../../src/services/auth.service.js';

export const createAdminUser = async ({
  email = 'admin@example.com',
  phone = '+15550000001',
  password = 'admin123',
  fullName = 'Admin User',
  pharmacyName = 'Test Pharmacy',
} = {}) => {
  const passwordHash = await hashPassword(password);

  const pharmacy = await Pharmacy.create({
    name: pharmacyName,
    isActive: true,
  });

  await User.create({
    pharmacyId: pharmacy._id,
    fullName,
    email: email.toLowerCase(),
    phone,
    emailVerified: true,
    passwordHash,
    isActive: true,
  });

  return { email, phone, password, fullName, pharmacyId: pharmacy._id.toString() };
};

export const loginAndGetToken = async ({ identifier = 'admin@example.com', password = 'admin123' } = {}) => {
  const response = await request(app).post('/api/v1/auth/login').send({ identifier, password });

  if (response.status !== 200 || !response.body?.data?.token) {
    throw new Error(`Failed to login test user: ${response.status}`);
  }

  return response.body.data.token;
};

export const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
});
