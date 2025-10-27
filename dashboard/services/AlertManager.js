const axios = require('axios');
const winston = require('winston');

class AlertManager {
  constructor(io) {
    this.io = io;
    this.alerts = new Map();
    this.alertRules = [
      {
        id: 'high_cpu',
        name: 'High CPU Usage',
        condition: (metrics) => metrics.cpu?.usage_percent > 80,
        severity: 'warning',
        message: 'CPU usage is above 80%'
      },
      {
        id: 'critical_cpu',
        name: 'Critical CPU Usage',
        condition: (metrics) => metrics.cpu?.usage_percent > 95,
        severity: 'critical',
        message: 'CPU usage is above 95%'
      },
      {
        id: 'high_memory',
        name: 'High Memory Usage',
        condition: (metrics) => metrics.memory?.used_percent > 85,
        severity: 'warning',
        message: 'Memory usage is above 85%'
      },
      {
        id: 'critical_memory',
        name: 'Critical Memory Usage',
        condition: (metrics) => metrics.memory?.used_percent > 95,
        severity: 'critical',
        message: 'Memory usage is above 95%'
      },
      {
        id: 'node_down',
        name: 'Node Down',
        condition: (metrics) => !metrics || !metrics.timestamp,
        severity: 'critical',
        message: 'Node is not responding'
      }
    ];
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/alerts.log' }),
        new winston.transports.Console()
      ]
    });
  }
  
  async checkAlerts(metricsData) {
    const newAlerts = [];
    
    for (const nodeMetrics of metricsData) {
      for (const rule of this.alertRules) {
        if (rule.condition(nodeMetrics)) {
          const alertId = `${rule.id}_${nodeMetrics.node_id}_${Date.now()}`;
          
          // Check if alert already exists
          if (!this.alerts.has(alertId)) {
            const alert = {
              id: alertId,
              ruleId: rule.id,
              nodeId: nodeMetrics.node_id,
              name: rule.name,
              severity: rule.severity,
              message: rule.message,
              timestamp: new Date().toISOString(),
              acknowledged: false,
              resolved: false,
              metrics: nodeMetrics
            };
            
            this.alerts.set(alertId, alert);
            newAlerts.push(alert);
            
            this.logger.warn(`Alert triggered: ${alert.name} on node ${alert.nodeId}`, {
              alertId: alert.id,
              severity: alert.severity,
              metrics: nodeMetrics
            });
          }
        }
      }
    }
    
    return newAlerts;
  }
  
  acknowledgeAlert(alertId) {
    if (this.alerts.has(alertId)) {
      const alert = this.alerts.get(alertId);
      alert.acknowledged = true;
      alert.acknowledgedAt = new Date().toISOString();
      
      this.logger.info(`Alert acknowledged: ${alertId}`);
      this.io.emit('alertAcknowledged', alert);
      
      return true;
    }
    return false;
  }
  
  resolveAlert(alertId) {
    if (this.alerts.has(alertId)) {
      const alert = this.alerts.get(alertId);
      alert.resolved = true;
      alert.resolvedAt = new Date().toISOString();
      
      this.logger.info(`Alert resolved: ${alertId}`);
      this.io.emit('alertResolved', alert);
      
      return true;
    }
    return false;
  }
  
  getActiveAlerts() {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  getAllAlerts() {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  getAlertsByNode(nodeId) {
    return Array.from(this.alerts.values())
      .filter(alert => alert.nodeId === nodeId)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  getAlertsBySeverity(severity) {
    return Array.from(this.alerts.values())
      .filter(alert => alert.severity === severity && !alert.resolved)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }
  
  addCustomRule(rule) {
    this.alertRules.push(rule);
    this.logger.info(`Custom alert rule added: ${rule.name}`);
  }
  
  removeCustomRule(ruleId) {
    this.alertRules = this.alertRules.filter(rule => rule.id !== ruleId);
    this.logger.info(`Custom alert rule removed: ${ruleId}`);
  }
  
  isHealthy() {
    return true; // AlertManager is always healthy
  }
  
  getStats() {
    const alerts = Array.from(this.alerts.values());
    return {
      total: alerts.length,
      active: alerts.filter(a => !a.resolved).length,
      acknowledged: alerts.filter(a => a.acknowledged && !a.resolved).length,
      resolved: alerts.filter(a => a.resolved).length,
      bySeverity: {
        critical: alerts.filter(a => a.severity === 'critical' && !a.resolved).length,
        warning: alerts.filter(a => a.severity === 'warning' && !a.resolved).length,
        info: alerts.filter(a => a.severity === 'info' && !a.resolved).length
      }
    };
  }
}

module.exports = AlertManager;
