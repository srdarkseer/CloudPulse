import pandas as pd
import numpy as np
from prophet import Prophet
import logging
from datetime import datetime, timedelta
import joblib
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProphetForecaster:
    """Prophet-based time series forecaster for resource metrics"""
    
    def __init__(self):
        self.models = {}
        self.is_trained = False
        
    def prepare_data(self, df, metric_name):
        """Prepare data for Prophet training"""
        # Prophet expects columns 'ds' (datetime) and 'y' (value)
        prophet_df = df[['timestamp', metric_name]].copy()
        prophet_df.columns = ['ds', 'y']
        
        # Remove any NaN values
        prophet_df = prophet_df.dropna()
        
        return prophet_df
    
    def train(self, df, metrics=['cpu_usage', 'memory_usage', 'network_io']):
        """Train Prophet models for each metric"""
        logger.info("Training Prophet models...")
        
        for metric in metrics:
            if metric not in df.columns:
                logger.warning(f"Metric {metric} not found in data, skipping...")
                continue
                
            logger.info(f"Training Prophet model for {metric}")
            
            # Prepare data
            prophet_df = self.prepare_data(df, metric)
            
            if len(prophet_df) < 10:
                logger.warning(f"Insufficient data for {metric}, skipping...")
                continue
            
            # Create and train Prophet model
            model = Prophet(
                yearly_seasonality=False,
                weekly_seasonality=True,
                daily_seasonality=True,
                seasonality_mode='multiplicative',
                changepoint_prior_scale=0.05,
                seasonality_prior_scale=10.0
            )
            
            # Add custom seasonalities for different time periods
            model.add_seasonality(name='hourly', period=1/24, fourier_order=8)
            model.add_seasonality(name='weekly', period=7, fourier_order=4)
            
            # Train the model
            model.fit(prophet_df)
            self.models[metric] = model
            
            logger.info(f"Prophet model for {metric} trained successfully")
        
        self.is_trained = True
        logger.info("All Prophet models training completed")
    
    def predict(self, df, steps=24, freq='5min'):
        """Make predictions for future time steps"""
        if not self.is_trained:
            raise ValueError("Models must be trained before making predictions")
        
        predictions = {}
        
        for metric, model in self.models.items():
            logger.info(f"Making predictions for {metric}")
            
            # Create future dataframe
            last_timestamp = df['timestamp'].iloc[-1]
            future_times = pd.date_range(
                start=last_timestamp + timedelta(minutes=5),
                periods=steps,
                freq=freq
            )
            
            future_df = pd.DataFrame({'ds': future_times})
            
            # Make prediction
            forecast = model.predict(future_df)
            
            # Store predictions
            predictions[metric] = {
                'timestamp': future_times,
                'predicted': forecast['yhat'].values,
                'lower_bound': forecast['yhat_lower'].values,
                'upper_bound': forecast['yhat_upper'].values
            }
        
        # Combine predictions into a single dataframe
        if predictions:
            pred_df = pd.DataFrame({'timestamp': predictions[list(predictions.keys())[0]]['timestamp']})
            
            for metric, pred_data in predictions.items():
                pred_df[f'{metric}_predicted'] = pred_data['predicted']
                pred_df[f'{metric}_lower'] = pred_data['lower_bound']
                pred_df[f'{metric}_upper'] = pred_data['upper_bound']
            
            return pred_df
        else:
            raise ValueError("No trained models available for prediction")
    
    def evaluate(self, df_test, metrics=['cpu_usage', 'memory_usage', 'network_io']):
        """Evaluate model performance on test data"""
        if not self.is_trained:
            raise ValueError("Models must be trained before evaluation")
        
        results = {}
        
        for metric in metrics:
            if metric not in self.models:
                continue
                
            # Prepare test data
            test_df = self.prepare_data(df_test, metric)
            
            if len(test_df) < 5:
                logger.warning(f"Insufficient test data for {metric}")
                continue
            
            # Make predictions on test data
            forecast = self.models[metric].predict(test_df)
            
            # Calculate metrics
            actual = test_df['y'].values
            predicted = forecast['yhat'].values
            
            mae = np.mean(np.abs(actual - predicted))
            mse = np.mean((actual - predicted) ** 2)
            rmse = np.sqrt(mse)
            mape = np.mean(np.abs((actual - predicted) / actual)) * 100
            
            results[metric] = {
                'mae': mae,
                'mse': mse,
                'rmse': rmse,
                'mape': mape
            }
            
            logger.info(f"{metric} - MAE: {mae:.4f}, RMSE: {rmse:.4f}, MAPE: {mape:.2f}%")
        
        return results
    
    def save_models(self, filepath):
        """Save the trained Prophet models"""
        if not self.is_trained:
            raise ValueError("Models must be trained before saving")
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        for metric, model in self.models.items():
            model_path = f"{filepath}_{metric}_prophet.pkl"
            joblib.dump(model, model_path)
            logger.info(f"Prophet model for {metric} saved to {model_path}")
        
        # Save metadata
        metadata = {
            'metrics': list(self.models.keys()),
            'is_trained': self.is_trained
        }
        joblib.dump(metadata, f"{filepath}_metadata.pkl")
        
        logger.info(f"All Prophet models saved to {filepath}")
    
    def load_models(self, filepath):
        """Load trained Prophet models"""
        # Load metadata
        metadata = joblib.load(f"{filepath}_metadata.pkl")
        
        self.models = {}
        for metric in metadata['metrics']:
            model_path = f"{filepath}_{metric}_prophet.pkl"
            self.models[metric] = joblib.load(model_path)
            logger.info(f"Prophet model for {metric} loaded from {model_path}")
        
        self.is_trained = metadata['is_trained']
        logger.info(f"All Prophet models loaded from {filepath}")
    
    def get_model_components(self, metric):
        """Get model components (trend, seasonality) for analysis"""
        if metric not in self.models:
            raise ValueError(f"No model found for metric: {metric}")
        
        model = self.models[metric]
        
        # Get the last forecast to extract components
        future_df = pd.DataFrame({
            'ds': pd.date_range(start='2024-01-01', periods=100, freq='5min')
        })
        
        forecast = model.predict(future_df)
        
        return {
            'trend': forecast['trend'].values,
            'seasonal': forecast['seasonal'].values,
            'yearly': forecast.get('yearly', np.zeros(100)).values,
            'weekly': forecast.get('weekly', np.zeros(100)).values,
            'daily': forecast.get('daily', np.zeros(100)).values
        }
