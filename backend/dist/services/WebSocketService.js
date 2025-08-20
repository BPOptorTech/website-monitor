"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketService = void 0;
// backend/src/services/WebSocketService.ts
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class WebSocketService {
    io;
    connectedUsers = new Map();
    constructor(server) {
        this.io = new socket_io_1.Server(server, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:3000',
                methods: ['GET', 'POST'],
                credentials: true
            }
        });
        this.setupAuthentication();
        this.setupConnectionHandlers();
    }
    setupAuthentication() {
        this.io.use((socket, next) => {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }
            try {
                const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
                socket.data.userId = decoded.userId;
                socket.data.email = decoded.email;
                next();
            }
            catch (error) {
                return next(new Error('Authentication error: Invalid token'));
            }
        });
    }
    setupConnectionHandlers() {
        this.io.on('connection', (socket) => {
            const userId = socket.data.userId;
            console.log(`🔌 User ${userId} connected via WebSocket`);
            // Track user connection
            if (!this.connectedUsers.has(userId)) {
                this.connectedUsers.set(userId, new Set());
            }
            this.connectedUsers.get(userId).add(socket.id);
            // Handle user joining their personal room for targeted updates
            socket.join(`user-${userId}`);
            // Handle disconnection
            socket.on('disconnect', () => {
                console.log(`🔌 User ${userId} disconnected`);
                const userSockets = this.connectedUsers.get(userId);
                if (userSockets) {
                    userSockets.delete(socket.id);
                    if (userSockets.size === 0) {
                        this.connectedUsers.delete(userId);
                    }
                }
            });
            // Handle client requesting website status
            socket.on('subscribe-website', (websiteId) => {
                socket.join(`website-${websiteId}`);
                console.log(`📡 User ${userId} subscribed to website ${websiteId} updates`);
            });
            socket.on('unsubscribe-website', (websiteId) => {
                socket.leave(`website-${websiteId}`);
                console.log(`📡 User ${userId} unsubscribed from website ${websiteId} updates`);
            });
            // Send welcome message with connection status
            socket.emit('connection-status', {
                connected: true,
                userId: userId,
                message: 'Real-time monitoring connected'
            });
        });
    }
    /**
     * Broadcast monitoring update to users who own the website
     */
    broadcastMonitoringUpdate(update, userId) {
        console.log(`📡 Broadcasting update for website ${update.websiteId} to user ${userId}`);
        // Send to user's personal room
        this.io.to(`user-${userId}`).emit('monitoring-update', {
            type: 'website-check',
            data: update,
            timestamp: new Date()
        });
        // Also send to anyone specifically subscribed to this website
        this.io.to(`website-${update.websiteId}`).emit('website-status-update', {
            websiteId: update.websiteId,
            status: update.status,
            responseTime: update.responseTime,
            timestamp: update.timestamp,
            sslInfo: update.sslInfo,
            performanceScore: update.performanceScore
        });
    }
    /**
     * Broadcast alert to specific user
     */
    broadcastAlert(userId, alert) {
        console.log(`🚨 Broadcasting alert to user ${userId}: ${alert.message}`);
        this.io.to(`user-${userId}`).emit('alert', {
            type: 'monitoring-alert',
            data: alert,
            timestamp: new Date()
        });
    }
    /**
     * Send monitoring service status update
     */
    broadcastServiceStatus(status) {
        console.log(`📊 Broadcasting service status: ${status.activeWebsites} active websites`);
        this.io.emit('service-status', {
            type: 'service-update',
            data: status,
            timestamp: new Date()
        });
    }
    /**
     * Get connected users count
     */
    getConnectedUsersCount() {
        return this.connectedUsers.size;
    }
    /**
     * Check if user is connected
     */
    isUserConnected(userId) {
        return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
    }
    /**
     * Get WebSocket server instance for external use
     */
    getServer() {
        return this.io;
    }
}
exports.WebSocketService = WebSocketService;
//# sourceMappingURL=WebSocketService.js.map