import { Pool } from 'pg';
export interface MonitorResult {
    websiteId: number;
    status: 'up' | 'down' | 'degraded';
    responseTime: number;
    statusCode?: number;
    errorMessage?: string;
    sslExpiryDays?: number;
    performanceScore?: number;
}
export interface Website {
    id: number;
    url: string;
    name: string;
    userId: number;
}
export interface MonitorConfig {
    id: number;
    websiteId: number;
    checkInterval: number;
    timeout: number;
    enabled: boolean;
    monitorType: string;
}
export declare class MonitoringEngine {
    private db;
    private activeChecks;
    private sslChecks;
    private isRunning;
    constructor(db?: Pool);
    start(): Promise<void>;
    stop(): Promise<void>;
    private loadAndStartMonitoring;
    private startSSLMonitoring;
    private scheduleSSLCheck;
    private sendSSLAlert;
    private scheduleMonitoring;
    private performCheck;
    private calculatePerformanceScore;
    private saveResult;
    private checkAlerts;
    private sendAlert;
    private createAlertMessage;
    private sendEmailAlert;
    checkWebsite(websiteId: number): Promise<MonitorResult | null>;
    getSSLStatus(websiteId: number): Promise<import("./SSLMonitor").SSLResult | null>;
    getExpiringCertificates(days?: number): Promise<any[]>;
}
export declare const monitoringEngine: MonitoringEngine;
//# sourceMappingURL=MonitoringEngine.d.ts.map