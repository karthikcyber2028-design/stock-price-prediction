"use client";

import { useState } from "react";
import {
  Brain,
  Search,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Activity,
  Target,
  AlertCircle,
  Loader2,
  ChevronDown,
  Zap,
  Info,
  Calendar,
  LineChart,
} from "lucide-react";
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  runPrediction,
  fetchStockInfo,
  POPULAR_STOCKS,
  type PredictionResult,
  type StockRecord,
} from "@/lib/engine";

const PERIODS = [
  { label: "1 Month", value: "1mo" },
  { label: "3 Months", value: "3mo" },
  { label: "6 Months", value: "6mo" },
  { label: "1 Year", value: "1y" },
  { label: "2 Years", value: "2y" },
];

interface ChartEntry {
  date: string;
  historicalClose: number | null;
  predictedClose: number | null;
  upper: number | null;
  lower: number | null;
  type: "historical" | "prediction";
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartEntry }> }) {
  if (!active || !payload?.length) return null;
  const entry = payload[0]?.payload;
  if (!entry) return null;
  return (
    <div className="glass-card rounded-lg p-3 text-xs space-y-1 min-w-[180px]">
      <p className="font-semibold mb-1">{formatDate(entry.date)}</p>
      {entry.type === "historical" && entry.historicalClose != null && (
        <div className="flex justify-between"><span className="text-[var(--muted)]">Close:</span><span className="text-[var(--accent)]">${entry.historicalClose?.toFixed(2)}</span></div>
      )}
      {entry.type === "prediction" && entry.predictedClose != null && (
        <>
          <div className="flex justify-between"><span className="text-[var(--muted)]">Predicted:</span><span className="text-[var(--primary-hover)]">${entry.predictedClose?.toFixed(2)}</span></div>
          {entry.upper != null && <div className="flex justify-between"><span className="text-[var(--muted)]">Upper:</span><span className="text-[var(--success)]">${entry.upper?.toFixed(2)}</span></div>}
          {entry.lower != null && <div className="flex justify-between"><span className="text-[var(--muted)]">Lower:</span><span className="text-[var(--danger)]">${entry.lower?.toFixed(2)}</span></div>}
        </>
      )}
    </div>
  );
}

function formatDate(s: string) {
  try { return format(new Date(s), "MMM dd, yyyy"); } catch { return s; }
}
function fmtDate(s: string) {
  try { return format(new Date(s), "MM/dd"); } catch { return s; }
}
function fmtCur(v: number) {
  if (Math.abs(v) >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toLocaleString()}`;
}

export default function Home() {
  const [ticker, setTicker] = useState("");
  const [predictionDays, setPredictionDays] = useState(30);
  const [period, setPeriod] = useState("2y");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [stockInfo, setStockInfo] = useState<{ name: string; sector: string; industry: string; market_cap: number; pe_ratio: number; description: string } | null>(null);
  const [progress, setProgress] = useState("");
  const [activeTab, setActiveTab] = useState<"chart" | "info">("chart");

  const handlePredict = async (target: string) => {
    if (!target.trim()) { toast.error("Enter a stock ticker"); return; }
    const upper = target.trim().toUpperCase();
    setTicker(upper);
    setLoading(true);
    setResult(null);
    setStockInfo(null);
    setActiveTab("chart");
    setProgress("Initializing...");

    try {
      const [pred, info] = await Promise.all([
        runPrediction(upper, predictionDays, setProgress),
        fetchStockInfo(upper).catch(() => null),
      ]);
      setResult(pred);
      if (info) setStockInfo(info);
      toast.success(`${upper} prediction complete!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Prediction failed");
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  const chartData = (): ChartEntry[] => {
    if (!result) return [];
    const hist: ChartEntry[] = result.historical.map((d) => ({
      date: d.date, historicalClose: d.close, predictedClose: null, upper: null, lower: null, type: "historical" as const,
    }));
    const preds: ChartEntry[] = result.predictions.map((d) => ({
      date: d.date, historicalClose: null, predictedClose: d.predicted, upper: d.upper, lower: d.lower, type: "prediction" as const,
    }));
    return [...hist, ...preds];
  };

  const data = chartData();
  const isUp = result?.prediction_direction === "UP";
  const changePct = result ? ((result.predicted_price - result.current_price) / result.current_price) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="glass-card border-b border-[var(--card-border)] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center glow">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold gradient-text">StockAI</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
              <Zap className="w-3 h-3 text-[var(--accent)]" />
              Client-Side LSTM
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="glass-card rounded-2xl p-6 mb-8 glow">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Enter stock ticker (e.g. AAPL, GOOGL, TSLA)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handlePredict(ticker)}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:border-[var(--primary)] transition-colors text-sm"
              />
            </div>
            <div className="flex gap-3 items-center">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className="pl-9 pr-8 py-3.5 rounded-xl bg-[var(--background)] border border-[var(--card-border)] text-[var(--foreground)] text-sm appearance-none cursor-pointer focus:outline-none focus:border-[var(--primary)] transition-colors"
                >
                  {PERIODS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
              </div>
              <button
                onClick={() => handlePredict(ticker)}
                disabled={loading || !ticker.trim()}
                className="px-6 py-3.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap glow"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                {loading ? "Predicting..." : "Predict"}
              </button>
            </div>
          </div>
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4">
            <label className="text-sm text-[var(--muted)] whitespace-nowrap flex items-center gap-1.5">
              <LineChart className="w-4 h-4" /> Prediction Horizon:
            </label>
            <div className="flex-1 flex items-center gap-3">
              <span className="text-xs text-[var(--muted)]">7d</span>
              <input type="range" min={7} max={90} value={predictionDays} onChange={(e) => setPredictionDays(Number(e.target.value))} className="flex-1 h-1.5 rounded-full appearance-none bg-[var(--card-border)] cursor-pointer accent-[var(--primary)]" />
              <span className="text-xs text-[var(--muted)]">90d</span>
            </div>
            <span className="text-sm font-semibold text-[var(--accent)]">{predictionDays} days</span>
          </div>
          <div className="mt-5">
            <p className="text-xs text-[var(--muted)] mb-2.5 uppercase tracking-wider">Quick Select</p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_STOCKS.map((s) => (
                <button key={s.ticker} onClick={() => { setTicker(s.ticker); handlePredict(s.ticker); }} disabled={loading} className="px-3 py-1.5 rounded-lg bg-[var(--background)] border border-[var(--card-border)] text-xs font-medium hover:border-[var(--primary)] hover:text-[var(--primary-hover)] transition-all disabled:opacity-40">
                  {s.ticker}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading && (
          <div className="glass-card rounded-2xl p-8 mb-8 text-center">
            <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin mx-auto mb-4" />
            <p className="text-sm text-[var(--muted)]">{progress}</p>
            <p className="text-xs text-[var(--muted)] mt-2 opacity-60">This may take 30-90 seconds in the browser</p>
          </div>
        )}

        {result && !loading && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="glass-card rounded-xl p-5">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Current Price</p>
                <p className="text-2xl font-bold">${result.current_price.toFixed(2)}</p>
              </div>
              <div className="glass-card rounded-xl p-5">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Predicted Price</p>
                <p className={`text-2xl font-bold ${isUp ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>${result.predicted_price.toFixed(2)}</p>
              </div>
              <div className="glass-card rounded-xl p-5">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Change</p>
                <div className="flex items-center gap-2">
                  {isUp ? <TrendingUp className="w-5 h-5 text-[var(--success)]" /> : <TrendingDown className="w-5 h-5 text-[var(--danger)]" />}
                  <p className={`text-2xl font-bold ${isUp ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{changePct > 0 ? "+" : ""}{changePct.toFixed(2)}%</p>
                </div>
              </div>
              <div className="glass-card rounded-xl p-5">
                <p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-1">Direction</p>
                <p className={`text-2xl font-bold ${isUp ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{result.prediction_direction}</p>
                <p className="text-xs text-[var(--muted)] mt-0.5">Next {result.days} days</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="glass-card rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center"><Target className="w-5 h-5 text-[var(--primary-hover)]" /></div>
                <div><p className="text-xs text-[var(--muted)]">MAE</p><p className="text-lg font-bold">${result.metrics.mae.toFixed(4)}</p></div>
              </div>
              <div className="glass-card rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-[var(--accent)]" /></div>
                <div><p className="text-xs text-[var(--muted)]">RMSE</p><p className="text-lg font-bold">${result.metrics.rmse.toFixed(4)}</p></div>
              </div>
              <div className="glass-card rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center"><Activity className="w-5 h-5 text-[var(--success)]" /></div>
                <div><p className="text-xs text-[var(--muted)]">MAPE</p><p className="text-lg font-bold">{result.metrics.mape.toFixed(2)}%</p></div>
              </div>
            </div>

            <div className="flex gap-1 mb-4 bg-[var(--card)] rounded-lg p-1 w-fit">
              <button onClick={() => setActiveTab("chart")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "chart" ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
                <span className="flex items-center gap-1.5"><LineChart className="w-4 h-4" /> Chart</span>
              </button>
              {stockInfo && (
                <button onClick={() => setActiveTab("info")} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === "info" ? "bg-[var(--primary)] text-white" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>
                  <span className="flex items-center gap-1.5"><Info className="w-4 h-4" /> Company Info</span>
                </button>
              )}
            </div>

            {activeTab === "chart" && (
              <div className="glass-card rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-semibold text-[var(--muted)] mb-4">{result.ticker} — Historical & Predicted Prices</h3>
                <div className="w-full h-[400px]">
                  <ResponsiveContainer>
                    <ComposedChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <defs>
                        <linearGradient id="hGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="pGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,30,46,0.8)" />
                      <XAxis dataKey="date" tickFormatter={fmtDate} stroke="#71717a" fontSize={11} tickLine={false} interval="preserveStartEnd" minTickGap={50} />
                      <YAxis stroke="#71717a" fontSize={11} tickLine={false} domain={["auto", "auto"]} tickFormatter={(v: number) => `$${v.toFixed(0)}`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v: string) => <span style={{ color: "#a1a1aa" }}>{v}</span>} />
                      {result.current_price > 0 && <ReferenceLine y={result.current_price} stroke="#71717a" strokeDasharray="5 5" label={{ value: "Current", fill: "#71717a", fontSize: 10 }} />}
                      <Area type="monotone" dataKey="historicalClose" fill="url(#hGrad)" stroke="none" name="Historical Fill" legendType="none" connectNulls />
                      <Line type="monotone" dataKey="historicalClose" stroke="#6366f1" strokeWidth={2} dot={false} name="Historical Close" connectNulls />
                      <Area type="monotone" dataKey="predictedClose" fill="url(#pGrad)" stroke="none" name="Prediction Fill" legendType="none" connectNulls />
                      <Line type="monotone" dataKey="predictedClose" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={2.5} strokeDasharray="6 3" dot={false} name="Predicted Close" connectNulls />
                      {data.some((d) => d.upper != null) && <Line type="monotone" dataKey="upper" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.4} dot={false} name="Upper Bound" connectNulls />}
                      {data.some((d) => d.lower != null) && <Line type="monotone" dataKey="lower" stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.4} dot={false} name="Lower Bound" connectNulls />}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {activeTab === "info" && stockInfo && (
              <div className="glass-card rounded-2xl p-6 mb-8">
                <h3 className="text-sm font-semibold text-[var(--muted)] mb-4">{result.ticker} — Company Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div><p className="text-xs text-[var(--muted)] uppercase tracking-wider">Name</p><p className="text-lg font-semibold">{stockInfo.name}</p></div>
                    <div className="flex gap-6">
                      <div><p className="text-xs text-[var(--muted)] uppercase tracking-wider">Sector</p><p className="text-sm font-medium">{stockInfo.sector}</p></div>
                      <div><p className="text-xs text-[var(--muted)] uppercase tracking-wider">Industry</p><p className="text-sm font-medium">{stockInfo.industry}</p></div>
                    </div>
                    <div className="flex gap-6">
                      <div><p className="text-xs text-[var(--muted)] uppercase tracking-wider">Market Cap</p><p className="text-sm font-medium">{fmtCur(stockInfo.market_cap)}</p></div>
                      <div><p className="text-xs text-[var(--muted)] uppercase tracking-wider">P/E Ratio</p><p className="text-sm font-medium">{stockInfo.pe_ratio ? stockInfo.pe_ratio.toFixed(2) : "N/A"}</p></div>
                    </div>
                  </div>
                  <div><p className="text-xs text-[var(--muted)] uppercase tracking-wider mb-2">Description</p><p className="text-sm text-[var(--muted)] leading-relaxed max-h-40 overflow-y-auto">{stockInfo.description}</p></div>
                </div>
              </div>
            )}

            <div className="glass-card rounded-xl p-4 mb-8 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[var(--muted)] shrink-0 mt-0.5" />
              <div className="text-xs text-[var(--muted)] leading-relaxed">
                <strong>Disclaimer:</strong> Predictions are generated by an LSTM neural network running entirely in your browser. For informational purposes only — not financial advice.
              </div>
            </div>
          </>
        )}

        {!result && !loading && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Brain className="w-16 h-16 text-[var(--primary)] mx-auto mb-4 opacity-50" />
            <h2 className="text-xl font-semibold mb-2">AI-Powered Stock Predictions</h2>
            <p className="text-sm text-[var(--muted)] max-w-md mx-auto">
              Enter a stock ticker above or select a popular stock. An LSTM neural network will train in your browser and predict future prices.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              {POPULAR_STOCKS.slice(0, 6).map((s) => (
                <button key={s.ticker} onClick={() => { setTicker(s.ticker); handlePredict(s.ticker); }} className="px-4 py-2 rounded-xl bg-[var(--background)] border border-[var(--card-border)] text-sm hover:border-[var(--primary)] hover:text-[var(--primary-hover)] transition-all">
                  <span className="font-semibold">{s.ticker}</span>
                  <span className="text-[var(--muted)] ml-1.5 text-xs">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[var(--card-border)] py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-[var(--muted)]"><Brain className="w-4 h-4" /><span>StockAI &copy; {new Date().getFullYear()}</span></div>
          <p className="text-xs text-[var(--muted)]">LSTM runs 100% in your browser &middot; Not financial advice</p>
        </div>
      </footer>
    </div>
  );
}
