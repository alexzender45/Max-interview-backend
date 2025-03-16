import mongoose from 'mongoose';
import { createClient } from 'redis';
import 'dotenv/config';

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not defined');
    }

    await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 30000,
        ssl: true,
        authMechanism: 'DEFAULT',
        authSource: 'admin'
    });
    
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  }
};

const redisClient = createClient({
  url: process.env.REDIS_URI || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => Math.min(retries * 100, 5000)
  }
});

redisClient.on('error', (err) => console.error('❌ Redis Client Error:', err));
redisClient.on('connect', () => console.log('✅ Redis Client Connected'));

(async () => {
  try {
    await redisClient.connect();
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
    process.exit(1);
  }
})();

export { connectDB, redisClient };