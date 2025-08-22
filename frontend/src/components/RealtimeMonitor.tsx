'use client';
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface RealtimeMonitorProps {
  token: string | null;
}

interface ConnectionStatus {
  connected: boolean;
  userId?: number;
  message?: string;
}

export function RealtimeMonitor({ token }: RealtimeMonitorProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({ connected: false });
  const [updates, setUpdates] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;

    console.log('🔌 Initializing WebSocket connection...');
    
    const socket: Socket = io('http://localhost:3001', {
      auth: {
        token: token
      },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected successfully');
      setConnectionStatus({ connected: true });
    });

    socket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected: transport close');
      setConnectionStatus({ connected: false });
    });

    socket.on('connection-status', (status: ConnectionStatus) => {
      console.log('🔌 Connection status received:', status);
      setConnectionStatus(status);
    });

    socket.on('monitoring-update', (update: string) => {
      console.log('📊 Monitoring update received:', update);
      setUpdates(prev => [update, ...prev.slice(0, 9)]); // Keep last 10 updates
    });

    socket.on('connect_error', (error: Error) => {
      console.error('🔌 WebSocket connection error:', error);
      setConnectionStatus({ connected: false });
    });

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up WebSocket connection');
      socket.disconnect();
    };
  }, [token]);

  return (
    <div className="space-y-4">
      {/* Connection Status */}
      <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
        <div className={`w-3 h-3 rounded-full ${connectionStatus.connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium">
          {connectionStatus.connected ? 'Real-time monitoring active' : 'Real-time monitoring inactive'}
        </span>
        {connectionStatus.userId && (
          <span className="text-xs text-gray-500">
            User ID: {connectionStatus.userId}
          </span>
        )}
      </div>

      {/* Latest Monitoring Updates */}
      <div className="bg-white border rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Latest Monitoring Updates</h4>
        {updates.length === 0 ? (
          <p className="text-center text-gray-500 py-4">
            Waiting for monitoring updates...
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {updates.map((update, index) => (
              <div key={index} className="text-sm text-gray-700 p-2 bg-gray-50 rounded border-l-2 border-blue-500">
                {update}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}