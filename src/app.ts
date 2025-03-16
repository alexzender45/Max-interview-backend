import express from 'express';
import http from 'http'; // Import http module
import { connectDB } from './config/db';
import documentRoutes from './routes/document.route';
import authRoutes from './routes/auth.route';
import { notFound, errorHandler } from './middleware/error';
import { Request, Response, NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import swaggerJSDoc from 'swagger-jsdoc';
import options from './config/swagger';

const app = express();

const specs = swaggerJSDoc(options);
app.use('/api-docs', 
  swaggerUi.serve,
  swaggerUi.setup(specs, {
    customSiteTitle: 'Editor API Docs',
    explorer: true
  })
);

connectDB();
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/notes', documentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;