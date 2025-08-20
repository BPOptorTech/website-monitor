import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
export interface MonitoringUpdate {
    websiteId: number;
    websiteName: string;
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
    timestamp: Date;
    sslInfo?: {
        valid: boolean;
        daysUntilExpiry: number;
        grade?: string;
    };
    performanceScore?: number;
}
export declare class WebSocketService {
    private io;
    private connectedUsers;
    constructor(server: HTTPServer);
    private setupAuthentication;
    private setupConnectionHandlers;
    /**
     * Broadcast monitoring update to users who own the website
     */
    broadcastMonitoringUpdate(update: MonitoringUpdate, userId: number): void;
    /**
     * Broadcast alert to specific user
     */
    broadcastAlert(userId: number, alert: {
        websiteId: number;
        websiteName: string;
        alertType: string;
        message: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
    }): void;
    /**
     * Send monitoring service status update
     */
    broadcastServiceStatus(status: {
        isRunning: boolean;
        activeWebsites: number;
        uptime: number;
    }): void;
    /**
     * Get connected users count
     */
    getConnectedUsersCount(): number;
    /**
     * Check if user is connected
     */
    isUserConnected(userId: number): boolean;
    /**
     * Get WebSocket server instance for external use
     */
    getServer(): SocketIOServer;
}
//# sourceMappingURL=WebSocketService.d.ts.map