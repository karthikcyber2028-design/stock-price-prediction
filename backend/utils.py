from __future__ import annotations

import yfinance as yf
import pandas as pd
import numpy as np
from typing import Optional


def calculate_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1 / period, min_periods=period).mean()
    avg_loss = loss.ewm(alpha=1 / period, min_periods=period).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def calculate_macd(
    series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9
) -> tuple[pd.Series, pd.Series, pd.Series]:
    ema_fast = series.ewm(span=fast, adjust=False).mean()
    ema_slow = series.ewm(span=slow, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal, adjust=False).mean()
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def calculate_bollinger_bands(
    series: pd.Series, period: int = 20, std_dev: int = 2
) -> tuple[pd.Series, pd.Series, pd.Series]:
    sma = series.rolling(window=period).mean()
    std = series.rolling(window=period).std()
    upper = sma + (std * std_dev)
    lower = sma - (std * std_dev)
    return upper, sma, lower


def get_stock_data(ticker: str, period: str = "2y") -> Optional[pd.DataFrame]:
    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period)
        if df.empty:
            return None
        return df
    except Exception as e:
        print(f"Error fetching data for {ticker}: {e}")
        return None


def get_stock_info(ticker: str) -> Optional[dict]:
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        if not info or "symbol" not in info:
            return None
        return {
            "name": info.get("shortName") or info.get("longName", ticker),
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "market_cap": info.get("marketCap", 0),
            "pe_ratio": info.get("trailingPE", 0) or 0,
            "description": info.get("longBusinessSummary", "N/A"),
            "currentPrice": info.get("currentPrice") or info.get(
                "regularMarketPrice", 0
            ),
            "previousClose": info.get("previousClose", 0),
            "open": info.get("open") or info.get("regularMarketOpen", 0),
            "dayHigh": info.get("dayHigh") or info.get("regularMarketDayHigh", 0),
            "dayLow": info.get("dayLow") or info.get("regularMarketDayLow", 0),
            "volume": info.get("volume") or info.get("regularMarketVolume", 0),
            "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh", 0),
            "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow", 0),
            "beta": info.get("beta", 0),
            "eps": info.get("trailingEps", 0),
            "dividendYield": info.get("dividendYield", 0),
        }
    except Exception as e:
        print(f"Error fetching info for {ticker}: {e}")
        return None
