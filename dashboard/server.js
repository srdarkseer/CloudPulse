const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const axios = require('axios');
const winston = require('winston');
require('dotenv').config();

const AlertManager = require('./services/AlertManager');
const DataCollector = require('./services/DataCollector');
const ForecastService = require('./services/ForecastService');
const ScalingService = require('./services/ScalingService');

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cloudpulse-dashboard' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

class CloudPulseDashboard {
  constructor() {
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server, {
      cors: {
        origin: process.env.CORS_ORIGIN || "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.port = process.env.PORT || 3000;
    this.agentEndpoints = process.env.AGENT_ENDPOINTS?.split(',') || [];
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:5000';
    
    // Initialize services
    this.alertManager = new AlertManager(this.io);
    this.dataCollector = new DataCollector(this.agentEndpoints);
    this.forecastService = new ForecastService(this.mlServiceUrl);
    this.scalingService = new ScalingService();
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
    this.setupScheduledTasks();
  }
  
  setupMiddleware() {
    // Security middleware with CSP disabled for development
    this.app.use(helmet({
      contentSecurityPolicy: false,
    }));
    this.app.use(cors());
    this.app.use(compression());
    
    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // limit each IP to 100 requests per windowMs
    });
    this.app.use(limiter);
    
    // Logging
    this.app.use(morgan('combined', {
      stream: { write: message => logger.info(message.trim()) }
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }
  
  setupRoutes() {
    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          alertManager: this.alertManager.isHealthy(),
          dataCollector: this.dataCollector.isHealthy(),
          forecastService: this.forecastService.isHealthy(),
          scalingService: this.scalingService.isHealthy()
        }
      });
    });
    
    // API routes
    this.app.get('/api/metrics', async (req, res) => {
      try {
        const metrics = await this.dataCollector.getAllMetrics();
        res.json(metrics);
      } catch (error) {
        logger.error('Error fetching metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
      }
    });
    
    this.app.get('/api/forecasts', async (req, res) => {
      try {
        const forecasts = await this.forecastService.getForecasts();
        res.json(forecasts);
      } catch (error) {
        logger.error('Error fetching forecasts:', error);
        res.status(500).json({ error: 'Failed to fetch forecasts' });
      }
    });
    
    this.app.get('/api/alerts', (req, res) => {
      const alerts = this.alertManager.getActiveAlerts();
      res.json(alerts);
    });
    
    this.app.post('/api/alerts/:id/acknowledge', (req, res) => {
      const { id } = req.params;
      const success = this.alertManager.acknowledgeAlert(id);
      if (success) {
        res.json({ message: 'Alert acknowledged' });
      } else {
        res.status(404).json({ error: 'Alert not found' });
      }
    });
    
    this.app.get('/api/nodes', async (req, res) => {
      try {
        const nodes = await this.dataCollector.getNodeStatus();
        res.json(nodes);
      } catch (error) {
        logger.error('Error fetching node status:', error);
        res.status(500).json({ error: 'Failed to fetch node status' });
      }
    });
    
    this.app.post('/api/scale', async (req, res) => {
      try {
        const { nodeId, action, replicas } = req.body;
        const result = await this.scalingService.scaleNode(nodeId, action, replicas);
        res.json(result);
      } catch (error) {
        logger.error('Error scaling node:', error);
        res.status(500).json({ error: 'Failed to scale node' });
      }
    });
    
    // Serve static files
    this.app.use(express.static('public'));
    
    // Catch-all handler for SPA
    this.app.get('*', (req, res) => {
      res.sendFile(__dirname + '/public/index.html');
    });
  }
  
  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);
      
      // Send initial data
      socket.emit('initialData', {
        metrics: this.dataCollector.getLatestMetrics(),
        alerts: this.alertManager.getActiveAlerts(),
        forecasts: this.forecastService.getLatestForecasts()
      });
      
      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });
  }
  
  setupScheduledTasks() {
    // Collect metrics every 30 seconds
    cron.schedule('*/30 * * * * *', async () => {
      try {
        const metrics = await this.dataCollector.collectMetrics();
        this.io.emit('metricsUpdate', metrics);
        
        // Check for alerts
        const alerts = await this.alertManager.checkAlerts(metrics);
        if (alerts.length > 0) {
          this.io.emit('newAlerts', alerts);
        }
      } catch (error) {
        logger.error('Error in metrics collection task:', error);
      }
    });
    
    // Update forecasts every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      try {
        const forecasts = await this.forecastService.updateForecasts();
        this.io.emit('forecastUpdate', forecasts);
      } catch (error) {
        logger.error('Error in forecast update task:', error);
      }
    });
    
    // Health check every minute
    cron.schedule('* * * * *', async () => {
      try {
        const health = await this.checkSystemHealth();
        this.io.emit('healthUpdate', health);
      } catch (error) {
        logger.error('Error in health check task:', error);
      }
    });
  }
  
  async checkSystemHealth() {
    const health = {
      timestamp: new Date().toISOString(),
      services: {
        alertManager: this.alertManager.isHealthy(),
        dataCollector: this.dataCollector.isHealthy(),
        forecastService: this.forecastService.isHealthy(),
        scalingService: this.scalingService.isHealthy()
      },
      nodes: await this.dataCollector.getNodeStatus()
    };
    
    return health;
  }
  
  start() {
    this.server.listen(this.port, () => {
      logger.info(`CloudPulse Dashboard running on port ${this.port}`);
      logger.info(`Agent endpoints: ${this.agentEndpoints.join(', ')}`);
      logger.info(`ML Service URL: ${this.mlServiceUrl}`);
    });
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the dashboard
const dashboard = new CloudPulseDashboard();
dashboard.start();

module.exports = CloudPulseDashboard;
