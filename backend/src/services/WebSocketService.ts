// backend/src/services/WebSocketService.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

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

export class WebSocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<number, Set<string>> = new Map();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    this.setupAuthentication();
    this.setupConnectionHandlers();
  }

  private setupAuthentication(): void {
    this.io.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        socket.data.userId = decoded.userId;
        socket.data.email = decoded.email;
        next();
      } catch (error) {
        return next(new Error('Authentication error: Invalid token'));
      }
    });
  }

  private setupConnectionHandlers(): void {
    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      console.log(`🔌 User ${userId} connected via WebSocket`);

      // Track user connection
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)!.add(socket.id);

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
      socket.on('subscribe-website', (websiteId: number) => {
        socket.join(`website-${websiteId}`);
        console.log(`📡 User ${userId} subscribed to website ${websiteId} updates`);
      });

      socket.on('unsubscribe-website', (websiteId: number) => {
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
  public broadcastMonitoringUpdate(update: MonitoringUpdate, userId: number): void {
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
  public broadcastAlert(userId: number, alert: {
    websiteId: number;
    websiteName: string;
    alertType: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }): void {
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
  public broadcastServiceStatus(status: {
    isRunning: boolean;
    activeWebsites: number;
    uptime: number;
  }): void {
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
  public getConnectedUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: number): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId)!.size > 0;
  }

  /**
   * Get WebSocket server instance for external use
   */
  public getServer(): SocketIOServer {
    return this.io;
  }
}