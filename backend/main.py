from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from model import train_and_predict
from utils import get_stock_data, get_stock_info

app = FastAPI(
    title="AI Stock Price Prediction API",
    description="LSTM-based stock price prediction with technical indicators",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

POPULAR_STOCKS = [
    {"ticker": "AAPL", "name": "Apple Inc."},
    {"ticker": "MSFT", "name": "Microsoft Corporation"},
    {"ticker": "GOOGL", "name": "Alphabet Inc."},
    {"ticker": "AMZN", "name": "Amazon.com Inc."},
    {"ticker": "NVDA", "name": "NVIDIA Corporation"},
    {"ticker": "META", "name": "Meta Platforms Inc."},
    {"ticker": "TSLA", "name": "Tesla Inc."},
    {"ticker": "JPM", "name": "JPMorgan Chase & Co."},
    {"ticker": "V", "name": "Visa Inc."},
    {"ticker": "JNJ", "name": "Johnson & Johnson"},
    {"ticker": "WMT", "name": "Walmart Inc."},
    {"ticker": "UNH", "name": "UnitedHealth Group Inc."},
    {"ticker": "XOM", "name": "Exxon Mobil Corporation"},
    {"ticker": "PG", "name": "Procter & Gamble Co."},
    {"ticker": "HD", "name": "Home Depot Inc."},
]


@app.get("/")
async def health_check():
    return {
        "status": "healthy",
        "service": "AI Stock Price Prediction API",
        "version": "1.0.0",
    }


@app.get("/api/stocks/popular")
async def get_popular_stocks():
    return POPULAR_STOCKS


@app.get("/api/predict/{ticker}")
async def predict_stock(ticker: str, days: int = 30, period: str = "2y"):
    if days < 1 or days > 365:
        raise HTTPException(
            status_code=400, detail="Days must be between 1 and 365"
        )
    if period not in ["1mo", "3mo", "6mo", "1y", "2y", "5y", "10y", "max"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid period. Use: 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, max",
        )
    try:
        result = train_and_predict(ticker=ticker, period=period, days=days)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Prediction failed: {str(e)}"
        )


@app.get("/api/stock/{ticker}")
async def get_stock_history(ticker: str, period: str = "2y"):
    try:
        df = get_stock_data(ticker, period)
        if df is None or df.empty:
            raise HTTPException(
                status_code=404, detail=f"No data found for ticker '{ticker}'"
            )
        records = []
        for date, row in df.iterrows():
            records.append(
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "open": round(float(row["Open"]), 2),
                    "high": round(float(row["High"]), 2),
                    "low": round(float(row["Low"]), 2),
                    "close": round(float(row["Close"]), 2),
                    "volume": int(row["Volume"]),
                }
            )
        return {"ticker": ticker.upper(), "data": records}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch data: {str(e)}"
        )


@app.get("/api/stock/{ticker}/info")
async def get_stock_info_route(ticker: str):
    try:
        info = get_stock_info(ticker)
        if info is None:
            raise HTTPException(
                status_code=404,
                detail=f"No info found for ticker '{ticker}'",
            )
        return info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch info: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
