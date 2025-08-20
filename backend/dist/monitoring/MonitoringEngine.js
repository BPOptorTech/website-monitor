"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monitoringEngine = exports.MonitoringEngine = void 0;
const database_1 = __importDefault(require("../config/database"));
const SSLMonitor_1 = require("./SSLMonitor");
class MonitoringEngine {
    db;
    activeChecks = new Map();
    sslChecks = new Map();
    isRunning = false;
    constructor(db = database_1.default) {
        this.db = db;
    }
    async start() {
        if (this.isRunning)
            return;
        console.log('🚀 Starting Website Monitoring Engine...');
        this.isRunning = true;
        await this.loadAndStartMonitoring();
        await this.startSSLMonitoring();
        setInterval(() => this.loadAndStartMonitoring(), 5 * 60 * 1000);
        setInterval(() => this.startSSLMonitoring(), 24 * 60 * 60 * 1000); // Check SSL daily
    }
    async stop() {
        console.log('⏹️ Stopping Website Monitoring Engine...');
        this.isRunning = false;
        for (const [websiteId, timeout] of this.activeChecks) {
            clearTimeout(timeout);
        }
        this.activeChecks.clear();
        for (const [websiteId, timeout] of this.sslChecks) {
            clearTimeout(timeout);
        }
        this.sslChecks.clear();
    }
    async loadAndStartMonitoring() {
        try {
            const result = await this.db.query(`
        SELECT 
          mc.id, mc.website_id, mc.check_interval, 
          mc.timeout, mc.enabled, mc.monitor_type,
          w.url, w.name, w.user_id
        FROM monitor_configs mc
        JOIN websites w ON mc.website_id = w.id
        WHERE mc.enabled = true
      `);
            const configs = result.rows;
            for (const config of configs) {
                this.scheduleMonitoring(config);
            }
            console.log(`📊 Loaded ${configs.length} monitoring configurations`);
        }
        catch (error) {
            console.error('❌ Error loading monitoring configs:', error);
        }
    }
    async startSSLMonitoring() {
        try {
            const result = await this.db.query(`
        SELECT w.id as website_id, w.url, w.name
        FROM websites w
        WHERE w.url LIKE 'https://%'
      `);
            console.log(`🔒 Starting SSL monitoring for ${result.rows.length} HTTPS websites`);
            for (const website of result.rows) {
                this.scheduleSSLCheck(website);
            }
        }
        catch (error) {
            console.error('❌ Error starting SSL monitoring:', error);
        }
    }
    scheduleSSLCheck(website) {
        const checkSSL = async () => {
            if (!this.isRunning)
                return;
            try {
                const result = await SSLMonitor_1.sslMonitor.checkSSL(website.website_id, website.url);
                const status = result.certificateValid ? '✅' : '❌';
                const expiry = result.daysUntilExpiry !== null ? `${result.daysUntilExpiry} days` : 'N/A';
                console.log(`🔒 SSL Check ${website.name}: ${status} Grade: ${result.securityGrade}, Expires: ${expiry}`);
                // Check for SSL alerts
                if (result.daysUntilExpiry !== null && result.daysUntilExpiry <= 30) {
                    await this.sendSSLAlert(website, result);
                }
            }
            catch (error) {
                console.error(`❌ SSL check failed for ${website.name}:`, error);
            }
            // Schedule next SSL check in 24 hours
            if (this.isRunning) {
                const timeout = setTimeout(checkSSL, 24 * 60 * 60 * 1000);
                this.sslChecks.set(website.website_id, timeout);
            }
        };
        checkSSL(); // Run immediately, then schedule
    }
    async sendSSLAlert(website, sslResult) {
        const daysLeft = sslResult.daysUntilExpiry;
        let urgency = '';
        if (daysLeft <= 1)
            urgency = '🚨 CRITICAL';
        else if (daysLeft <= 7)
            urgency = '⚠️ URGENT';
        else if (daysLeft <= 30)
            urgency = '⚠️ WARNING';
        const message = `${urgency} SSL Certificate Expiring Soon!\n` +
            `Website: ${website.name}\n` +
            `URL: ${website.url}\n` +
            `Days until expiry: ${daysLeft}\n` +
            `Issuer: ${sslResult.issuer}\n` +
            `Security Grade: ${sslResult.securityGrade}\n` +
            `Action Required: Renew SSL certificate immediately`;
        console.log(`🔒 SSL Alert for ${website.name}: ${message}`);
        // Here you would integrate with your existing alert system
        // For now, we'll just log the alert
    }
    scheduleMonitoring(config) {
        if (this.activeChecks.has(config.website_id)) {
            clearTimeout(this.activeChecks.get(config.website_id));
        }
        const checkWebsite = async () => {
            if (!this.isRunning)
                return;
            try {
                const result = await this.performCheck(config);
                await this.saveResult(result);
                await this.checkAlerts(result);
                console.log(`✅ Checked ${config.name} (${config.url}): ${result.status} in ${result.responseTime}ms`);
            }
            catch (error) {
                console.error(`❌ Error checking ${config.name}:`, error);
            }
            if (this.isRunning) {
                const timeout = setTimeout(checkWebsite, config.check_interval * 1000);
                this.activeChecks.set(config.website_id, timeout);
            }
        };
        checkWebsite();
    }
    async performCheck(config) {
        const startTime = Date.now();
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), config.timeout * 1000);
            const response = await fetch(config.url, {
                method: 'GET',
                headers: {
                    'User-Agent': 'WebsiteMonitor/1.0 (Uptime Check)',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            let status = 'up';
            if (!response.ok) {
                status = response.status >= 500 ? 'down' : 'degraded';
            }
            return {
                websiteId: config.website_id,
                status,
                responseTime,
                statusCode: response.status,
                performanceScore: this.calculatePerformanceScore(responseTime, response.status)
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                websiteId: config.website_id,
                status: 'down',
                responseTime,
                errorMessage: error.name === 'AbortError' ? 'Request timeout' : error.message
            };
        }
    }
    calculatePerformanceScore(responseTime, statusCode) {
        if (statusCode >= 500)
            return 0;
        if (statusCode >= 400)
            return 25;
        if (responseTime < 200)
            return 100;
        if (responseTime < 500)
            return 90;
        if (responseTime < 1000)
            return 80;
        if (responseTime < 2000)
            return 70;
        if (responseTime < 3000)
            return 60;
        if (responseTime < 5000)
            return 50;
        return 30;
    }
    async saveResult(result) {
        try {
            await this.db.query(`
        INSERT INTO monitor_results 
        (website_id, status, response_time, status_code, error_message, performance_score)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
                result.websiteId,
                result.status,
                result.responseTime,
                result.statusCode,
                result.errorMessage,
                result.performanceScore
            ]);
        }
        catch (error) {
            console.error('❌ Error saving monitor result:', error);
        }
    }
    async checkAlerts(result) {
        if (result.status === 'up')
            return;
        try {
            const alertResult = await this.db.query(`
        SELECT * FROM alert_configs 
        WHERE website_id = $1 AND enabled = true
      `, [result.websiteId]);
            for (const alertConfig of alertResult.rows) {
                const recentAlert = await this.db.query(`
          SELECT id FROM alert_history 
          WHERE website_id = $1 AND alert_type = $2 
          AND sent_at > NOW() - INTERVAL '15 minutes'
          ORDER BY sent_at DESC LIMIT 1
        `, [result.websiteId, alertConfig.alert_type]);
                if (recentAlert.rows.length === 0) {
                    await this.sendAlert(alertConfig, result);
                }
            }
        }
        catch (error) {
            console.error('❌ Error checking alerts:', error);
        }
    }
    async sendAlert(alertConfig, result) {
        const websiteResult = await this.db.query(`
      SELECT name, url FROM websites WHERE id = $1
    `, [result.websiteId]);
        const website = websiteResult.rows[0];
        const message = this.createAlertMessage(website, result);
        try {
            switch (alertConfig.alert_type) {
                case 'email':
                    await this.sendEmailAlert(alertConfig.destination, message, website);
                    break;
                case 'sms':
                    console.log(`📱 SMS Alert: ${message}`);
                    break;
                case 'webhook':
                    console.log(`🔗 Webhook Alert: ${message}`);
                    break;
            }
            await this.db.query(`
        INSERT INTO alert_history (website_id, alert_type, destination, message, status)
        VALUES ($1, $2, $3, $4, 'sent')
      `, [result.websiteId, alertConfig.alert_type, alertConfig.destination, message]);
        }
        catch (error) {
            console.error(`❌ Error sending ${alertConfig.alert_type} alert:`, error);
            await this.db.query(`
        INSERT INTO alert_history (website_id, alert_type, destination, message, status)
        VALUES ($1, $2, $3, $4, 'failed')
      `, [result.websiteId, alertConfig.alert_type, alertConfig.destination, message]);
        }
    }
    createAlertMessage(website, result) {
        const statusEmoji = result.status === 'down' ? '🔴' : '🟡';
        return `${statusEmoji} Website Alert: ${website.name} is ${result.status.toUpperCase()}\n` +
            `URL: ${website.url}\n` +
            `Status: ${result.status}\n` +
            `Response Time: ${result.responseTime}ms\n` +
            `${result.errorMessage ? `Error: ${result.errorMessage}\n` : ''}` +
            `Time: ${new Date().toLocaleString()}`;
    }
    async sendEmailAlert(email, message, website) {
        console.log(`📧 Email Alert to ${email}:`);
        console.log(message);
    }
    async checkWebsite(websiteId) {
        try {
            const result = await this.db.query(`
        SELECT 
          mc.id, mc.website_id, mc.check_interval, mc.timeout, mc.enabled, mc.monitor_type,
          w.url, w.name, w.user_id
        FROM monitor_configs mc
        JOIN websites w ON mc.website_id = w.id
        WHERE mc.website_id = $1 AND mc.enabled = true
      `, [websiteId]);
            if (result.rows.length === 0)
                return null;
            const config = result.rows[0];
            const monitorResult = await this.performCheck(config);
            await this.saveResult(monitorResult);
            return monitorResult;
        }
        catch (error) {
            console.error('❌ Error in manual check:', error);
            return null;
        }
    }
    // New method to get SSL status for dashboard
    async getSSLStatus(websiteId) {
        return await SSLMonitor_1.sslMonitor.getSSLStatus(websiteId);
    }
    // New method to check all expiring certificates
    async getExpiringCertificates(days = 30) {
        return await SSLMonitor_1.sslMonitor.checkExpiringCertificates(days);
    }
}
exports.MonitoringEngine = MonitoringEngine;
exports.monitoringEngine = new MonitoringEngine();
//# sourceMappingURL=MonitoringEngine.js.map