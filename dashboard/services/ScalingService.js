const axios = require('axios');
const winston = require('winston');

class ScalingService {
  constructor() {
    this.scalingHistory = [];
    this.scalingRules = [
      {
        id: 'cpu_scale_up',
        name: 'CPU Scale Up',
        condition: (metrics) => metrics.cpu?.usage_percent > 80,
        action: 'scale_up',
        target: 'cpu',
        replicas: 2
      },
      {
        id: 'cpu_scale_down',
        name: 'CPU Scale Down',
        condition: (metrics) => metrics.cpu?.usage_percent < 20,
        action: 'scale_down',
        target: 'cpu',
        replicas: 1
      },
      {
        id: 'memory_scale_up',
        name: 'Memory Scale Up',
        condition: (metrics) => metrics.memory?.used_percent > 85,
        action: 'scale_up',
        target: 'memory',
        replicas: 2
      }
    ];
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/scaling-service.log' }),
        new winston.transports.Console()
      ]
    });
  }
  
  async scaleNode(nodeId, action, replicas) {
    try {
      const scalingAction = {
        id: `scale_${nodeId}_${Date.now()}`,
        nodeId,
        action,
        replicas,
        timestamp: new Date().toISOString(),
        status: 'pending'
      };
      
      this.scalingHistory.push(scalingAction);
      
      // Simulate scaling operation
      // In a real implementation, this would call Kubernetes API or Docker API
      const result = await this.executeScaling(nodeId, action, replicas);
      
      scalingAction.status = result.success ? 'completed' : 'failed';
      scalingAction.result = result;
      
      this.logger.info(`Scaling ${action} for node ${nodeId}`, {
        actionId: scalingAction.id,
        replicas,
        result
      });
      
      return scalingAction;
    } catch (error) {
      this.logger.error(`Failed to scale node ${nodeId}:`, error.message);
      throw error;
    }
  }
  
  async executeScaling(nodeId, action, replicas) {
    // Simulate scaling operation
    // In a real implementation, this would:
    // 1. Call Kubernetes API to scale deployments
    // 2. Call Docker API to scale containers
    // 3. Update load balancer configurations
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          success: true,
          message: `Successfully ${action}ed node ${nodeId} to ${replicas} replicas`,
          replicas,
          timestamp: new Date().toISOString()
        });
      }, 1000);
    });
  }
  
  async checkScalingRules(metrics) {
    const triggeredRules = [];
    
    for (const rule of this.scalingRules) {
      for (const nodeMetrics of metrics) {
        if (rule.condition(nodeMetrics)) {
          triggeredRules.push({
            rule,
            nodeId: nodeMetrics.node_id,
            metrics: nodeMetrics,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    return triggeredRules;
  }
  
  async autoScale(metrics) {
    const triggeredRules = await this.checkScalingRules(metrics);
    const scalingActions = [];
    
    for (const triggeredRule of triggeredRules) {
      try {
        const action = await this.scaleNode(
          triggeredRule.nodeId,
          triggeredRule.rule.action,
          triggeredRule.rule.replicas
        );
        
        scalingActions.push(action);
        
        this.logger.info(`Auto-scaling triggered for node ${triggeredRule.nodeId}`, {
          rule: triggeredRule.rule.name,
          action: triggeredRule.rule.action,
          replicas: triggeredRule.rule.replicas
        });
      } catch (error) {
        this.logger.error(`Auto-scaling failed for node ${triggeredRule.nodeId}:`, error.message);
      }
    }
    
    return scalingActions;
  }
  
  getScalingHistory(limit = 50) {
    return this.scalingHistory
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }
  
  getScalingStats() {
    const total = this.scalingHistory.length;
    const completed = this.scalingHistory.filter(a => a.status === 'completed').length;
    const failed = this.scalingHistory.filter(a => a.status === 'failed').length;
    const pending = this.scalingHistory.filter(a => a.status === 'pending').length;
    
    return {
      total,
      completed,
      failed,
      pending,
      successRate: total > 0 ? (completed / total) * 100 : 0
    };
  }
  
  addScalingRule(rule) {
    this.scalingRules.push(rule);
    this.logger.info(`Scaling rule added: ${rule.name}`);
  }
  
  removeScalingRule(ruleId) {
    this.scalingRules = this.scalingRules.filter(rule => rule.id !== ruleId);
    this.logger.info(`Scaling rule removed: ${ruleId}`);
  }
  
  async getNodeStatus(nodeId) {
    // Simulate getting current node status
    // In a real implementation, this would query Kubernetes or Docker
    return {
      nodeId,
      replicas: 1,
      status: 'running',
      lastScaling: this.scalingHistory
        .filter(a => a.nodeId === nodeId)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
    };
  }
  
  isHealthy() {
    // Check if scaling service is operational
    return true;
  }
  
  getHealthStats() {
    return {
      isHealthy: this.isHealthy(),
      totalRules: this.scalingRules.length,
      scalingStats: this.getScalingStats()
    };
  }
}

module.exports = ScalingService;
