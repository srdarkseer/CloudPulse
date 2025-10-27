# CloudPulse — Server Resource Forecasting & Auto-Scaler

CloudPulse is an intelligent server resource forecasting and auto-scaling system that predicts future CPU/memory/network load using machine learning models and automatically scales container clusters (Docker/Kubernetes) accordingly.

## 🚀 Features

- **🔮 Predictive Scaling**: Forecast resource needs before bottlenecks occur
- **📊 Real-time Monitoring**: Continuous collection of node metrics
- **🚨 Intelligent Alerts**: ML-driven alerting based on predicted trends
- **🔄 Auto-scaling**: Dynamic scaling with Docker and Kubernetes
- **📈 Interactive Dashboard**: Modern web interface with real-time updates
- **🤖 ML Models**: LSTM and Prophet forecasting models
- **🔧 Multi-platform**: Works with Docker and Kubernetes

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Go Agent      │    │   Go Agent      │    │   Go Agent      │
│   (Node 1)      │    │   (Node 2)      │    │   (Node N)      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │     Node.js Dashboard     │
                    │   (Central Controller)   │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │    Python ML Service      │
                    │  (LSTM + Prophet Models) │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   Docker/Kubernetes       │
                    │    (Auto-scaling)         │
                    └───────────────────────────┘
```

## 🛠️ Tech Stack

- **Go**: High-performance agent for metric collection
- **Python**: Machine learning models (LSTM, Prophet)
- **Node.js**: Web dashboard and API
- **Docker/Kubernetes**: Container orchestration and scaling
- **Prometheus/Grafana**: Monitoring and visualization

## 📁 Project Structure

```
CloudPulse/
├── agent/              # Go agent for metric collection
│   ├── main.go         # Main agent application
│   ├── Dockerfile      # Agent container image
│   └── README.md       # Agent documentation
├── ml-models/          # Python ML forecasting models
│   ├── lstm_forecaster.py      # LSTM model implementation
│   ├── prophet_forecaster.py  # Prophet model implementation
│   ├── ml_service.py          # ML service orchestrator
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # ML service container
│   └── README.md              # ML models documentation
├── dashboard/          # Node.js dashboard and API
│   ├── server.js              # Main dashboard server
│   ├── services/              # Service modules
│   │   ├── AlertManager.js    # Alert management
│   │   ├── DataCollector.js   # Metrics collection
│   │   ├── ForecastService.js # Forecast integration
│   │   └── ScalingService.js  # Auto-scaling
│   ├── public/                # Web interface
│   │   └── index.html         # Dashboard UI
│   ├── package.json           # Node.js dependencies
│   ├── Dockerfile             # Dashboard container
│   └── README.md              # Dashboard documentation
├── docker/             # Docker configurations
│   ├── docker-compose.yml     # Complete stack
│   └── README.md              # Docker documentation
├── k8s/               # Kubernetes manifests
│   ├── cloudpulse-deployment.yaml    # Core services
│   ├── cloudpulse-autoscaling.yaml   # Auto-scaling
│   ├── cloudpulse-monitoring.yaml    # Monitoring stack
│   └── README.md                      # K8s documentation
└── README.md          # This file
```

## 🚀 Quick Start

### Docker Compose (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/your-org/cloudpulse.git
cd cloudpulse

# Start all services
docker-compose -f docker/docker-compose.yml up -d

# Access the dashboard
open http://localhost:3000
```

### Kubernetes (Production)

```bash
# Deploy to Kubernetes
kubectl apply -f k8s/cloudpulse-deployment.yaml
kubectl apply -f k8s/cloudpulse-autoscaling.yaml

# Access the dashboard
kubectl get svc -n cloudpulse
```

## 📊 Dashboard

The CloudPulse dashboard provides:

- **Real-time Metrics**: Live CPU, memory, and network usage
- **Forecast Visualization**: ML model predictions and trends
- **Alert Management**: Configurable alerts with acknowledgment
- **Scaling Control**: Manual and automated scaling operations
- **Node Status**: Health monitoring of all nodes

Access the dashboard at `http://localhost:3000` (Docker) or via LoadBalancer (Kubernetes).

## 🔧 Configuration

### Environment Variables

#### Agent
- `NODE_ID`: Unique node identifier
- `PORT`: Agent port (default: 8080)

#### ML Service
- `AGENT_ENDPOINTS`: Comma-separated agent URLs
- `MODEL_SAVE_PATH`: Path to save models
- `FORECAST_INTERVAL_MINUTES`: Forecast update interval

#### Dashboard
- `AGENT_ENDPOINTS`: Agent endpoints
- `ML_SERVICE_URL`: ML service URL
- `CORS_ORIGIN`: CORS configuration

### Scaling Rules

Configure auto-scaling rules:

```yaml
apiVersion: cloudpulse.io/v1
kind: ScalingRule
metadata:
  name: cpu-scale-rule
spec:
  nodeId: "node-1"
  metric: "cpu_usage"
  threshold: 80
  action: "scale_up"
  replicas: 2
  cooldown: 300
```

## 📈 Monitoring

### Built-in Monitoring

- **Health Checks**: All services include health endpoints
- **Metrics**: Prometheus-compatible metrics
- **Logs**: Structured logging with Winston
- **Alerts**: Configurable alerting rules

### External Monitoring

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and notifications

## 🔍 API Reference

### Agent API
- `GET /metrics` - Current system metrics
- `GET /health` - Health check

### Dashboard API
- `GET /api/metrics` - Aggregated metrics
- `GET /api/forecasts` - ML predictions
- `GET /api/alerts` - Active alerts
- `POST /api/scale` - Manual scaling

### ML Service API
- `GET /api/forecasts` - Get predictions
- `POST /api/forecast` - Generate forecasts
- `GET /api/anomalies` - Detected anomalies

## 🧪 Testing

```bash
# Test individual components
cd agent && go test
cd ml-models && python -m pytest
cd dashboard && npm test

# Integration tests
docker-compose -f docker/docker-compose.yml up -d
# Run tests against running services
```

## 🚀 Deployment

### Development
```bash
docker-compose -f docker/docker-compose.yml up -d
```

### Production (Kubernetes)
```bash
kubectl apply -f k8s/cloudpulse-deployment.yaml
kubectl apply -f k8s/cloudpulse-autoscaling.yaml
kubectl apply -f k8s/cloudpulse-monitoring.yaml
```

### Scaling
```bash
# Scale ML service
kubectl scale deployment cloudpulse-ml --replicas=3 -n cloudpulse

# Scale dashboard
kubectl scale deployment cloudpulse-dashboard --replicas=2 -n cloudpulse
```

## 🔧 Troubleshooting

### Common Issues

1. **Agent not collecting metrics**
   - Check host network configuration
   - Verify volume mounts for /proc, /sys
   - Check node tolerations

2. **ML service failing to start**
   - Verify persistent volume claims
   - Check resource limits
   - Review model training logs

3. **Dashboard not accessible**
   - Check LoadBalancer service status
   - Verify CORS configuration
   - Check WebSocket connectivity

### Debug Commands

```bash
# Check pod status
kubectl get pods -n cloudpulse

# View logs
kubectl logs -f deployment/cloudpulse-ml -n cloudpulse

# Check services
kubectl get svc -n cloudpulse

# Check HPA status
kubectl get hpa -n cloudpulse
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

### Development Setup

```bash
# Install dependencies
cd agent && go mod download
cd ml-models && pip install -r requirements.txt
cd dashboard && npm install

# Run locally
cd agent && go run main.go
cd ml-models && python ml_service.py
cd dashboard && npm run dev
```

## 📚 Documentation

- [Agent Documentation](agent/README.md)
- [ML Models Documentation](ml-models/README.md)
- [Dashboard Documentation](dashboard/README.md)
- [Docker Documentation](docker/README.md)
- [Kubernetes Documentation](k8s/README.md)

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Prometheus](https://prometheus.io/) for metrics collection
- [Grafana](https://grafana.com/) for visualization
- [Prophet](https://facebook.github.io/prophet/) for time series forecasting
- [TensorFlow](https://tensorflow.org/) for deep learning models

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/cloudpulse/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/cloudpulse/discussions)
- **Documentation**: [Wiki](https://github.com/your-org/cloudpulse/wiki)

---

**CloudPulse** - Intelligent server resource forecasting and auto-scaling 🚀
