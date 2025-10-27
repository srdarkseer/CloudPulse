# CloudPulse Dashboard

The CloudPulse Dashboard is a Node.js-based central monitoring and alerting system that provides real-time visualization of system metrics, forecasts, and automated scaling operations.

## Features

- **Real-time Monitoring**: Live updates of CPU, memory, and network metrics
- **Interactive Dashboard**: Modern web interface with charts and visualizations
- **Alert Management**: Configurable alerting rules with acknowledgment system
- **Forecast Visualization**: Display ML model predictions and trends
- **Auto-scaling Control**: Manual and automated scaling operations
- **WebSocket Support**: Real-time updates using Socket.IO
- **RESTful API**: Complete API for external integrations

## Architecture

The dashboard consists of several key services:

- **AlertManager**: Manages alerting rules and notifications
- **DataCollector**: Collects metrics from agent endpoints
- **ForecastService**: Integrates with ML service for predictions
- **ScalingService**: Handles auto-scaling operations

## Installation

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration
```

## Configuration

Create a `.env` file with the following variables:

```env
PORT=3000
AGENT_ENDPOINTS=http://node1:8080,http://node2:8080
ML_SERVICE_URL=http://localhost:5000
CORS_ORIGIN=http://localhost:3000
NODE_ENV=production
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Docker

```bash
# Build image
docker build -t cloudpulse-dashboard .

# Run container
docker run -d --name cloudpulse-dashboard \
  -p 3000:3000 \
  -e AGENT_ENDPOINTS=http://agent1:8080,http://agent2:8080 \
  -e ML_SERVICE_URL=http://ml-service:5000 \
  cloudpulse-dashboard
```

## API Endpoints

### Health Check
- `GET /health` - System health status

### Metrics
- `GET /api/metrics` - Get current metrics from all nodes
- `GET /api/nodes` - Get node status information

### Forecasts
- `GET /api/forecasts` - Get current forecasts from ML service

### Alerts
- `GET /api/alerts` - Get active alerts
- `POST /api/alerts/:id/acknowledge` - Acknowledge an alert

### Scaling
- `POST /api/scale` - Manually scale a node
  ```json
  {
    "nodeId": "node-1",
    "action": "scale_up",
    "replicas": 2
  }
  ```

## WebSocket Events

The dashboard uses Socket.IO for real-time updates:

### Client Events
- `connect` - Client connected
- `disconnect` - Client disconnected

### Server Events
- `initialData` - Initial dashboard data
- `metricsUpdate` - Updated metrics from agents
- `forecastUpdate` - Updated forecasts from ML service
- `newAlerts` - New alerts triggered
- `alertAcknowledged` - Alert acknowledged
- `healthUpdate` - System health update

## Alert Rules

The dashboard includes built-in alert rules:

- **High CPU Usage**: CPU > 80%
- **Critical CPU Usage**: CPU > 95%
- **High Memory Usage**: Memory > 85%
- **Critical Memory Usage**: Memory > 95%
- **Node Down**: Node not responding

## Customization

### Adding Custom Alert Rules

```javascript
const alertManager = new AlertManager(io);

alertManager.addCustomRule({
  id: 'custom_rule',
  name: 'Custom Alert',
  condition: (metrics) => metrics.custom_metric > threshold,
  severity: 'warning',
  message: 'Custom alert triggered'
});
```

### Adding Custom Scaling Rules

```javascript
const scalingService = new ScalingService();

scalingService.addScalingRule({
  id: 'custom_scale',
  name: 'Custom Scale Rule',
  condition: (metrics) => metrics.custom_metric > threshold,
  action: 'scale_up',
  target: 'custom',
  replicas: 2
});
```

## Monitoring and Logging

The dashboard includes comprehensive logging:

- **Winston Logger**: Structured logging with multiple transports
- **Log Files**: Stored in `logs/` directory
- **Console Output**: Development-friendly console logging
- **Error Tracking**: Detailed error logging and stack traces

## Security Features

- **Helmet**: Security headers and protection
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: API rate limiting to prevent abuse
- **Input Validation**: Request validation using express-validator

## Performance

- **Compression**: Gzip compression for responses
- **Caching**: Intelligent caching of metrics and forecasts
- **Connection Pooling**: Efficient HTTP client connections
- **Memory Management**: Optimized memory usage

## Troubleshooting

### Common Issues

1. **Dashboard not loading**
   - Check if all services are running
   - Verify environment variables
   - Check network connectivity

2. **No metrics displayed**
   - Ensure agent endpoints are accessible
   - Check agent health status
   - Verify data collection configuration

3. **Forecasts not updating**
   - Check ML service connectivity
   - Verify forecast service configuration
   - Check model training status

### Logs

Check the following log files for debugging:

- `logs/combined.log` - All application logs
- `logs/error.log` - Error logs only
- `logs/alerts.log` - Alert-specific logs
- `logs/data-collector.log` - Data collection logs
- `logs/forecast-service.log` - Forecast service logs
- `logs/scaling-service.log` - Scaling service logs

## Development

### Project Structure

```
dashboard/
├── server.js              # Main server file
├── services/              # Service modules
│   ├── AlertManager.js    # Alert management
│   ├── DataCollector.js   # Metrics collection
│   ├── ForecastService.js # Forecast integration
│   └── ScalingService.js  # Auto-scaling
├── public/                # Static files
│   └── index.html         # Dashboard UI
├── logs/                  # Log files
└── package.json           # Dependencies
```

### Adding New Features

1. Create service module in `services/`
2. Add API endpoints in `server.js`
3. Update frontend in `public/index.html`
4. Add WebSocket events if needed
5. Update documentation

## License

MIT License
