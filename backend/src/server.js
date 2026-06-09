const app = require('./app.js');
const { connectDB } = require('./config/db.js');
const { PORT } = require('./config/env.js');
const startServer = async () => {
  try {
    await connectDB();

    const { SMTP_USER, SMTP_PASS, CLIENT_URL, MONGO_URI } = require('./config/env')
    console.log('=== ENV CHECK ===')
    console.log('SMTP_USER:', SMTP_USER || 'NOT SET')
    console.log('SMTP_PASS:', SMTP_PASS ? `SET (length: ${SMTP_PASS.length})` : 'NOT SET')
    console.log('CLIENT_URL:', CLIENT_URL || 'NOT SET')
    console.log('MONGO_URI DB:', MONGO_URI ? MONGO_URI.split('/').pop().split('?')[0] : 'NOT SET')
    console.log('=================')

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
