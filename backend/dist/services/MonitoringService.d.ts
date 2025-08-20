import { Pool } from 'pg';
export interface MonitorResult {
    websiteId: number;
    timestamp: Date;
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
    httpStatusCode?: number;
    errorMessage?: string;
    sslInfo?: SSLInfo;
    performanceMetrics?: PerformanceMetrics;
}
export interface SSLInfo {
    valid: boolean;
    expiryDate: Date;
    daysUntilExpiry: number;
    issuer: string;
    grade?: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    chainValid: boolean;
}
export interface PerformanceMetrics {
    firstByteTime: number;
    domLoadTime: number;
    fullLoadTime: number;
    resourceCount: number;
    pageSize: number;
    coreWebVitals?: {
        lcp?: number;
        fid?: number;
        cls?: number;
    };
}
export interface Website {
    id: number;
    url: string;
    name: string;
    userId: number;
    monitoringEnabled: boolean;
    checkInterval: number;
    alertEmails: string[];
    lastChecked?: Date;
    status?: 'up' | 'down' | 'degraded';
}
import type { WebSocketService } from './WebSocketService';
export declare class MonitoringService {
    private emailService;
    private db;
    private monitoringIntervals;
    private isRunning;
    private webSocketService?;
    constructor(database: Pool, webSocketService?: WebSocketService);
    /**
     * Start the monitoring service for all active websites
     */
    startMonitoring(): Promise<void>;
    /**
     * Stop the monitoring service
     */
    stopMonitoring(): void;
    /**
     * Start monitoring for a specific website
     */
    private startWebsiteMonitoring;
    /**
     * Perform comprehensive check for a website
     */
    private performWebsiteCheck;
    /**
     * Check website uptime and basic response
     */
    private checkUptime;
    /**
     * Check SSL certificate information
     */
    private checkSSL;
    /**
     * Calculate SSL grade based on certificate properties
     */
    private calculateSSLGrade;
    /**
     * Check performance metrics
     */
    private checkPerformance;
    /**
     * Save monitoring result to database
     */
    private saveMonitorResult;
    /**
     * Broadcast real-time monitoring update
     */
    private broadcastRealtimeUpdate;
    /**
     * Check if alerts should be triggered
     */
    private checkAlerts;
    /**
     * Trigger an alert
     */
    private triggerAlert;
    /**
     * Generate alert message
     */
    private generateAlertMessage;
    /**
     * Add a new website to monitoring
     */
    addWebsiteMonitoring(website: Website): Promise<void>;
    /**
     * Remove a website from monitoring
     */
    removeWebsiteMonitoring(websiteId: number): void;
    /**
     * Get monitoring status
     */
    getMonitoringStatus(): {
        isRunning: boolean;
        activeWebsites: number;
        uptime: number;
    };
}
//# sourceMappingURL=MonitoringService.d.ts.map