const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

dotenv.config({ path: envFile });
dotenv.config();

const forceDbName = (uri, dbName) => {
  if (!uri) {
    return uri;
  }

  try {
    const parsed = new URL(uri);
    parsed.pathname = `/${dbName}`;
    return parsed.toString();
  } catch {
    const [base, query = ''] = uri.split('?');
    const index = base.lastIndexOf('/');
    const prefix = index >= 0 ? base.slice(0, index) : base;
    const rebuilt = `${prefix}/${dbName}`;
    return query ? `${rebuilt}?${query}` : rebuilt;
  }
};
const NODE_ENV = process.env.NODE_ENV || 'development';

const resolvedMongoUri = (() => {
  if (NODE_ENV !== 'test') {
    return process.env.MONGO_URI;
  }

  if (process.env.MONGO_URI_TEST) {
    return process.env.MONGO_URI_TEST;
  }

  return forceDbName(process.env.MONGO_URI, 'phastock_test');
})();

const rawCorsOrigin =
  process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000';
const CORS_ORIGIN_ARRAY = rawCorsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const PORT = process.env.PORT || 5000;
const MONGO_URI = resolvedMongoUri;
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false') === 'true';
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'bibekaryal717@gmail.com';
const CLIENT_URL = process.env.CLIENT_URL || '';

module.exports = {
  NODE_ENV,
  CORS_ORIGIN_ARRAY,
  PORT,
  MONGO_URI,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  FRONTEND_URL,
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM,
  CLIENT_URL,
};

console.log('[env.js] MONGO_URI loaded as:', module.exports.MONGO_URI || 'NOT SET')

/*
FULL FILE CONTENT (for debugging review only — do not edit):

const dotenv = require('dotenv');
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';

dotenv.config({ path: envFile });
dotenv.config();

const forceDbName = (uri, dbName) => {
  if (!uri) {
    return uri;
  }

  try {
    const parsed = new URL(uri);
    parsed.pathname = `/${dbName}`;
    return parsed.toString();
  } catch {
    const [base, query = ''] = uri.split('?');
    const index = base.lastIndexOf('/');
    const prefix = index >= 0 ? base.slice(0, index) : base;
    const rebuilt = `${prefix}/${dbName}`;
    return query ? `${rebuilt}?${query}` : rebuilt;
  }
};
const NODE_ENV = process.env.NODE_ENV || 'development';

const resolvedMongoUri = (() => {
  if (NODE_ENV !== 'test') {
    return process.env.MONGO_URI;
  }

  if (process.env.MONGO_URI_TEST) {
    return process.env.MONGO_URI_TEST;
  }

  return forceDbName(process.env.MONGO_URI, 'phastock_test');
})();

const rawCorsOrigin =
  process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000';
const CORS_ORIGIN_ARRAY = rawCorsOrigin
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const PORT = process.env.PORT || 5000;
const MONGO_URI = resolvedMongoUri;
const JWT_SECRET = process.env.JWT_SECRET || '';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = String(process.env.SMTP_SECURE || 'false') === 'true';
const SMTP_USER = process.env.SMTP_USER || 'bibekaryal717@gmail.com';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || 'bibekaryal717@gmail.com';

module.exports = { NODE_ENV, CORS_ORIGIN_ARRAY, PORT, MONGO_URI, JWT_SECRET, JWT_EXPIRES_IN, FRONTEND_URL, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_FROM };

*/
