import { Pool } from 'pg';
import pool from '../config/database';

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

export class MonitoringEngine {
  private activeChecks = new Map<number, NodeJS.Timeout>();
  private isRunning = false;

  constructor(private db: Pool = pool) {}

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log('🚀 Starting Website Monitoring Engine...');
    this.isRunning = true;
    
    await this.loadAndStartMonitoring();
    
    setInterval(() => this.loadAndStartMonitoring(), 5 * 60 * 1000);
  }

  async stop(): Promise<void> {
    console.log('⏹️ Stopping Website Monitoring Engine...');
    this.isRunning = false;
    
    for (const [websiteId, timeout] of this.activeChecks) {
      clearTimeout(timeout);
    }
    this.activeChecks.clear();
  }

  private async loadAndStartMonitoring(): Promise<void> {
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
    } catch (error) {
      console.error('❌ Error loading monitoring configs:', error);
    }
  }

  private scheduleMonitoring(config: any): void {
    if (this.activeChecks.has(config.website_id)) {
      clearTimeout(this.activeChecks.get(config.website_id)!);
    }

    const checkWebsite = async () => {
      if (!this.isRunning) return;
      
      try {
        const result = await this.performCheck(config);
        await this.saveResult(result);
        await this.checkAlerts(result);
        
        console.log(`✅ Checked ${config.name} (${config.url}): ${result.status} in ${result.responseTime}ms`);
      } catch (error) {
        console.error(`❌ Error checking ${config.name}:`, error);
      }

      if (this.isRunning) {
        const timeout = setTimeout(checkWebsite, config.check_interval * 1000);
        this.activeChecks.set(config.website_id, timeout);
      }
    };

    checkWebsite();
  }

  private async performCheck(config: any): Promise<MonitorResult> {
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
      
      let status: 'up' | 'down' | 'degraded' = 'up';
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
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      return {
        websiteId: config.website_id,
        status: 'down',
        responseTime,
        errorMessage: error.name === 'AbortError' ? 'Request timeout' : error.message
      };
    }
  }

  private calculatePerformanceScore(responseTime: number, statusCode: number): number {
    if (statusCode >= 500) return 0;
    if (statusCode >= 400) return 25;
    
    if (responseTime < 200) return 100;
    if (responseTime < 500) return 90;
    if (responseTime < 1000) return 80;
    if (responseTime < 2000) return 70;
    if (responseTime < 3000) return 60;
    if (responseTime < 5000) return 50;
    return 30;
  }

  private async saveResult(result: MonitorResult): Promise<void> {
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
    } catch (error) {
      console.error('❌ Error saving monitor result:', error);
    }
  }

  private async checkAlerts(result: MonitorResult): Promise<void> {
    if (result.status === 'up') return;
    
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
    } catch (error) {
      console.error('❌ Error checking alerts:', error);
    }
  }

  private async sendAlert(alertConfig: any, result: MonitorResult): Promise<void> {
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
      
    } catch (error) {
      console.error(`❌ Error sending ${alertConfig.alert_type} alert:`, error);
      
      await this.db.query(`
        INSERT INTO alert_history (website_id, alert_type, destination, message, status)
        VALUES ($1, $2, $3, $4, 'failed')
      `, [result.websiteId, alertConfig.alert_type, alertConfig.destination, message]);
    }
  }

  private createAlertMessage(website: any, result: MonitorResult): string {
    const statusEmoji = result.status === 'down' ? '🔴' : '🟡';
    return `${statusEmoji} Website Alert: ${website.name} is ${result.status.toUpperCase()}\n` +
           `URL: ${website.url}\n` +
           `Status: ${result.status}\n` +
           `Response Time: ${result.responseTime}ms\n` +
           `${result.errorMessage ? `Error: ${result.errorMessage}\n` : ''}` +
           `Time: ${new Date().toLocaleString()}`;
  }

  private async sendEmailAlert(email: string, message: string, website: any): Promise<void> {
    console.log(`📧 Email Alert to ${email}:`);
    console.log(message);
  }

  public async checkWebsite(websiteId: number): Promise<MonitorResult | null> {
    try {
      const result = await this.db.query(`
        SELECT 
          mc.id, mc.website_id, mc.check_interval, mc.timeout, mc.enabled, mc.monitor_type,
          w.url, w.name, w.user_id
        FROM monitor_configs mc
        JOIN websites w ON mc.website_id = w.id
        WHERE mc.website_id = $1 AND mc.enabled = true
      `, [websiteId]);

      if (result.rows.length === 0) return null;

      const config = result.rows[0];
      const monitorResult = await this.performCheck(config);
      await this.saveResult(monitorResult);
      
      return monitorResult;
    } catch (error) {
      console.error('❌ Error in manual check:', error);
      return null;
    }
  }
}

export const monitoringEngine = new MonitoringEngine();