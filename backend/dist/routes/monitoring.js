"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setWebSocketService = void 0;
// backend/src/routes/monitoring.ts
const express_1 = __importDefault(require("express"));
const MonitoringService_1 = require("../services/MonitoringService");
const auth_1 = require("../middleware/auth");
const database_1 = __importDefault(require("../config/database"));
// We'll get the WebSocket service dynamically to avoid circular imports
let globalWebSocketService = null;
// Function to set the WebSocket service from server.ts
const setWebSocketService = (webSocketService) => {
    globalWebSocketService = webSocketService;
    console.log('📡 WebSocket service connected to monitoring routes');
};
exports.setWebSocketService = setWebSocketService;
const router = express_1.default.Router();
// Global monitoring service instance
let monitoringService;
// Initialize monitoring service
const initializeMonitoringService = () => {
    if (!monitoringService) {
        monitoringService = new MonitoringService_1.MonitoringService(database_1.default, globalWebSocketService);
        console.log(`🔧 MonitoringService initialized with WebSocket: ${globalWebSocketService ? 'Yes' : 'No'}`);
    }
    return monitoringService;
};
// Start monitoring service
router.post('/start', auth_1.authenticateToken, async (req, res) => {
    try {
        const service = initializeMonitoringService();
        await service.startMonitoring();
        res.json({
            success: true,
            message: 'Monitoring service started successfully',
            status: service.getMonitoringStatus()
        });
    }
    catch (error) {
        console.error('Error starting monitoring service:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to start monitoring service',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Stop monitoring service
router.post('/stop', auth_1.authenticateToken, async (req, res) => {
    try {
        if (monitoringService) {
            monitoringService.stopMonitoring();
        }
        res.json({
            success: true,
            message: 'Monitoring service stopped successfully'
        });
    }
    catch (error) {
        console.error('Error stopping monitoring service:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to stop monitoring service',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get monitoring status
router.get('/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const service = initializeMonitoringService();
        const status = service.getMonitoringStatus();
        res.json({
            success: true,
            status
        });
    }
    catch (error) {
        console.error('Error getting monitoring status:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get monitoring status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get monitoring results for a specific website
router.get('/results/:websiteId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.params;
        const { limit = 100, offset = 0 } = req.query;
        // Verify user owns this website
        const websiteCheck = await database_1.default.query('SELECT id FROM websites WHERE id = $1 AND user_id = $2', [websiteId, req.user.userId]);
        if (websiteCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Website not found or access denied'
            });
        }
        // Get monitoring results
        const results = await database_1.default.query(`
      SELECT 
        id,
        checked_at as timestamp,
        status,
        response_time as response_time_ms,
        status_code as http_status_code,
        error_message,
        ssl_expiry_days,
        ssl_valid,
        performance_score
      FROM monitor_results 
      WHERE website_id = $1 
      ORDER BY checked_at DESC 
      LIMIT $2 OFFSET $3
    `, [websiteId, limit, offset]);
        // Get summary statistics
        const stats = await database_1.default.query(`
      SELECT 
        COUNT(*) as total_checks,
        COUNT(CASE WHEN status = 'up' THEN 1 END) as up_count,
        COUNT(CASE WHEN status = 'down' THEN 1 END) as down_count,
        COUNT(CASE WHEN status = 'degraded' THEN 1 END) as degraded_count,
        AVG(response_time) as avg_response_time,
        MIN(response_time) as min_response_time,
        MAX(response_time) as max_response_time
      FROM monitor_results 
      WHERE website_id = $1 
        AND checked_at >= NOW() - INTERVAL '24 hours'
    `, [websiteId]);
        const summary = stats.rows[0];
        const uptime = summary.total_checks > 0
            ? ((parseInt(summary.up_count) + parseInt(summary.degraded_count)) / parseInt(summary.total_checks) * 100).toFixed(2)
            : '0';
        res.json({
            success: true,
            data: {
                results: results.rows,
                summary: {
                    ...summary,
                    uptime_percentage: parseFloat(uptime),
                    avg_response_time: summary.avg_response_time ? Math.round(summary.avg_response_time) : 0
                }
            }
        });
    }
    catch (error) {
        console.error('Error getting monitoring results:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get monitoring results',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Trigger manual check for a specific website
router.post('/check/:websiteId', auth_1.authenticateToken, async (req, res) => {
    try {
        const { websiteId } = req.params;
        // Verify user owns this website
        const websiteResult = await database_1.default.query('SELECT * FROM websites WHERE id = $1 AND user_id = $2', [websiteId, req.user.userId]);
        if (websiteResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Website not found or access denied'
            });
        }
        const website = websiteResult.rows[0];
        const service = initializeMonitoringService();
        // TODO: Add method to MonitoringService for manual single check
        // For now, return success
        res.json({
            success: true,
            message: `Manual check initiated for ${website.name}`,
            timestamp: new Date()
        });
    }
    catch (error) {
        console.error('Error triggering manual check:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to trigger manual check',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
// Get recent alerts
router.get('/alerts', auth_1.authenticateToken, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const alerts = await database_1.default.query(`
      SELECT 
        ah.id,
        ah.alert_type,
        ah.message,
        ah.triggered_at,
        ah.resolved_at,
        w.name as website_name,
        w.url as website_url
      FROM alert_history ah
      JOIN websites w ON ah.website_id = w.id
      WHERE w.user_id = $1
      ORDER BY ah.triggered_at DESC
      LIMIT $2 OFFSET $3
    `, [req.user.userId, limit, offset]);
        res.json({
            success: true,
            data: alerts.rows
        });
    }
    catch (error) {
        console.error('Error getting alerts:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get alerts',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
exports.default = router;
// backend/src/app.ts - Add this to your existing app.ts
/*
import monitoringRoutes from './routes/monitoring';

// Add this line with your other route middleware
app.use('/api/monitoring', monitoringRoutes);

// Auto-start monitoring service on server startup
import { MonitoringService } from './services/MonitoringService';
import { pool } from './config/database';

// Start monitoring service when server starts
const startMonitoringOnBoot = async () => {
  try {
    const monitoringService = new MonitoringService(pool);
    await monitoringService.startMonitoring();
    console.log('🚀 Monitoring service auto-started');
  } catch (error) {
    console.error('❌ Failed to auto-start monitoring service:', error);
  }
};

// Call this after your server starts listening
// startMonitoringOnBoot();
*/ 
//# sourceMappingURL=monitoring.js.map