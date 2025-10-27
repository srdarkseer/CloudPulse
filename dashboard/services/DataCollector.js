const axios = require('axios');
const winston = require('winston');

class DataCollector {
  constructor(agentEndpoints) {
    this.agentEndpoints = agentEndpoints;
    this.metricsCache = new Map();
    this.nodeStatus = new Map();
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/data-collector.log' }),
        new winston.transports.Console()
      ]
    });
  }
  
  async collectMetrics() {
    const allMetrics = [];
    
    for (const endpoint of this.agentEndpoints) {
      try {
        const response = await axios.get(`${endpoint}/metrics`, {
          timeout: 5000
        });
        
        if (response.status === 200) {
          const metrics = response.data;
          metrics.endpoint = endpoint;
          metrics.collected_at = new Date().toISOString();
          
          allMetrics.push(metrics);
          this.metricsCache.set(endpoint, metrics);
          this.nodeStatus.set(endpoint, {
            status: 'healthy',
            lastSeen: new Date().toISOString(),
            responseTime: response.headers['x-response-time'] || 'unknown'
          });
          
          this.logger.debug(`Metrics collected from ${endpoint}`);
        }
      } catch (error) {
        this.logger.error(`Failed to collect metrics from ${endpoint}:`, error.message);
        
        // Mark node as unhealthy
        this.nodeStatus.set(endpoint, {
          status: 'unhealthy',
          lastSeen: new Date().toISOString(),
          error: error.message
        });
      }
    }
    
    return allMetrics;
  }
  
  async getAllMetrics() {
    // Return cached metrics if available, otherwise collect fresh
    if (this.metricsCache.size === 0) {
      await this.collectMetrics();
    }
    
    return Array.from(this.metricsCache.values());
  }
  
  getLatestMetrics() {
    return Array.from(this.metricsCache.values());
  }
  
  async getNodeStatus() {
    const statuses = [];
    
    for (const [endpoint, status] of this.nodeStatus.entries()) {
      statuses.push({
        endpoint,
        nodeId: this.extractNodeId(endpoint),
        ...status
      });
    }
    
    return statuses;
  }
  
  extractNodeId(endpoint) {
    // Extract node ID from endpoint URL
    const url = new URL(endpoint);
    return url.hostname || endpoint;
  }
  
  getMetricsHistory(endpoint, limit = 100) {
    // This would typically query a time-series database
    // For now, return cached metrics
    const metrics = this.metricsCache.get(endpoint);
    return metrics ? [metrics] : [];
  }
  
  async getAggregatedMetrics(timeframe = '1h') {
    const allMetrics = await this.getAllMetrics();
    
    if (allMetrics.length === 0) {
      return null;
    }
    
    // Calculate aggregated metrics
    const aggregated = {
      timestamp: new Date().toISOString(),
      timeframe,
      nodes: allMetrics.length,
      cpu: {
        average: allMetrics.reduce((sum, m) => sum + (m.cpu?.usage_percent || 0), 0) / allMetrics.length,
        max: Math.max(...allMetrics.map(m => m.cpu?.usage_percent || 0)),
        min: Math.min(...allMetrics.map(m => m.cpu?.usage_percent || 0))
      },
      memory: {
        average: allMetrics.reduce((sum, m) => sum + (m.memory?.used_percent || 0), 0) / allMetrics.length,
        max: Math.max(...allMetrics.map(m => m.memory?.used_percent || 0)),
        min: Math.min(...allMetrics.map(m => m.memory?.used_percent || 0))
      },
      network: {
        totalBytesSent: allMetrics.reduce((sum, m) => sum + (m.network?.bytes_sent || 0), 0),
        totalBytesRecv: allMetrics.reduce((sum, m) => sum + (m.network?.bytes_recv || 0), 0)
      }
    };
    
    return aggregated;
  }
  
  isHealthy() {
    const healthyNodes = Array.from(this.nodeStatus.values())
      .filter(status => status.status === 'healthy').length;
    
    return healthyNodes > 0;
  }
  
  getHealthStats() {
    const totalNodes = this.nodeStatus.size;
    const healthyNodes = Array.from(this.nodeStatus.values())
      .filter(status => status.status === 'healthy').length;
    
    return {
      totalNodes,
      healthyNodes,
      unhealthyNodes: totalNodes - healthyNodes,
      healthPercentage: totalNodes > 0 ? (healthyNodes / totalNodes) * 100 : 0
    };
  }
}

module.exports = DataCollector;
