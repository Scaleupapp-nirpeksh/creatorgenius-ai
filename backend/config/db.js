// backend/config/db.js
const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    // Add connection pooling settings
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Connection pool settings
      maxPoolSize: 50, // Max number of connections in the pool
      minPoolSize: 5,  // Min number of connections in the pool
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      serverSelectionTimeoutMS: 5000, // Server selection timeout
      heartbeatFrequencyMS: 10000, // Heartbeat frequency
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    // Add connection error handlers
    mongoose.connection.on('error', err => {
      console.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });
    
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;