"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoringService = void 0;
const axios_1 = __importDefault(require("axios"));
const tls = __importStar(require("tls"));
const url_1 = require("url");
const EmailService_1 = require("./EmailService");
class MonitoringService {
    emailService;
    db;
    monitoringIntervals = new Map();
    isRunning = false;
    webSocketService;
    constructor(database, webSocketService) {
        this.db = database;
        this.webSocketService = webSocketService;
        this.emailService = new EmailService_1.EmailService({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || ''
        });
    }
    /**
     * Start the monitoring service for all active websites
     */
    async startMonitoring() {
        if (this.isRunning) {
            console.log('Monitoring service is already running');
            return;
        }
        console.log('🚀 Starting Website Monitoring Service...');
        this.isRunning = true;
        try {
            // Get all websites with monitoring enabled
            const result = await this.db.query(`
        SELECT w.*, mc.check_interval
        FROM websites w 
        LEFT JOIN monitor_configs mc ON w.id = mc.website_id 
        WHERE w.monitoring_enabled = true
      `);
            const websites = result.rows.map(row => ({
                id: row.id,
                url: row.url,
                name: row.name,
                userId: row.user_id,
                monitoringEnabled: row.monitoring_enabled,
                checkInterval: Math.round((row.check_interval || 300) / 60), // Convert seconds to minutes
                alertEmails: [], // Will get from alert_configs table later if needed
                lastChecked: row.last_checked,
                status: row.status
            }));
            console.log(`📊 Found ${websites.length} websites to monitor`);
            // Start monitoring each website
            for (const website of websites) {
                await this.startWebsiteMonitoring(website);
            }
            console.log('✅ Monitoring service started successfully');
        }
        catch (error) {
            console.error('❌ Failed to start monitoring service:', error);
            this.isRunning = false;
        }
    }
    /**
     * Stop the monitoring service
     */
    stopMonitoring() {
        console.log('🛑 Stopping Website Monitoring Service...');
        this.isRunning = false;
        // Clear all intervals
        for (const [websiteId, interval] of this.monitoringIntervals) {
            clearInterval(interval);
            console.log(`⏹️ Stopped monitoring for website ID: ${websiteId}`);
        }
        this.monitoringIntervals.clear();
        console.log('✅ Monitoring service stopped');
    }
    /**
     * Start monitoring for a specific website
     */
    async startWebsiteMonitoring(website) {
        // Clear existing interval if any
        const existingInterval = this.monitoringIntervals.get(website.id);
        if (existingInterval) {
            clearInterval(existingInterval);
        }
        console.log(`🔍 Starting monitoring for: ${website.name} (${website.url})`);
        console.log(`⏰ Check interval: ${website.checkInterval} minutes`);
        // Perform initial check
        await this.performWebsiteCheck(website);
        // Set up recurring checks
        const intervalMs = website.checkInterval * 60 * 1000; // Convert minutes to milliseconds
        const interval = setInterval(async () => {
            if (this.isRunning) {
                await this.performWebsiteCheck(website);
            }
        }, intervalMs);
        this.monitoringIntervals.set(website.id, interval);
    }
    /**
     * Perform comprehensive check for a website
     */
    async performWebsiteCheck(website) {
        const startTime = Date.now();
        console.log(`🔍 Checking: ${website.name} (${website.url})`);
        try {
            // Parallel execution of all checks
            const [uptimeResult, sslInfo, performanceMetrics] = await Promise.allSettled([
                this.checkUptime(website.url),
                this.checkSSL(website.url),
                this.checkPerformance(website.url)
            ]);
            // Process uptime result
            const uptime = uptimeResult.status === 'fulfilled' ? uptimeResult.value : null;
            const ssl = sslInfo.status === 'fulfilled' ? sslInfo.value : null;
            const performance = performanceMetrics.status === 'fulfilled' ? performanceMetrics.value : null;
            const result = {
                websiteId: website.id,
                timestamp: new Date(),
                status: uptime?.status || 'down',
                responseTime: uptime?.responseTime || 0,
                httpStatusCode: uptime?.httpStatusCode,
                errorMessage: uptime?.errorMessage,
                sslInfo: ssl || undefined,
                performanceMetrics: performance || undefined
            };
            // Save result to database
            await this.saveMonitorResult(result);
            // Check for alerts
            await this.checkAlerts(website, result);
            const duration = Date.now() - startTime;
            console.log(`✅ Check completed for ${website.name} in ${duration}ms - Status: ${result.status}`);
            return result;
        }
        catch (error) {
            console.error(`❌ Error checking website ${website.name}:`, error);
            const errorResult = {
                websiteId: website.id,
                timestamp: new Date(),
                status: 'down',
                responseTime: 0,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            };
            await this.saveMonitorResult(errorResult);
            return errorResult;
        }
    }
    /**
     * Check website uptime and basic response
     */
    async checkUptime(url) {
        const startTime = Date.now();
        try {
            const response = await axios_1.default.get(url, {
                timeout: 30000, // 30 second timeout
                validateStatus: (status) => status < 500, // Don't throw on 4xx errors
                headers: {
                    'User-Agent': 'WebsiteMonitor/1.0 (Premium Monitoring Service)'
                }
            });
            const responseTime = Date.now() - startTime;
            const statusCode = response.status;
            let status;
            if (statusCode >= 200 && statusCode < 300) {
                status = responseTime > 5000 ? 'degraded' : 'up'; // Degraded if >5s response
            }
            else if (statusCode >= 400 && statusCode < 500) {
                status = 'degraded'; // Client errors are degraded
            }
            else {
                status = 'down'; // Server errors are down
            }
            return {
                status,
                responseTime,
                httpStatusCode: statusCode
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Connection failed';
            return {
                status: 'down',
                responseTime,
                errorMessage
            };
        }
    }
    /**
     * Check SSL certificate information
     */
    async checkSSL(url) {
        try {
            const parsedUrl = new url_1.URL(url);
            // Only check SSL for HTTPS URLs
            if (parsedUrl.protocol !== 'https:') {
                return null;
            }
            return new Promise((resolve, reject) => {
                const options = {
                    host: parsedUrl.hostname,
                    port: parseInt(parsedUrl.port) || 443,
                    servername: parsedUrl.hostname,
                    rejectUnauthorized: false // We want to check even invalid certs
                };
                const socket = tls.connect(options, () => {
                    const cert = socket.getPeerCertificate(true);
                    const validFrom = new Date(cert.valid_from);
                    const validTo = new Date(cert.valid_to);
                    const now = new Date();
                    const daysUntilExpiry = Math.ceil((validTo.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const chainValid = socket.authorized;
                    const sslInfo = {
                        valid: now >= validFrom && now <= validTo && chainValid,
                        expiryDate: validTo,
                        daysUntilExpiry,
                        issuer: cert.issuer.CN || cert.issuer.O || 'Unknown',
                        chainValid,
                        grade: this.calculateSSLGrade(cert, chainValid)
                    };
                    socket.destroy();
                    resolve(sslInfo);
                });
                socket.on('error', (error) => {
                    socket.destroy();
                    reject(error);
                });
                socket.setTimeout(10000, () => {
                    socket.destroy();
                    reject(new Error('SSL check timeout'));
                });
            });
        }
        catch (error) {
            console.error('SSL check error:', error);
            return null;
        }
    }
    /**
     * Calculate SSL grade based on certificate properties
     */
    calculateSSLGrade(cert, chainValid) {
        if (!chainValid)
            return 'F';
        const keySize = cert.pubkey?.asymmetricKeySize || 0;
        const algorithm = cert.pubkey?.asymmetricKeyType || '';
        if (algorithm === 'ec' && keySize >= 256)
            return 'A+';
        if (algorithm === 'rsa' && keySize >= 2048)
            return 'A';
        if (keySize >= 1024)
            return 'B';
        return 'C';
    }
    /**
     * Check performance metrics
     */
    async checkPerformance(url) {
        const startTime = Date.now();
        try {
            const response = await axios_1.default.get(url, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'WebsiteMonitor/1.0 (Performance Analysis)'
                }
            });
            const totalTime = Date.now() - startTime;
            const contentLength = response.headers['content-length']
                ? parseInt(response.headers['content-length'])
                : response.data.length;
            // Basic performance metrics
            const metrics = {
                firstByteTime: totalTime, // Simplified - in real implementation would measure TTFB
                domLoadTime: totalTime,
                fullLoadTime: totalTime,
                resourceCount: 1, // Would need DOM parsing for accurate count
                pageSize: contentLength || 0
            };
            return metrics;
        }
        catch (error) {
            console.error('Performance check error:', error);
            return null;
        }
    }
    /**
     * Save monitoring result to database
     */
    async saveMonitorResult(result) {
        try {
            await this.db.query(`
        INSERT INTO monitor_results (
          website_id, 
          checked_at, 
          status, 
          response_time, 
          status_code, 
          error_message,
          ssl_expiry_days,
          ssl_valid,
          performance_score
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
                result.websiteId,
                result.timestamp,
                result.status,
                result.responseTime,
                result.httpStatusCode,
                result.errorMessage,
                result.sslInfo?.daysUntilExpiry,
                result.sslInfo?.valid,
                result.performanceMetrics ? Math.round(5000 / result.responseTime * 100) : null // Simple performance score
            ]);
            // Update website last_checked and current status
            await this.db.query(`
        UPDATE websites 
        SET last_checked = $1, status = $2 
        WHERE id = $3
      `, [result.timestamp, result.status, result.websiteId]);
            console.log(`✅ Saved monitoring result for website ${result.websiteId}: ${result.status} (${result.responseTime}ms)`);
            // Broadcast real-time update via WebSocket
            await this.broadcastRealtimeUpdate(result);
        }
        catch (error) {
            console.error('Error saving monitor result:', error);
        }
    }
    /**
     * Broadcast real-time monitoring update
     */
    async broadcastRealtimeUpdate(result) {
        if (!this.webSocketService) {
            return; // No WebSocket service available
        }
        try {
            // Get website details and owner
            const websiteResult = await this.db.query('SELECT name, user_id FROM websites WHERE id = $1', [result.websiteId]);
            if (websiteResult.rows.length > 0) {
                const website = websiteResult.rows[0];
                const update = {
                    websiteId: result.websiteId,
                    websiteName: website.name,
                    status: result.status,
                    responseTime: result.responseTime,
                    timestamp: result.timestamp,
                    sslInfo: result.sslInfo ? {
                        valid: result.sslInfo.valid,
                        daysUntilExpiry: result.sslInfo.daysUntilExpiry,
                        grade: result.sslInfo.grade
                    } : undefined,
                    performanceScore: result.performanceMetrics ? Math.round(5000 / result.responseTime * 100) : undefined
                };
                this.webSocketService.broadcastMonitoringUpdate(update, website.user_id);
                console.log(`📡 Real-time update sent for ${website.name}`);
            }
        }
        catch (error) {
            console.error('Error broadcasting real-time update:', error);
        }
    }
    /**
     * Check if alerts should be triggered
     */
    async checkAlerts(website, result) {
        // Status change alerts
        if (result.status === 'down' || (result.status === 'degraded' && result.responseTime > 10000)) {
            await this.triggerAlert(website, result, 'status_change');
        }
        // SSL expiry alerts
        if (result.sslInfo && result.sslInfo.daysUntilExpiry <= 30) {
            await this.triggerAlert(website, result, 'ssl_expiry');
        }
        // Performance alerts
        if (result.responseTime > 15000) { // 15+ seconds
            await this.triggerAlert(website, result, 'performance');
        }
    }
    /**
     * Trigger an alert
     */
    async triggerAlert(website, result, alertType) {
        try {
            // Save alert to database
            await this.db.query(`
        INSERT INTO alert_history (
          website_id, 
          alert_type, 
          message, 
          triggered_at,
          resolved_at
        ) VALUES ($1, $2, $3, $4, $5)
      `, [
                website.id,
                alertType,
                this.generateAlertMessage(website, result, alertType),
                new Date(),
                null
            ]);
            console.log(`🚨 Alert triggered for ${website.name}: ${alertType}`);
            // TODO: Send email notifications to website.alertEmails
            // This will be implemented in the next step
        }
        catch (error) {
            console.error('Error triggering alert:', error);
        }
    }
    /**
     * Generate alert message
     */
    generateAlertMessage(website, result, alertType) {
        switch (alertType) {
            case 'status_change':
                return `Website ${website.name} is ${result.status.toUpperCase()}. Response time: ${result.responseTime}ms`;
            case 'ssl_expiry':
                return `SSL certificate for ${website.name} expires in ${result.sslInfo?.daysUntilExpiry} days`;
            case 'performance':
                return `Slow response detected for ${website.name}: ${result.responseTime}ms`;
            default:
                return `Alert for ${website.name}`;
        }
    }
    /**
     * Add a new website to monitoring
     */
    async addWebsiteMonitoring(website) {
        if (this.isRunning) {
            await this.startWebsiteMonitoring(website);
            console.log(`✅ Added monitoring for: ${website.name}`);
        }
    }
    /**
     * Remove a website from monitoring
     */
    removeWebsiteMonitoring(websiteId) {
        const interval = this.monitoringIntervals.get(websiteId);
        if (interval) {
            clearInterval(interval);
            this.monitoringIntervals.delete(websiteId);
            console.log(`🗑️ Removed monitoring for website ID: ${websiteId}`);
        }
    }
    /**
     * Get monitoring status
     */
    getMonitoringStatus() {
        return {
            isRunning: this.isRunning,
            activeWebsites: this.monitoringIntervals.size,
            uptime: process.uptime()
        };
    }
}
exports.MonitoringService = MonitoringService;
//# sourceMappingURL=MonitoringService.js.map