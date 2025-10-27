# CloudPulse ML Models

The CloudPulse ML Models component provides machine learning-based forecasting for server resource usage using LSTM and Prophet models.

## Features

- **LSTM Forecasting**: Deep learning-based time series forecasting
- **Prophet Forecasting**: Facebook's Prophet for robust time series analysis
- **Ensemble Methods**: Combines predictions from multiple models
- **Anomaly Detection**: Identifies unusual patterns in resource usage
- **Real-time Training**: Continuous model updates with new data

## Models

### LSTM Forecaster (`lstm_forecaster.py`)
- Multi-layer LSTM neural network
- Handles multivariate time series data
- Automatic data scaling and preprocessing
- Configurable sequence length and features

### Prophet Forecaster (`prophet_forecaster.py`)
- Facebook Prophet for time series forecasting
- Handles seasonality and trends automatically
- Provides confidence intervals
- Robust to missing data and outliers

### ML Service (`ml_service.py`)
- Orchestrates data collection and model training
- Schedules periodic forecasting
- Combines predictions from multiple models
- Detects anomalies in real-time

## Installation

```bash
# Install dependencies
pip install -r requirements.txt

# For Prophet, you may need to install additional dependencies
pip install prophet
```

## Usage

### Basic Usage

```python
from ml_service import CloudPulseMLService

# Initialize service
service = CloudPulseMLService(
    agent_endpoints=['http://node1:8080', 'http://node2:8080'],
    model_save_path='./models'
)

# Run forecasting cycle
results = service.run_forecasting_cycle()
print(f"Generated forecasts: {results['forecasts']}")
print(f"Detected anomalies: {results['anomalies']}")
```

### Training Models

```python
from lstm_forecaster import LSTMForecaster
from prophet_forecaster import ProphetForecaster
import pandas as pd

# Prepare your data
df = pd.read_csv('metrics_data.csv')
df['timestamp'] = pd.to_datetime(df['timestamp'])

# Train LSTM model
lstm = LSTMForecaster()
lstm.train(df, epochs=100)
lstm.save_model('./models/lstm_model')

# Train Prophet models
prophet = ProphetForecaster()
prophet.train(df)
prophet.save_models('./models/prophet_model')
```

### Making Predictions

```python
# Load trained models
lstm = LSTMForecaster()
lstm.load_model('./models/lstm_model')

prophet = ProphetForecaster()
prophet.load_models('./models/prophet_model')

# Generate forecasts
lstm_forecast = lstm.predict(df, steps=24)
prophet_forecast = prophet.predict(df, steps=24)
```

## Configuration

Set environment variables for configuration:

- `AGENT_ENDPOINTS`: Comma-separated list of agent endpoints
- `MODEL_SAVE_PATH`: Path to save trained models
- `FORECAST_INTERVAL_MINUTES`: Interval for scheduled forecasting

## Data Format

The models expect data in the following format:

```csv
timestamp,cpu_usage,memory_usage,network_io
2024-01-15 10:00:00,45.2,67.8,1024000
2024-01-15 10:05:00,48.1,68.2,1156000
...
```

## Model Performance

### LSTM Model
- Best for: Short-term predictions (1-24 hours)
- Strengths: Captures complex patterns, handles multivariate data
- Weaknesses: Requires more data, computationally intensive

### Prophet Model
- Best for: Long-term predictions (days to weeks)
- Strengths: Handles seasonality, robust to missing data
- Weaknesses: Less flexible for complex patterns

### Ensemble Approach
- Combines predictions from both models
- Provides confidence intervals
- More robust than individual models

## Monitoring and Alerts

The ML service automatically detects anomalies and can trigger alerts based on:

- Unusual CPU usage patterns
- Memory usage spikes
- Network I/O anomalies
- Model prediction confidence

## Docker Support

```bash
# Build Docker image
docker build -t cloudpulse-ml .

# Run container
docker run -d --name cloudpulse-ml \
  -e AGENT_ENDPOINTS=http://agent1:8080,http://agent2:8080 \
  -v ./models:/app/models \
  cloudpulse-ml
```
