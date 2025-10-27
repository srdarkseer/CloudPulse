# CloudPulse — Server Resource Forecasting & Auto-Scaler

CloudPulse is an intelligent server resource forecasting and auto-scaling system that predicts future CPU/memory/network load using machine learning models and automatically scales container clusters (Docker/Kubernetes) accordingly.

## Architecture

- **Go Agent**: Runs on each node collecting real-time metrics (CPU, memory, network)
- **Python ML Models**: LSTM and Prophet models for forecasting resource usage
- **Node.js Dashboard**: Central dashboard and alerting system
- **Auto-scaling**: Integration with Docker and Kubernetes for dynamic scaling

## Why CloudPulse?

CloudPulse bridges the gap between monitoring tools like Prometheus and Kubernetes autoscaler by adding ML-powered forecasting capabilities. It provides:

- **Predictive Scaling**: Forecast resource needs before bottlenecks occur
- **Real-time Monitoring**: Continuous collection of node metrics
- **Intelligent Alerts**: ML-driven alerting based on predicted trends
- **Multi-platform Support**: Works with Docker and Kubernetes

## Tech Stack

- **Go**: High-performance agent for metric collection
- **Python**: Machine learning models (LSTM, Prophet)
- **Node.js**: Web dashboard and API
- **Docker/Kubernetes**: Container orchestration and scaling

## Project Structure

```
CloudPulse/
├── agent/          # Go agent for metric collection
├── ml-models/      # Python ML forecasting models
├── dashboard/      # Node.js dashboard and API
├── docker/         # Docker configurations
├── k8s/           # Kubernetes manifests
└── docs/          # Documentation
```

## Getting Started

See individual component READMEs for detailed setup instructions.

## License

MIT License
