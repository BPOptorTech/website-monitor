// frontend/src/components/RealtimeMonitor.tsx
import React, { useEffect } from 'react';
import { useWebSocket, MonitoringUpdate } from '../hooks/useWebSocket';

interface RealtimeMonitorProps {
  token: string | null;
  websiteId?: number;
  className?: string;
}

export const RealtimeMonitor: React.FC<RealtimeMonitorProps> = ({ 
  token, 
  websiteId, 
  className = '' 
}) => {
  const {
    isConnected,
    connectionError,
    latestUpdates,
    alerts,
    serviceStatus,
    subscribeToWebsite,
    unsubscribeFromWebsite,
    clearAlerts
  } = useWebSocket(token);

  // Subscribe to website updates when component mounts
  useEffect(() => {
    if (websiteId && isConnected) {
      subscribeToWebsite(websiteId);
      return () => {
        unsubscribeFromWebsite(websiteId);
      };
    }
  }, [websiteId, isConnected, subscribeToWebsite, unsubscribeFromWebsite]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'up': return 'text-green-600 bg-green-100';
      case 'down': return 'text-red-600 bg-red-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAlertSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-200 border-red-300';
      case 'high': return 'text-red-700 bg-red-100 border-red-200';
      case 'medium': return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-700 bg-blue-100 border-blue-200';
      default: return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(timestamp);
  };

  if (!token) {
    return (
      <div className={`p-4 bg-gray-50 rounded-lg border ${className}`}>
        <p className="text-gray-600">Please log in to see real-time monitoring</p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-sm font-medium">
            {isConnected ? 'Real-time monitoring active' : 'Connecting...'}
          </span>
        </div>
        {serviceStatus && (
          <div className="text-sm text-gray-600">
            {serviceStatus.activeWebsites} websites monitored
          </div>
        )}
      </div>

      {/* Connection Error */}
      {connectionError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">Connection error: {connectionError}</p>
        </div>
      )}

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Active Alerts</h3>
              <button
                onClick={clearAlerts}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {alerts.map((alert, index) => (
              <div
                key={index}
                className={`p-3 border-l-4 ${getAlertSeverityColor(alert.severity)} ${
                  index < alerts.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{alert.websiteName}</p>
                    <p className="text-sm mt-1">{alert.message}</p>
                  </div>
                  <span className="text-xs text-gray-500 capitalize">
                    {alert.severity}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Latest Updates */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-3 border-b bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-900">Latest Monitoring Updates</h3>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {latestUpdates.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              {isConnected ? 'Waiting for monitoring updates...' : 'Not connected'}
            </div>
          ) : (
            latestUpdates.slice(0, 10).map((update, index) => (
              <div
                key={index}
                className={`p-3 ${index < latestUpdates.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(update.status)}`}>
                      {update.status.toUpperCase()}
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {update.websiteName}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-900">
                      {update.responseTime}ms
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(update.timestamp)}
                    </div>
                  </div>
                </div>
                
                {update.sslInfo && (
                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-600">
                    <span className={update.sslInfo.valid ? 'text-green-600' : 'text-red-600'}>
                      SSL: {update.sslInfo.valid ? 'Valid' : 'Invalid'}
                    </span>
                    {update.sslInfo.daysUntilExpiry !== undefined && (
                      <span className={update.sslInfo.daysUntilExpiry < 30 ? 'text-yellow-600' : 'text-gray-600'}>
                        Expires in {update.sslInfo.daysUntilExpiry} days
                      </span>
                    )}
                    {update.sslInfo.grade && (
                      <span>Grade: {update.sslInfo.grade}</span>
                    )}
                  </div>
                )}
                
                {update.performanceScore && (
                  <div className="mt-1 text-xs text-gray-600">
                    Performance Score: {update.performanceScore}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Service Status */}
      {serviceStatus && isConnected && (
        <div className="bg-white rounded-lg border shadow-sm p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Service Status</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">{serviceStatus.activeWebsites}</div>
              <div className="text-xs text-gray-600">Active Websites</div>
            </div>
            <div>
              <div className={`text-lg font-bold ${serviceStatus.isRunning ? 'text-green-600' : 'text-red-600'}`}>
                {serviceStatus.isRunning ? 'ONLINE' : 'OFFLINE'}
              </div>
              <div className="text-xs text-gray-600">Service Status</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-600">
                {Math.floor(serviceStatus.uptime / 3600)}h
              </div>
              <div className="text-xs text-gray-600">Uptime</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};