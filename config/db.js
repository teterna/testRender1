const mongoose = require('mongoose');

/**
 * Establishes a connection to MongoDB using the URI defined in environment
 * variables. Exits the process on failure — there's no point running the
 * server without a database.
 */
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[DB] MongoDB connected successfully');
  } catch (err) {
    console.error('[DB] Connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;
