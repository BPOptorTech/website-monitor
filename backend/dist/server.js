"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webSocketService = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const http_1 = require("http");
require("./config/database"); // This will test the DB connection
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const websites_1 = __importDefault(require("./routes/websites"));
const monitoring_1 = __importDefault(require("./routes/monitoring"));
const MonitoringEngine_1 = require("./monitoring/MonitoringEngine");
// Import WebSocket service
const WebSocketService_1 = require("./services/WebSocketService");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.API_PORT || 3001;
// Create HTTP server
const server = (0, http_1.createServer)(app);
// Initialize WebSocket service
const webSocketService = new WebSocketService_1.WebSocketService(server);
exports.webSocketService = webSocketService;
// Security middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});
app.use('/api/', limiter);
// Logging and parsing
app.use((0, morgan_1.default)('combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
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
app.use('/api/auth', auth_1.default);
app.use('/api/websites', websites_1.default);
app.use('/api/monitoring', monitoring_1.default);
// Connect WebSocket service to monitoring routes
const monitoring_2 = require("./routes/monitoring");
(0, monitoring_2.setWebSocketService)(webSocketService);
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
MonitoringEngine_1.monitoringEngine.start().catch(console.error);
// Start server
server.listen(PORT, () => {
    console.log(`🚀 API Server running on port ${PORT}`);
    console.log(`🔌 WebSocket server ready for real-time updates`);
});
//# sourceMappingURL=server.js.map