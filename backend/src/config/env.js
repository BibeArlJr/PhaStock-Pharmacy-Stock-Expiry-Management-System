import dotenv from 'dotenv';

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

const resolvedMongoUri = (() => {
  if (process.env.NODE_ENV !== 'test') {
    return process.env.MONGO_URI;
  }

  if (process.env.MONGO_URI_TEST) {
    return process.env.MONGO_URI_TEST;
  }

  return forceDbName(process.env.MONGO_URI, 'phastock_test');
})();

export const PORT = process.env.PORT || 5000;
export const MONGO_URI = resolvedMongoUri;
export const JWT_SECRET = process.env.JWT_SECRET || '';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
