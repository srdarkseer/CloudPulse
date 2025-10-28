# CloudPulse Environment Setup

This guide explains how to set up CloudPulse with proper environment configuration and model management.

## Environment Configuration

### 1. Create Environment File

Copy the example environment file and customize it for your setup:

```bash
cp env.example .env
```

### 2. Edit Environment Variables

Open `.env` and modify the following key variables:

```bash
# Node Configuration
NODE_ID=your-unique-node-id
AGENT_PORT=8080

# ML Service Configuration
ML_SERVICE_PORT=5000
MODEL_SAVE_PATH=/app/models
FORECAST_INTERVAL_MINUTES=5

# Dashboard Configuration
DASHBOARD_PORT=3000
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development

# Security (IMPORTANT: Change these in production!)
JWT_SECRET=your_jwt_secret_key_here_change_this_in_production
API_KEY=your_api_key_here_change_this_in_production
```

### 3. Security Considerations

**⚠️ IMPORTANT**: The `.env` file contains sensitive information and is excluded from Git by default. Never commit this file to version control.

- Change default passwords and secrets
- Use strong, unique values for production
- Consider using a secrets management system for production

## Model Management

### Model Directory Structure

```
ml-models/
├── models/
│   ├── README.md                    # Model documentation
│   ├── lstm_model_metadata.json     # LSTM model metadata
│   ├── prophet_model_metadata.json  # Prophet model metadata
│   ├── backup/                      # Model backups
│   │   └── .gitkeep
│   ├── *.h5                        # LSTM model files (excluded from Git)
│   ├── *.pkl                       # Prophet model files (excluded from Git)
│   └── *.joblib                    # Scikit-learn models (excluded from Git)
```

### Model Training

Models are automatically trained when:

1. **First Run**: The ML service creates initial models
2. **Scheduled Retraining**: Based on `MODEL_RETRAIN_INTERVAL_HOURS`
3. **Manual Trigger**: Via API endpoint

### Model Configuration

Configure model parameters in `.env`:

```bash
# LSTM Configuration
LSTM_SEQUENCE_LENGTH=60
LSTM_HIDDEN_UNITS=50
LSTM_DROPOUT_RATE=0.2
LSTM_EPOCHS=100
LSTM_BATCH_SIZE=32

# Prophet Configuration
PROPHET_GROWTH_MODEL=linear
PROPHET_SEASONALITY_MODE=multiplicative
PROPHET_YEARLY_SEASONALITY=true
PROPHET_WEEKLY_SEASONALITY=true
```

## Running CloudPulse

### 1. Start Services

```bash
# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Check service status
docker-compose -f docker/docker-compose.yml ps
```

### 2. Verify Services

```bash
# Check agent health
curl http://localhost:8080/health

# Check ML service health
curl http://localhost:5001/health

# Check dashboard health
curl http://localhost:3000/health
```

### 3. Access Dashboard

Open your browser and navigate to: http://localhost:3000

## Environment Variables Reference

### Agent Configuration
- `NODE_ID`: Unique identifier for the node
- `AGENT_PORT`: Port for the agent service

### ML Service Configuration
- `ML_SERVICE_PORT`: Port for the ML service
- `MODEL_SAVE_PATH`: Directory to save trained models
- `FORECAST_INTERVAL_MINUTES`: How often to generate forecasts
- `MODEL_RETRAIN_INTERVAL_HOURS`: How often to retrain models

### Dashboard Configuration
- `DASHBOARD_PORT`: Port for the dashboard
- `CORS_ORIGIN`: Allowed CORS origins
- `NODE_ENV`: Environment (development/production)

### Security Configuration
- `JWT_SECRET`: Secret key for JWT tokens
- `API_KEY`: API authentication key
- `ENABLE_AUTH`: Enable authentication
- `ENABLE_RATE_LIMITING`: Enable rate limiting

### Feature Flags
- `ENABLE_FORECASTING`: Enable ML forecasting
- `ENABLE_ANOMALY_DETECTION`: Enable anomaly detection
- `ENABLE_AUTO_SCALING`: Enable auto-scaling
- `ENABLE_ALERTING`: Enable alerting

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Check if ports are already in use
2. **Model Loading Errors**: Ensure models directory has proper permissions
3. **Environment Variables**: Verify `.env` file exists and has correct values
4. **Docker Issues**: Check Docker daemon is running

### Debug Commands

```bash
# View service logs
docker-compose -f docker/docker-compose.yml logs -f

# Check specific service logs
docker logs cloudpulse-agent
docker logs cloudpulse-ml
docker logs cloudpulse-dashboard

# Restart services
docker-compose -f docker/docker-compose.yml restart

# Rebuild and restart
docker-compose -f docker/docker-compose.yml up -d --build
```

## Production Deployment

For production deployment:

1. **Security**: Change all default secrets and passwords
2. **Environment**: Set `NODE_ENV=production`
3. **Monitoring**: Enable proper logging and monitoring
4. **Backup**: Set up model backup strategies
5. **Scaling**: Configure auto-scaling parameters
6. **SSL**: Use HTTPS for all services

## Support

For issues and questions:
- Check the logs for detailed error messages
- Review the configuration in `.env`
- Ensure all required dependencies are installed
- Verify Docker and Docker Compose are working properly
