# CloudPulse Agent

The CloudPulse Agent is a Go-based service that runs on each node in your infrastructure to collect real-time system metrics.

## Features

- **Real-time Metrics Collection**: CPU usage, memory utilization, network I/O
- **RESTful API**: Exposes metrics via HTTP endpoints
- **Lightweight**: Minimal resource footprint
- **Cross-platform**: Works on Linux, macOS, and Windows

## API Endpoints

- `GET /metrics` - Returns current system metrics
- `GET /health` - Health check endpoint

## Environment Variables

- `NODE_ID` - Unique identifier for the node (defaults to hostname)
- `PORT` - Port to run the agent on (defaults to 8080)

## Building and Running

```bash
# Build the agent
go build -o cloudpulse-agent main.go

# Run with default settings
./cloudpulse-agent

# Run with custom node ID and port
NODE_ID=node-1 PORT=8080 ./cloudpulse-agent
```

## Docker

```bash
# Build Docker image
docker build -t cloudpulse-agent .

# Run container
docker run -d --name cloudpulse-agent \
  -p 8080:8080 \
  -e NODE_ID=node-1 \
  cloudpulse-agent
```

## Metrics Format

The `/metrics` endpoint returns JSON data in the following format:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "node_id": "node-1",
  "cpu": {
    "usage_percent": 45.2,
    "load_avg": [1.2, 1.5, 1.8],
    "cores": 8
  },
  "memory": {
    "total": 8589934592,
    "available": 4294967296,
    "used": 4294967296,
    "used_percent": 50.0
  },
  "network": {
    "bytes_sent": 1024000,
    "bytes_recv": 2048000,
    "packets_sent": 1500,
    "packets_recv": 2000
  }
}
```
