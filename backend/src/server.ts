import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import './config/database'; // This will test the DB connection

// Import routes
import authRoutes from './routes/auth';
import websiteRoutes from './routes/websites';
import monitoringRoutes from './routes/monitoring';
import { monitoringEngine } from './monitoring/MonitoringEngine';

// Import WebSocket service
import { WebSocketService } from './services/WebSocketService';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Export WebSocket service for use in other modules
export { webSocketService };

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
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    websocket: {
      connected_users: webSocketService.getConnectedUsersCount()
    }
  });
});

// API routes
// Health check endpoint for Docker
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});
app.use('/api/auth', authRoutes);
app.use('/api/websites', websiteRoutes);
app.use('/api/monitoring', monitoringRoutes);

// Connect WebSocket service to monitoring routes
import { setWebSocketService } from './routes/monitoring';
setWebSocketService(webSocketService);

// Default API response
app.use('/api', (req, res) => {
  res.json({
    message: 'Website Monitor API v1.0',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      monitoring: {
        start: 'POST /api/monitoring/start',
        status: 'GET /api/monitoring/status',
        results: 'GET /api/monitoring/results/:websiteId'
      }
    },
    websocket: {
      endpoint: '/socket.io/',
      connected_users: webSocketService.getConnectedUsersCount()
    }
  });
});

// Start monitoring engine
monitoringEngine.start().catch(console.error);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`🔌 WebSocket server ready for real-time updates`);
});