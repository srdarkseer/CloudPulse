const axios = require('axios');
const winston = require('winston');

class ForecastService {
  constructor(mlServiceUrl) {
    this.mlServiceUrl = mlServiceUrl;
    this.forecastsCache = new Map();
    this.lastUpdate = null;
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/forecast-service.log' }),
        new winston.transports.Console()
      ]
    });
  }
  
  async getForecasts() {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/api/forecasts`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        const forecasts = response.data;
        this.forecastsCache.set('latest', forecasts);
        this.lastUpdate = new Date().toISOString();
        
        this.logger.info('Forecasts retrieved successfully');
        return forecasts;
      }
    } catch (error) {
      this.logger.error('Failed to retrieve forecasts:', error.message);
      
      // Return cached forecasts if available
      if (this.forecastsCache.has('latest')) {
        this.logger.warn('Returning cached forecasts due to service error');
        return this.forecastsCache.get('latest');
      }
      
      throw error;
    }
  }
  
  async updateForecasts() {
    try {
      const response = await axios.post(`${this.mlServiceUrl}/api/forecast`, {
        steps: 24,
        models: ['lstm', 'prophet']
      }, {
        timeout: 30000
      });
      
      if (response.status === 200) {
        const forecasts = response.data;
        this.forecastsCache.set('latest', forecasts);
        this.lastUpdate = new Date().toISOString();
        
        this.logger.info('Forecasts updated successfully');
        return forecasts;
      }
    } catch (error) {
      this.logger.error('Failed to update forecasts:', error.message);
      throw error;
    }
  }
  
  getLatestForecasts() {
    return this.forecastsCache.get('latest') || null;
  }
  
  async getForecastForNode(nodeId) {
    const forecasts = await this.getForecasts();
    
    if (!forecasts || !forecasts[nodeId]) {
      return null;
    }
    
    return forecasts[nodeId];
  }
  
  async getForecastSummary() {
    const forecasts = await this.getForecasts();
    
    if (!forecasts) {
      return null;
    }
    
    const summary = {
      timestamp: this.lastUpdate,
      nodes: Object.keys(forecasts).length,
      predictions: {}
    };
    
    // Calculate summary statistics for each metric
    const metrics = ['cpu_usage', 'memory_usage', 'network_io'];
    
    for (const metric of metrics) {
      const values = [];
      
      for (const nodeId in forecasts) {
        const nodeForecasts = forecasts[nodeId];
        if (nodeForecasts && nodeForecasts[metric]) {
          values.push(...nodeForecasts[metric].map(p => p.predicted));
        }
      }
      
      if (values.length > 0) {
        summary.predictions[metric] = {
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          max: Math.max(...values),
          min: Math.min(...values),
          trend: this.calculateTrend(values)
        };
      }
    }
    
    return summary;
  }
  
  calculateTrend(values) {
    if (values.length < 2) return 'stable';
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = ((secondAvg - firstAvg) / firstAvg) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }
  
  async getAnomalies() {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/api/anomalies`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      this.logger.error('Failed to retrieve anomalies:', error.message);
      return [];
    }
  }
  
  async getModelPerformance() {
    try {
      const response = await axios.get(`${this.mlServiceUrl}/api/model-performance`, {
        timeout: 10000
      });
      
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      this.logger.error('Failed to retrieve model performance:', error.message);
      return null;
    }
  }
  
  isHealthy() {
    // Check if we can reach the ML service
    return this.lastUpdate && 
           (new Date() - new Date(this.lastUpdate)) < 10 * 60 * 1000; // 10 minutes
  }
  
  getHealthStats() {
    return {
      lastUpdate: this.lastUpdate,
      cacheSize: this.forecastsCache.size,
      isHealthy: this.isHealthy(),
      mlServiceUrl: this.mlServiceUrl
    };
  }
}

module.exports = ForecastService;
