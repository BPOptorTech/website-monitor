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
    if(this.isRunning) return;

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
}

private async loadAndStartMonitoring(): Promise<void> {
  try {
    const result = await this.db.query(`
      SELECT 
        mc.id, mc.website_id, mc.check_interval, mc.timeout, mc.enabled, mc.monitor_type,
        w.url, w.name, w.user_id
      FROM monitor_configs mc
      JOIN websites w ON mc.website_id = w.id
      WHERE mc.enabled = true
    `);

    const configs = result.rows as (MonitorConfig & Website)[];
    
    for (const config of configs) {
      this.scheduleMonitoring(config);
    }
    
    console.log(`📊 Loaded ${configs.length} monitoring configurations`);
  } catch (error) {
    console.error('❌ Error loading monitoring configs:', error);
  }
}

private scheduleMonitoring(config: MonitorConfig & Website): void {
  if (this.activeChecks.has(config.websiteId)) {
    clearTimeout(this.activeChecks.get(config.websiteId)!);
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
      const timeout = setTimeout(checkWebsite, config.checkInterval * 1000);
      this.activeChecks.set(config.websiteId, timeout);
    }
  };

  checkWebsite();
}

private async performCheck(config: MonitorConfig & Website): Promise<MonitorResult> {
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
      websiteId: config.websiteId,
      status,
      responseTime,
      statusCode: response.status,
      performanceScore: this.calculatePerformanceScore(responseTime, response.status)
    };
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      websiteId: config.websiteId,
      status: 'down',
      responseTime,
      errorMessage: error.name === 'AbortError' ? 'Request timeout' : error.message
    };
  }
}