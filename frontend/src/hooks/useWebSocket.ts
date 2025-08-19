// frontend/src/hooks/useWebSocket.ts
import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

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

export interface WebSocketAlert {
  websiteId: number;
  websiteName: string;
  alertType: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ServiceStatus {
  isRunning: boolean;
  activeWebsites: number;
  uptime: number;
}

interface UseWebSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  connectionError: string | null;
  latestUpdates: MonitoringUpdate[];
  alerts: WebSocketAlert[];
  serviceStatus: ServiceStatus | null;
  subscribeToWebsite: (websiteId: number) => void;
  unsubscribeFromWebsite: (websiteId: number) => void;
  clearAlerts: () => void;
}

export const useWebSocket = (token: string | null): UseWebSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [latestUpdates, setLatestUpdates] = useState<MonitoringUpdate[]>([]);
  const [alerts, setAlerts] = useState<WebSocketAlert[]>([]);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);

  useEffect(() => {
    if (!token) {
      console.log('🔌 No token available, skipping WebSocket connection');
      return;
    }

    console.log('🔌 Initializing WebSocket connection...');
    
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling'],
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connected successfully');
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Connection status confirmation
    newSocket.on('connection-status', (data) => {
      console.log('🔌 Connection status received:', data);
    });

    // Monitoring update handlers
    newSocket.on('monitoring-update', (data) => {
      console.log('📊 Monitoring update received:', data);
      
      const update: MonitoringUpdate = {
        ...data.data,
        timestamp: new Date(data.data.timestamp)
      };

      setLatestUpdates(prev => {
        // Keep only the last 50 updates and add the new one
        const updated = [update, ...prev.slice(0, 49)];
        return updated;
      });
    });

    // Website-specific status updates
    newSocket.on('website-status-update', (data) => {
      console.log('🌐 Website status update:', data);
      
      const update: MonitoringUpdate = {
        websiteId: data.websiteId,
        websiteName: `Website ${data.websiteId}`, // Will be populated by API call
        status: data.status,
        responseTime: data.responseTime,
        timestamp: new Date(data.timestamp),
        sslInfo: data.sslInfo,
        performanceScore: data.performanceScore
      };

      setLatestUpdates(prev => [update, ...prev.slice(0, 49)]);
    });

    // Alert handlers
    newSocket.on('alert', (data) => {
      console.log('🚨 Alert received:', data);
      
      const alert: WebSocketAlert = {
        ...data.data,
        timestamp: new Date(data.timestamp)
      };

      setAlerts(prev => [alert, ...prev.slice(0, 19)]); // Keep last 20 alerts
    });

    // Service status updates
    newSocket.on('service-status', (data) => {
      console.log('📊 Service status update:', data);
      setServiceStatus(data.data);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      newSocket.disconnect();
    };
  }, [token]);

  // Subscribe to specific website updates
  const subscribeToWebsite = useCallback((websiteId: number) => {
    if (socket && isConnected) {
      console.log(`📡 Subscribing to website ${websiteId} updates`);
      socket.emit('subscribe-website', websiteId);
    }
  }, [socket, isConnected]);

  // Unsubscribe from website updates
  const unsubscribeFromWebsite = useCallback((websiteId: number) => {
    if (socket && isConnected) {
      console.log(`📡 Unsubscribing from website ${websiteId} updates`);
      socket.emit('unsubscribe-website', websiteId);
    }
  }, [socket, isConnected]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  return {
    socket,
    isConnected,
    connectionError,
    latestUpdates,
    alerts,
    serviceStatus,
    subscribeToWebsite,
    unsubscribeFromWebsite,
    clearAlerts
  };
};