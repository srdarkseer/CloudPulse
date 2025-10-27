# CloudPulse Docker and Kubernetes Integration

This directory contains Docker and Kubernetes configurations for deploying CloudPulse in containerized environments.

## Docker Compose

The `docker-compose.yml` file provides a complete CloudPulse stack for development and testing:

### Services

- **cloudpulse-agent**: Go agent running on each node
- **cloudpulse-ml**: Python ML service for forecasting
- **cloudpulse-dashboard**: Node.js dashboard and API
- **redis**: Optional caching layer

### Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables

- `NODE_ID`: Unique identifier for the agent
- `AGENT_ENDPOINTS`: Comma-separated list of agent endpoints
- `ML_SERVICE_URL`: URL of the ML service
- `MODEL_SAVE_PATH`: Path to save trained models

## Kubernetes Deployment

### Prerequisites

- Kubernetes cluster (v1.19+)
- kubectl configured
- Docker images built and pushed to registry

### Deployment Steps

1. **Create namespace and basic resources**:
   ```bash
   kubectl apply -f k8s/cloudpulse-deployment.yaml
   ```

2. **Deploy autoscaling components**:
   ```bash
   kubectl apply -f k8s/cloudpulse-autoscaling.yaml
   ```

3. **Deploy monitoring stack** (optional):
   ```bash
   kubectl apply -f k8s/cloudpulse-monitoring.yaml
   ```

### Components

#### Core Services

- **DaemonSet**: CloudPulse agent runs on every node
- **Deployments**: ML service and dashboard
- **Services**: ClusterIP services for internal communication
- **LoadBalancer**: External access to dashboard

#### Autoscaling

- **HorizontalPodAutoscaler**: Automatic scaling based on CPU/memory
- **Custom Resources**: Scaling rules and configurations
- **RBAC**: Proper permissions for scaling operations

#### Monitoring

- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and notifications

### Resource Requirements

#### Agent (DaemonSet)
- CPU: 50m-100m
- Memory: 64Mi-128Mi

#### ML Service
- CPU: 200m-1000m
- Memory: 512Mi-2Gi

#### Dashboard
- CPU: 100m-500m
- Memory: 256Mi-512Mi

### Scaling Configuration

#### Horizontal Pod Autoscaler

The HPA automatically scales pods based on:

- **CPU Utilization**: Target 70% for ML service, 60% for dashboard
- **Memory Utilization**: Target 80% for ML service, 70% for dashboard
- **Scaling Behavior**: Gradual scale-up, conservative scale-down

#### Custom Scaling Rules

Define custom scaling rules using the ScalingRule CRD:

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

### Monitoring Integration

#### Prometheus Metrics

CloudPulse exposes metrics in Prometheus format:

- `cloudpulse_cpu_usage_percent`: CPU usage percentage
- `cloudpulse_memory_usage_percent`: Memory usage percentage
- `cloudpulse_network_bytes_total`: Network I/O bytes
- `cloudpulse_forecast_accuracy`: ML model accuracy

#### Grafana Dashboards

Pre-configured dashboards for:

- System overview
- Resource utilization trends
- Forecast accuracy
- Alert status
- Scaling events

### Security

#### RBAC

- **ServiceAccount**: Dedicated service accounts for each component
- **ClusterRole**: Minimal required permissions
- **ClusterRoleBinding**: Bind roles to service accounts

#### Network Policies

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cloudpulse-network-policy
  namespace: cloudpulse
spec:
  podSelector:
    matchLabels:
      app: cloudpulse
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: cloudpulse
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          name: cloudpulse
```

### Troubleshooting

#### Common Issues

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

#### Debug Commands

```bash
# Check pod status
kubectl get pods -n cloudpulse

# View logs
kubectl logs -f deployment/cloudpulse-ml -n cloudpulse

# Check services
kubectl get svc -n cloudpulse

# Check HPA status
kubectl get hpa -n cloudpulse

# Check custom resources
kubectl get scalingrules -n cloudpulse
```

### Production Considerations

#### High Availability

- Deploy multiple replicas of ML service and dashboard
- Use anti-affinity rules to distribute pods
- Configure proper resource limits and requests

#### Backup and Recovery

- Backup ML models regularly
- Use persistent volumes for model storage
- Implement disaster recovery procedures

#### Performance Tuning

- Adjust HPA metrics and thresholds
- Optimize ML model training frequency
- Configure appropriate resource limits

### Development

#### Local Development

```bash
# Build images
docker build -t cloudpulse-agent ./agent
docker build -t cloudpulse-ml ./ml-models
docker build -t cloudpulse-dashboard ./dashboard

# Run with Docker Compose
docker-compose up -d
```

#### Testing

```bash
# Run tests
docker-compose exec cloudpulse-dashboard npm test
docker-compose exec cloudpulse-ml python -m pytest
```

### Contributing

When adding new features:

1. Update Docker configurations
2. Add Kubernetes manifests if needed
3. Update documentation
4. Test in both Docker and Kubernetes environments
5. Update monitoring configurations
