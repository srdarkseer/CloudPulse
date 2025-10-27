import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
import joblib
import os
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LSTMForecaster:
    """LSTM-based time series forecaster for resource metrics"""
    
    def __init__(self, sequence_length=60, features=['cpu_usage', 'memory_usage', 'network_io']):
        self.sequence_length = sequence_length
        self.features = features
        self.scaler = MinMaxScaler()
        self.model = None
        self.is_trained = False
        
    def prepare_data(self, df):
        """Prepare data for LSTM training"""
        # Ensure we have the required columns
        required_cols = ['timestamp'] + self.features
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        
        # Sort by timestamp
        df = df.sort_values('timestamp').reset_index(drop=True)
        
        # Create feature matrix
        feature_data = df[self.features].values
        
        # Scale the data
        scaled_data = self.scaler.fit_transform(feature_data)
        
        # Create sequences
        X, y = [], []
        for i in range(self.sequence_length, len(scaled_data)):
            X.append(scaled_data[i-self.sequence_length:i])
            y.append(scaled_data[i])
        
        return np.array(X), np.array(y)
    
    def build_model(self, input_shape):
        """Build LSTM model architecture"""
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            LSTM(50, return_sequences=True),
            Dropout(0.2),
            LSTM(50),
            Dropout(0.2),
            Dense(len(self.features))
        ])
        
        model.compile(
            optimizer=Adam(learning_rate=0.001),
            loss='mse',
            metrics=['mae']
        )
        
        return model
    
    def train(self, df, epochs=100, batch_size=32, validation_split=0.2):
        """Train the LSTM model"""
        logger.info("Preparing training data...")
        X, y = self.prepare_data(df)
        
        if len(X) == 0:
            raise ValueError("Insufficient data for training. Need at least sequence_length + 1 samples.")
        
        logger.info(f"Training data shape: X={X.shape}, y={y.shape}")
        
        # Build model
        self.model = self.build_model((X.shape[1], X.shape[2]))
        
        # Train model
        logger.info("Training LSTM model...")
        history = self.model.fit(
            X, y,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            verbose=1
        )
        
        self.is_trained = True
        logger.info("LSTM model training completed")
        
        return history
    
    def predict(self, df, steps=24):
        """Make predictions for future time steps"""
        if not self.is_trained:
            raise ValueError("Model must be trained before making predictions")
        
        # Get the last sequence_length data points
        last_sequence = df[self.features].tail(self.sequence_length).values
        last_sequence_scaled = self.scaler.transform(last_sequence)
        
        predictions = []
        current_sequence = last_sequence_scaled.copy()
        
        for _ in range(steps):
            # Reshape for prediction
            X_pred = current_sequence.reshape(1, self.sequence_length, len(self.features))
            
            # Make prediction
            pred = self.model.predict(X_pred, verbose=0)
            predictions.append(pred[0])
            
            # Update sequence: remove first element, add prediction
            current_sequence = np.vstack([current_sequence[1:], pred[0]])
        
        # Inverse transform predictions
        predictions = np.array(predictions)
        predictions_unscaled = self.scaler.inverse_transform(predictions)
        
        # Create prediction dataframe
        future_times = pd.date_range(
            start=df['timestamp'].iloc[-1] + timedelta(minutes=5),
            periods=steps,
            freq='5min'
        )
        
        pred_df = pd.DataFrame({
            'timestamp': future_times,
            **{feature: predictions_unscaled[:, i] for i, feature in enumerate(self.features)}
        })
        
        return pred_df
    
    def evaluate(self, df_test):
        """Evaluate model performance on test data"""
        if not self.is_trained:
            raise ValueError("Model must be trained before evaluation")
        
        X_test, y_test = self.prepare_data(df_test)
        
        # Make predictions
        y_pred = self.model.predict(X_test, verbose=0)
        
        # Calculate metrics
        mae = mean_absolute_error(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        
        return {
            'mae': mae,
            'mse': mse,
            'rmse': rmse
        }
    
    def save_model(self, filepath):
        """Save the trained model and scaler"""
        if not self.is_trained:
            raise ValueError("Model must be trained before saving")
        
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        # Save model
        self.model.save(f"{filepath}_model.h5")
        
        # Save scaler
        joblib.dump(self.scaler, f"{filepath}_scaler.pkl")
        
        # Save metadata
        metadata = {
            'sequence_length': self.sequence_length,
            'features': self.features,
            'is_trained': self.is_trained
        }
        joblib.dump(metadata, f"{filepath}_metadata.pkl")
        
        logger.info(f"Model saved to {filepath}")
    
    def load_model(self, filepath):
        """Load a trained model and scaler"""
        # Load model
        self.model = tf.keras.models.load_model(f"{filepath}_model.h5")
        
        # Load scaler
        self.scaler = joblib.load(f"{filepath}_scaler.pkl")
        
        # Load metadata
        metadata = joblib.load(f"{filepath}_metadata.pkl")
        self.sequence_length = metadata['sequence_length']
        self.features = metadata['features']
        self.is_trained = metadata['is_trained']
        
        logger.info(f"Model loaded from {filepath}")
