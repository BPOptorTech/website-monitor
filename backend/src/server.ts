import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import './config/database'; // This will test the DB connection

// Import routes
import authRoutes from './routes/auth';
import websiteRoutes from './routes/websites';
import { monitoringEngine } from './monitoring/MonitoringEngine';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});
app.use('/api/', limiter);

// Logging and parsing
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/websites', websiteRoutes);

// Default API response
app.use('/api', (req, res) => {
  res.json({ 
    message: 'Website Monitor API v1.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      }
    }
  });
});

monitoringEngine.start().catch(console.error);

app.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
});
