# CloudPulse - Getting Started Guide

This guide will help you get CloudPulse up and running quickly.

## Prerequisites

- Docker and Docker Compose
- Kubernetes cluster (for production deployment)
- kubectl configured (for Kubernetes deployment)

## Quick Start with Docker Compose

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/cloudpulse.git
cd cloudpulse
```

### 2. Start All Services

```bash
docker-compose -f docker/docker-compose.yml up -d
```

### 3. Access the Dashboard

Open your browser and navigate to `http://localhost:3000`

### 4. Verify Services

Check that all services are running:

```bash
docker-compose -f docker/docker-compose.yml ps
```

## Production Deployment with Kubernetes

### 1. Build and Push Images

```bash
# Build images
docker build -t cloudpulse-agent:latest ./agent
docker build -t cloudpulse-ml:latest ./ml-models
docker build -t cloudpulse-dashboard:latest ./dashboard

# Push to your registry
docker tag cloudpulse-agent:latest your-registry/cloudpulse-agent:latest
docker tag cloudpulse-ml:latest your-registry/cloudpulse-ml:latest
docker tag cloudpulse-dashboard:latest your-registry/cloudpulse-dashboard:latest

docker push your-registry/cloudpulse-agent:latest
docker push your-registry/cloudpulse-ml:latest
docker push your-registry/cloudpulse-dashboard:latest
```

### 2. Deploy to Kubernetes

```bash
# Deploy core services
kubectl apply -f k8s/cloudpulse-deployment.yaml

# Deploy autoscaling
kubectl apply -f k8s/cloudpulse-autoscaling.yaml

# Deploy monitoring (optional)
kubectl apply -f k8s/cloudpulse-monitoring.yaml
```

### 3. Check Deployment Status

```bash
kubectl get pods -n cloudpulse
kubectl get svc -n cloudpulse
kubectl get hpa -n cloudpulse
```

### 4. Access the Dashboard

```bash
# Get LoadBalancer IP
kubectl get svc cloudpulse-dashboard-service -n cloudpulse

# Or use port-forward for testing
kubectl port-forward svc/cloudpulse-dashboard-service 3000:3000 -n cloudpulse
```

## Configuration

### Environment Variables

Create a `.env` file for local development:

```env
# Agent Configuration
NODE_ID=node-1
PORT=8080

# ML Service Configuration
AGENT_ENDPOINTS=http://cloudpulse-agent:8080
MODEL_SAVE_PATH=/app/models
FORECAST_INTERVAL_MINUTES=5

# Dashboard Configuration
AGENT_ENDPOINTS=http://cloudpulse-agent:8080
ML_SERVICE_URL=http://cloudpulse-ml:5000
CORS_ORIGIN=http://localhost:3000
NODE_ENV=development
```

### Scaling Rules

Configure auto-scaling rules in Kubernetes:

```yaml
apiVersion: cloudpulse.io/v1
kind: ScalingRule
metadata:
  name: cpu-scale-rule
  namespace: cloudpulse
spec:
  nodeId: "node-1"
  metric: "cpu_usage"
  threshold: 80
  action: "scale_up"
  replicas: 2
  cooldown: 300
```

## Monitoring

### Built-in Health Checks

All services expose health endpoints:

- Agent: `http://localhost:8080/health`
- ML Service: `http://localhost:5000/health`
- Dashboard: `http://localhost:3000/health`

### Prometheus Metrics

CloudPulse exposes Prometheus-compatible metrics:

- `cloudpulse_cpu_usage_percent`
- `cloudpulse_memory_usage_percent`
- `cloudpulse_network_bytes_total`
- `cloudpulse_forecast_accuracy`

### Grafana Dashboards

Access Grafana at `http://localhost:3000` (if monitoring stack is deployed):

- Username: `admin`
- Password: `admin`

## Troubleshooting

### Common Issues

1. **Services not starting**
   ```bash
   # Check logs
   docker-compose -f docker/docker-compose.yml logs
   
   # Check Kubernetes pods
   kubectl logs -f deployment/cloudpulse-ml -n cloudpulse
   ```

2. **Dashboard not accessible**
   ```bash
   # Check service status
   kubectl get svc -n cloudpulse
   
   # Check pod status
   kubectl get pods -n cloudpulse
   ```

3. **ML models not training**
   ```bash
   # Check ML service logs
   kubectl logs -f deployment/cloudpulse-ml -n cloudpulse
   
   # Check persistent volume
   kubectl get pvc -n cloudpulse
   ```

### Debug Commands

```bash
# Docker Compose
docker-compose -f docker/docker-compose.yml logs -f
docker-compose -f docker/docker-compose.yml exec cloudpulse-dashboard sh

# Kubernetes
kubectl get all -n cloudpulse
kubectl describe pod <pod-name> -n cloudpulse
kubectl logs -f deployment/cloudpulse-dashboard -n cloudpulse
```

## Next Steps

1. **Configure Alerting**: Set up alert rules for your environment
2. **Customize Scaling**: Adjust scaling thresholds and rules
3. **Monitor Performance**: Set up Grafana dashboards
4. **Scale Testing**: Test auto-scaling with load generation
5. **Production Hardening**: Implement security and backup strategies

## Support

- **Documentation**: Check individual component READMEs
- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Join GitHub Discussions for questions
- **Wiki**: Check the project Wiki for additional resources
