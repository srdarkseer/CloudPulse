import pandas as pd
import numpy as np
import requests
import json
from datetime import datetime, timedelta
import logging
from lstm_forecaster import LSTMForecaster
from prophet_forecaster import ProphetForecaster
import schedule
import time
import os
from dotenv import load_dotenv
from flask import Flask, jsonify
import threading

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CloudPulseMLService:
    """Main ML service that orchestrates forecasting and data collection"""
    
    def __init__(self, agent_endpoints=None, model_save_path="./models"):
        self.agent_endpoints = agent_endpoints or []
        self.model_save_path = model_save_path
        self.lstm_forecaster = LSTMForecaster()
        self.prophet_forecaster = ProphetForecaster()
        self.data_cache = {}
        self.latest_forecasts = {}
        self.latest_anomalies = []
        
        # Create models directory
        os.makedirs(model_save_path, exist_ok=True)
        
        # Initialize Flask app
        self.app = Flask(__name__)
        self.setup_routes()
    
    def setup_routes(self):
        """Setup Flask API routes"""
        
        @self.app.route('/health', methods=['GET'])
        def health():
            return jsonify({
                'status': 'healthy',
                'timestamp': datetime.now().isoformat(),
                'service': 'cloudpulse-ml'
            })
        
        @self.app.route('/api/forecasts', methods=['GET'])
        def get_forecasts():
            return jsonify(self.latest_forecasts)
        
        @self.app.route('/api/anomalies', methods=['GET'])
        def get_anomalies():
            return jsonify(self.latest_anomalies)
        
        @self.app.route('/api/metrics', methods=['GET'])
        def get_metrics():
            if self.data_cache:
                latest_df = list(self.data_cache.values())[-1]
                # Convert DataFrame to JSON-serializable format
                return jsonify(latest_df.to_dict('records') if hasattr(latest_df, 'to_dict') else {})
            return jsonify({})
    
    def collect_metrics_from_agents(self):
        """Collect metrics from all registered agents"""
        all_metrics = []
        
        for endpoint in self.agent_endpoints:
            try:
                response = requests.get(f"{endpoint}/metrics", timeout=10)
                if response.status_code == 200:
                    metrics = response.json()
                    metrics['node_endpoint'] = endpoint
                    all_metrics.append(metrics)
                    logger.info(f"Collected metrics from {endpoint}")
                else:
                    logger.warning(f"Failed to collect metrics from {endpoint}: {response.status_code}")
            except Exception as e:
                logger.error(f"Error collecting metrics from {endpoint}: {str(e)}")
        
        return all_metrics
    
    def process_metrics_data(self, metrics_list):
        """Process raw metrics into training-ready format"""
        processed_data = []
        
        for metrics in metrics_list:
            # Extract relevant metrics
            cpu_usage = metrics['cpu']['usage_percent']
            memory_usage = metrics['memory']['used_percent']
            network_io = metrics['network']['bytes_sent'] + metrics['network']['bytes_recv']
            
            processed_data.append({
                'timestamp': pd.to_datetime(metrics['timestamp']),
                'node_id': metrics['node_id'],
                'cpu_usage': cpu_usage,
                'memory_usage': memory_usage,
                'network_io': network_io
            })
        
        return pd.DataFrame(processed_data)
    
    def aggregate_node_metrics(self, df):
        """Aggregate metrics across all nodes"""
        # Group by timestamp and calculate averages
        aggregated = df.groupby('timestamp').agg({
            'cpu_usage': 'mean',
            'memory_usage': 'mean',
            'network_io': 'mean'
        }).reset_index()
        
        return aggregated
    
    def train_models(self, df):
        """Train both LSTM and Prophet models"""
        logger.info("Starting model training...")
        
        # Train LSTM model
        try:
            logger.info("Training LSTM model...")
            self.lstm_forecaster.train(df, epochs=50, batch_size=16)
            self.lstm_forecaster.save_model(f"{self.model_save_path}/lstm_model")
            logger.info("LSTM model training completed")
        except Exception as e:
            logger.error(f"LSTM training failed: {str(e)}")
        
        # Train Prophet models
        try:
            logger.info("Training Prophet models...")
            self.prophet_forecaster.train(df)
            self.prophet_forecaster.save_models(f"{self.model_save_path}/prophet_model")
            logger.info("Prophet model training completed")
        except Exception as e:
            logger.error(f"Prophet training failed: {str(e)}")
    
    def load_trained_models(self):
        """Load previously trained models"""
        try:
            self.lstm_forecaster.load_model(f"{self.model_save_path}/lstm_model")
            logger.info("LSTM model loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load LSTM model: {str(e)}")
        
        try:
            self.prophet_forecaster.load_models(f"{self.model_save_path}/prophet_model")
            logger.info("Prophet models loaded successfully")
        except Exception as e:
            logger.warning(f"Failed to load Prophet models: {str(e)}")
    
    def generate_forecasts(self, df, steps=24):
        """Generate forecasts using both models"""
        forecasts = {}
        
        # LSTM forecast
        try:
            if self.lstm_forecaster.is_trained:
                lstm_pred = self.lstm_forecaster.predict(df, steps)
                forecasts['lstm'] = lstm_pred
                logger.info("LSTM forecast generated")
        except Exception as e:
            logger.error(f"LSTM forecasting failed: {str(e)}")
        
        # Prophet forecast
        try:
            if self.prophet_forecaster.is_trained:
                prophet_pred = self.prophet_forecaster.predict(df, steps)
                forecasts['prophet'] = prophet_pred
                logger.info("Prophet forecast generated")
        except Exception as e:
            logger.error(f"Prophet forecasting failed: {str(e)}")
        
        return forecasts
    
    def combine_forecasts(self, forecasts):
        """Combine forecasts from different models using ensemble methods"""
        if not forecasts:
            return None
        
        # Simple ensemble: average predictions from available models
        combined_df = None
        
        for model_name, pred_df in forecasts.items():
            if combined_df is None:
                combined_df = pred_df.copy()
                # Rename columns to include model name
                for col in pred_df.columns:
                    if col != 'timestamp':
                        combined_df[f"{col}_{model_name}"] = combined_df[col]
                        combined_df = combined_df.drop(columns=[col])
            else:
                # Merge with existing predictions
                for col in pred_df.columns:
                    if col != 'timestamp':
                        combined_df[f"{col}_{model_name}"] = pred_df[col]
        
        # Calculate ensemble averages
        metrics = ['cpu_usage', 'memory_usage', 'network_io']
        for metric in metrics:
            model_cols = [f"{metric}_{model}" for model in forecasts.keys()]
            if all(col in combined_df.columns for col in model_cols):
                combined_df[f"{metric}_ensemble"] = combined_df[model_cols].mean(axis=1)
                combined_df[f"{metric}_std"] = combined_df[model_cols].std(axis=1)
        
        return combined_df
    
    def detect_anomalies(self, df, threshold=2.0):
        """Detect anomalies in current metrics"""
        anomalies = []
        
        for _, row in df.iterrows():
            # Simple anomaly detection based on z-score
            for metric in ['cpu_usage', 'memory_usage', 'network_io']:
                if metric in row:
                    # Calculate z-score (simplified)
                    mean_val = df[metric].mean()
                    std_val = df[metric].std()
                    
                    if std_val > 0:
                        z_score = abs(row[metric] - mean_val) / std_val
                        
                        if z_score > threshold:
                            anomalies.append({
                                'timestamp': row['timestamp'],
                                'metric': metric,
                                'value': row[metric],
                                'z_score': z_score,
                                'severity': 'high' if z_score > 3 else 'medium'
                            })
        
        return anomalies
    
    def run_forecasting_cycle(self):
        """Run a complete forecasting cycle"""
        logger.info("Starting forecasting cycle...")
        
        # Collect metrics
        metrics_list = self.collect_metrics_from_agents()
        if not metrics_list:
            logger.warning("No metrics collected from agents")
            return
        
        # Process data
        df = self.process_metrics_data(metrics_list)
        aggregated_df = self.aggregate_node_metrics(df)
        
        # Store in cache for training
        self.data_cache[datetime.now()] = aggregated_df
        
        # Keep only last 1000 data points to prevent memory issues
        if len(self.data_cache) > 1000:
            oldest_key = min(self.data_cache.keys())
            del self.data_cache[oldest_key]
        
        # Generate forecasts
        forecasts = self.generate_forecasts(aggregated_df)
        combined_forecast = self.combine_forecasts(forecasts)
        
        # Detect anomalies
        anomalies = self.detect_anomalies(aggregated_df)
        
        # Store latest results for API
        self.latest_forecasts = combined_forecast
        self.latest_anomalies = anomalies
        
        # Log results
        logger.info(f"Forecasting cycle completed. Generated {len(forecasts)} model forecasts")
        if anomalies:
            logger.warning(f"Detected {len(anomalies)} anomalies")
        
        return {
            'forecasts': combined_forecast,
            'anomalies': anomalies,
            'raw_metrics': aggregated_df
        }
    
    def start_scheduled_forecasting(self, interval_minutes=5):
        """Start scheduled forecasting"""
        logger.info(f"Starting scheduled forecasting every {interval_minutes} minutes")
        
        # Load existing models
        self.load_trained_models()
        
        # Schedule forecasting
        schedule.every(interval_minutes).minutes.do(self.run_forecasting_cycle)
        
        # Run initial cycle
        self.run_forecasting_cycle()
        
        # Keep running
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute

def run_forecasting_thread(service, interval_minutes):
    """Run forecasting in a separate thread"""
    try:
        service.start_scheduled_forecasting(interval_minutes)
    except Exception as e:
        logger.error(f"Forecasting thread error: {str(e)}")

def main():
    """Main function to run the ML service"""
    # Configuration
    agent_endpoints = os.getenv('AGENT_ENDPOINTS', 'http://localhost:8080').split(',')
    model_save_path = os.getenv('MODEL_SAVE_PATH', './models')
    interval_minutes = int(os.getenv('FORECAST_INTERVAL_MINUTES', '5'))
    port = int(os.getenv('ML_SERVICE_PORT', '5000'))
    host = os.getenv('ML_SERVICE_HOST', '0.0.0.0')
    
    # Create service
    service = CloudPulseMLService(agent_endpoints, model_save_path)
    
    # Start forecasting in a separate thread
    forecasting_thread = threading.Thread(
        target=run_forecasting_thread, 
        args=(service, interval_minutes),
        daemon=True
    )
    forecasting_thread.start()
    
    # Start Flask app
    logger.info(f"Starting ML service on {host}:{port}")
    try:
        service.app.run(host=host, port=port, debug=False)
    except KeyboardInterrupt:
        logger.info("Service stopped by user")
    except Exception as e:
        logger.error(f"Service error: {str(e)}")

if __name__ == "__main__":
    main()
