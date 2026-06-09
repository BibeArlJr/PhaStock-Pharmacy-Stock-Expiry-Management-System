const mongoose = require('mongoose');
const { MONGO_URI } = require('./env.js');
const connectDB = async () => {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is not defined in environment variables.');
  }

  console.log('[db.js] MONGO_URI being used to connect:', MONGO_URI)
  console.log('[db.js] Parsed DB name from URI:', MONGO_URI ? MONGO_URI.split('/').pop().split('?')[0] : 'EMPTY')

  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected successfully.');
};

module.exports = { connectDB };
