from __future__ import annotations

import warnings

warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error
from typing import Optional

import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import EarlyStopping

from utils import (
    calculate_rsi,
    calculate_macd,
    calculate_bollinger_bands,
    get_stock_data,
)

tf.get_logger().setLevel("ERROR")


def _engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    data = df.copy()

    data["MA5"] = data["Close"].rolling(window=5).mean()
    data["MA10"] = data["Close"].rolling(window=10).mean()
    data["MA20"] = data["Close"].rolling(window=20).mean()
    data["MA50"] = data["Close"].rolling(window=50).mean()

    data["RSI"] = calculate_rsi(data["Close"])

    macd_line, signal_line, histogram = calculate_macd(data["Close"])
    data["MACD"] = macd_line
    data["MACD_Signal"] = signal_line
    data["MACD_Histogram"] = histogram

    upper, middle, lower = calculate_bollinger_bands(data["Close"])
    data["BB_Upper"] = upper
    data["BB_Middle"] = middle
    data["BB_Lower"] = lower
    data["BB_Width"] = (upper - lower) / middle

    data["Volume_Change"] = data["Volume"].pct_change()
    data["Price_Change"] = data["Close"].pct_change()
    data["Price_Range"] = data["High"] - data["Low"]
    data["Price_Range_Pct"] = data["Price_Range"] / data["Close"]
    data["Gap"] = data["Open"] - data["Close"].shift(1)
    data["Gap_Pct"] = data["Gap"] / data["Close"].shift(1)

    data = data.dropna()
    return data


def _build_lstm_model(input_shape: tuple[int, int]) -> Sequential:
    model = Sequential(
        [
            LSTM(128, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            LSTM(64, return_sequences=False),
            Dropout(0.2),
            Dense(32, activation="relu"),
            Dense(1),
        ]
    )
    model.compile(optimizer="adam", loss="mse")
    return model


def _fallback_prediction(
    df: pd.DataFrame, days: int, ticker: str
) -> dict:
    close = df["Close"].values.reshape(-1, 1)
    X = np.arange(len(close)).reshape(-1, 1)
    reg = LinearRegression().fit(X, close.ravel())
    future_X = np.arange(len(close), len(close) + days).reshape(-1, 1)
    future_preds = reg.predict(future_X)

    current_price = float(close[-1])
    predicted_price = float(future_preds[-1])

    hist_dates = df.index[-60:].tolist()
    hist_60 = df.iloc[-60:]
    historical_data = []
    for dt, row in zip(hist_dates, hist_60.itertuples()):
        historical_data.append(
            {
                "date": dt.strftime("%Y-%m-%d"),
                "open": round(float(row.Open), 2),
                "high": round(float(row.High), 2),
                "low": round(float(row.Low), 2),
                "close": round(float(row.Close), 2),
                "volume": int(row.Volume),
            }
        )

    future_dates = pd.bdate_range(
        start=df.index[-1] + pd.Timedelta(days=1), periods=days
    )
    predictions = []
    std_dev = float(np.std(close)) * 0.5
    for i, (dt, price) in enumerate(zip(future_dates, future_preds)):
        predictions.append(
            {
                "date": dt.strftime("%Y-%m-%d"),
                "predicted": round(float(price), 2),
                "upper": round(float(price) + std_dev * (i + 1) * 0.1, 2),
                "lower": round(float(price) - std_dev * (i + 1) * 0.1, 2),
            }
        )

    return {
        "ticker": ticker.upper(),
        "historical": historical_data,
        "predictions": predictions,
        "metrics": {"mae": 0, "rmse": 0, "mape": 0},
        "current_price": round(current_price, 2),
        "predicted_price": round(predicted_price, 2),
        "prediction_direction": "UP" if predicted_price > current_price else "DOWN",
        "days": days,
        "fallback": True,
    }


def train_and_predict(
    ticker: str, period: str = "2y", days: int = 30
) -> dict:
    try:
        df = get_stock_data(ticker, period)
        if df is None or df.empty:
            raise ValueError(f"No data found for ticker '{ticker}'")

        data = _engineer_features(df)
        if len(data) < 100:
            raise ValueError(
                f"Insufficient data for '{ticker}': only {len(data)} rows after feature engineering"
            )

        features = [
            "Close", "MA5", "MA10", "MA20", "MA50",
            "RSI", "MACD", "MACD_Signal", "MACD_Histogram",
            "BB_Upper", "BB_Middle", "BB_Lower", "BB_Width",
            "Volume_Change", "Price_Change", "Price_Range_Pct",
        ]
        dataset = data[features].values

        scaler = MinMaxScaler()
        scaled_data = scaler.fit_transform(dataset)

        sequence_length = 60
        X, y = [], []
        for i in range(sequence_length, len(scaled_data)):
            X.append(scaled_data[i - sequence_length : i])
            y.append(scaled_data[i, 0])

        X, y = np.array(X), np.array(y)

        split = int(len(X) * 0.85)
        X_train, X_test = X[:split], X[split:]
        y_train, y_test = y[:split], y[split:]

        model = _build_lstm_model((X_train.shape[1], X_train.shape[2]))
        early_stop = EarlyStopping(
            monitor="val_loss", patience=5, restore_best_weights=True
        )
        model.fit(
            X_train,
            y_train,
            epochs=25,
            batch_size=32,
            validation_data=(X_test, y_test),
            callbacks=[early_stop],
            verbose=0,
        )

        predictions_on_test = model.predict(X_test, verbose=0).flatten()

        close_scaler = MinMaxScaler()
        close_scaler.fit_transform(data["Close"].values.reshape(-1, 1))

        test_actual = y_test
        test_pred = predictions_on_test

        mae = float(mean_absolute_error(test_actual, test_pred))
        rmse = float(np.sqrt(mean_squared_error(test_actual, test_pred)))
        mask = test_actual != 0
        mape = float(
            np.mean(np.abs((test_actual[mask] - test_pred[mask]) / test_actual[mask]))
            * 100
        )

        historical_data = []
        hist_dates = data.index[-60:].tolist()
        hist_60 = data.iloc[-60:]
        for dt, row in zip(hist_dates, hist_60.itertuples()):
            historical_data.append(
                {
                    "date": dt.strftime("%Y-%m-%d"),
                    "open": round(float(row.Open), 2),
                    "high": round(float(row.High), 2),
                    "low": round(float(row.Low), 2),
                    "close": round(float(row.Close), 2),
                    "volume": int(row.Volume),
                }
            )

        last_sequence = scaled_data[-sequence_length:]
        future_predictions = []
        current_seq = last_sequence.copy()
        future_dates = pd.bdate_range(
            start=data.index[-1] + pd.Timedelta(days=1), periods=days
        )

        close_min = scaler.data_min_[0]
        close_max = scaler.data_max_[0]

        for i in range(days):
            pred = model.predict(
                current_seq.reshape(1, sequence_length, len(features)), verbose=0
            )
            pred_value = float(pred[0, 0])
            price = pred_value * (close_max - close_min) + close_min
            std_dev = float(np.std(data["Close"].values[-30:])) * 0.5
            future_predictions.append(
                {
                    "date": future_dates[i].strftime("%Y-%m-%d"),
                    "predicted": round(price, 2),
                    "upper": round(price + std_dev * (i + 1) * 0.1, 2),
                    "lower": round(price - std_dev * (i + 1) * 0.1, 2),
                }
            )

            new_row = current_seq[-1].copy()
            new_row[0] = pred_value
            current_seq = np.vstack([current_seq[1:], new_row.reshape(1, -1)])

        current_price = float(data["Close"].iloc[-1])
        predicted_price = future_predictions[-1]["predicted"]

        return {
            "ticker": ticker.upper(),
            "historical": historical_data,
            "predictions": future_predictions,
            "metrics": {
                "mae": round(mae, 4),
                "rmse": round(rmse, 4),
                "mape": round(mape, 2),
            },
            "current_price": round(current_price, 2),
            "predicted_price": round(predicted_price, 2),
            "prediction_direction": (
                "UP" if predicted_price > current_price else "DOWN"
            ),
            "days": days,
            "fallback": False,
        }

    except Exception as e:
        print(f"LSTM prediction failed for {ticker}: {e}")
        try:
            df = get_stock_data(ticker, period)
            if df is None or df.empty:
                raise ValueError(f"Cannot fetch fallback data for {ticker}")
            return _fallback_prediction(df, days, ticker)
        except Exception as fallback_error:
            return {
                "ticker": ticker.upper(),
                "error": str(fallback_error),
                "historical": [],
                "predictions": [],
                "metrics": {"mae": 0, "rmse": 0, "mape": 0},
                "current_price": 0,
                "predicted_price": 0,
                "prediction_direction": "UNKNOWN",
                "days": days,
                "fallback": True,
            }
