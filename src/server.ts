import http from 'http';
import mongoose from 'mongoose';
import app from './app';
import WebSocketController from './controllers/websocket.controller';
import { redisClient } from './config/db';
import logger from './utils/logger'; // Import the logger

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Initialize WebSocket Server
new WebSocketController(server);

const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  
  try {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
    
    await redisClient.quit();
    logger.info('Redis connection closed');
    
    // Close HTTP server
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    
    // Force close after 5 seconds
    setTimeout(() => {
      logger.error('Force shutdown due to timeout');
      process.exit(1);
    }, 5000);
    
  } catch (err) {
    logger.error('Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`); // Log server startup
});
