import cors from 'cors';
import express from 'express';
import morgan from 'morgan';

import { CORS_ORIGIN_ARRAY, NODE_ENV } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import routes from './routes/index.js';

const app = express();
app.set('etag', false);

const allowAllOrigins = CORS_ORIGIN_ARRAY.includes('*');

const corsOptions = {
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (allowAllOrigins) {
      if (NODE_ENV === 'development') {
        return callback(null, true);
      }

      return callback(null, true);
    }

    if (CORS_ORIGIN_ARRAY.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
};

app.set('trust proxy', 1);

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(morgan('dev'));
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

app.get('/health', (req, res) => {
  res.status(200).json({ ok: true });
});

app.use('/api/v1', routes);

app.use(errorHandler);

export default app;
