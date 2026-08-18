"use client";

import { useState, useCallback, useMemo } from "react";
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
  Sparkles,
  ArrowRight,
  Cpu,
  Shield,
  DollarSign,
  Clock,
  ChevronRight,
  Star,
} from "lucide-react";
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
import toast from "react-hot-toast";
import { format } from "date-fns";
import {
  runPrediction,
  fetchStockInfo,
  POPULAR_STOCKS,
  type PredictionResult,
} from "@/lib/engine";

function fmtDateFull(s: string) {
  return format(new Date(s), "MMM dd, yyyy");
}

function fmtDateShort(s: string) {
  return format(new Date(s), "MM/dd");
}

function fmtCur(v: number) {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  return `$${v.toFixed(2)}`;
}

type ChartEntry = {
  date: string;
  historical?: number;
  predicted?: number;
  upper?: number;
  lower?: number;
  current?: number;
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="glass"
      style={{
        padding: "12px 16px",
        borderRadius: 12,
        border: "1px solid var(--border)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        minWidth: 160,
      }}
    >
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: 12,
          marginBottom: 8,
          fontFamily: "var(--font-mono)",
        }}
      >
        {label}
      </p>
      {payload.map((p: any, i: number) => (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            marginBottom: 4,
            fontSize: 13,
          }}
        >
          <span style={{ color: p.color, fontWeight: 500 }}>{p.name}</span>
          <span
            style={{
              color: "var(--text)",
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
            }}
          >
            {p.value != null ? `$${p.value.toFixed(2)}` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Page() {
  const [ticker, setTicker] = useState("");
  const [predictionDays, setPredictionDays] = useState(30);
  const [period, setPeriod] = useState("2y");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [stockInfo, setStockInfo] = useState<any>(null);
  const [progress, setProgress] = useState("");
  const [activeTab, setActiveTab] = useState<"chart" | "info">("chart");

  const handlePredict = useCallback(async () => {
    const t = ticker.trim().toUpperCase();
    if (!t) {
      toast.error("Please enter a stock ticker");
      return;
    }
    setLoading(true);
    setResult(null);
    setStockInfo(null);
    setProgress("Initializing...");
    try {
      const [pred, info] = await Promise.all([
        runPrediction(t, predictionDays, setProgress),
        fetchStockInfo(t),
      ]);
      setResult(pred);
      setStockInfo(info);
      toast.success(`Prediction complete for ${t}`);
    } catch (err: any) {
      toast.error(err?.message || "Prediction failed");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }, [ticker, predictionDays]);

  const chartData = useMemo<ChartEntry[]>(() => {
    if (!result) return [];
    const map = new Map<string, ChartEntry>();
    for (const h of result.historical) {
      map.set(h.date, { date: h.date, historical: h.close });
    }
    const lastHistorical = result.historical[result.historical.length - 1];
    if (lastHistorical) {
      const e = map.get(lastHistorical.date);
      if (e) e.current = result.current_price;
    }
    for (const p of result.predictions) {
      const existing = map.get(p.date) || { date: p.date };
      existing.predicted = p.predicted;
      existing.upper = p.upper;
      existing.lower = p.lower;
      map.set(p.date, existing);
    }
    return Array.from(map.values());
  }, [result]);

  const changePct = useMemo(() => {
    if (!result) return 0;
    return (
      ((result.predicted_price - result.current_price) /
        result.current_price) *
      100
    );
  }, [result]);

  const isUp = changePct >= 0;

  return (
    <>
      <div className="bg-mesh">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <div className="grid-pattern" />

      <header
        className="glass fade-in"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 32px",
          borderRadius: 0,
          borderLeft: "none",
          borderRight: "none",
          borderTop: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Brain
            className="brain-spin"
            size={28}
            style={{ color: "var(--primary)" }}
          />
          <span
            className="gradient-text"
            style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5 }}
          >
            StockAI
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 13,
              color: "var(--success)",
              fontWeight: 500,
            }}
          >
            <span className="live-dot" />
            Live
          </div>
          <div
            className="pill"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "var(--text-secondary)",
              padding: "6px 12px",
            }}
          >
            <Cpu size={14} style={{ color: "var(--accent)" }} />
            TensorFlow.js
          </div>
        </div>
      </header>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 24px 80px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {!result && !loading && (
          <section
            className="fade-in"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              paddingTop: 80,
              paddingBottom: 40,
            }}
          >
            <div
              style={{
                position: "relative",
                marginBottom: 32,
              }}
            >
              <div
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: "50%",
                  background:
                    "linear-gradient(135deg, var(--primary-glow), var(--accent-glow))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    "0 0 60px var(--primary-glow), 0 0 120px var(--primary-glow)",
                  animation: "pulse 3s ease-in-out infinite",
                }}
              >
                <Brain
                  size={56}
                  style={{ color: "var(--text)" }}
                  className="brain-spin"
                />
              </div>
              <Sparkles
                size={20}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  color: "var(--accent)",
                  animation: "pulse 2s ease-in-out infinite",
                }}
              />
              <Sparkles
                size={14}
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: -12,
                  color: "var(--primary-light)",
                  animation: "pulse 2.5s ease-in-out infinite 0.5s",
                }}
              />
              <Zap
                size={16}
                style={{
                  position: "absolute",
                  top: 20,
                  left: -16,
                  color: "var(--success)",
                  animation: "pulse 2s ease-in-out infinite 1s",
                }}
              />
            </div>

            <h1
              className="gradient-text"
              style={{
                fontSize: 48,
                fontWeight: 900,
                letterSpacing: -1.5,
                lineHeight: 1.1,
                marginBottom: 16,
              }}
            >
              AI Stock Predictor
            </h1>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 18,
                maxWidth: 520,
                lineHeight: 1.6,
                marginBottom: 32,
              }}
            >
              Powered by LSTM neural networks with 16 technical indicators.
              Predictions run entirely in your browser — no data leaves your
              device.
            </p>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "center",
                marginBottom: 48,
              }}
            >
              {[
                {
                  icon: <Brain size={14} />,
                  label: "LSTM Neural Network",
                },
                {
                  icon: <BarChart3 size={14} />,
                  label: "16 Technical Indicators",
                },
                {
                  icon: <Shield size={14} />,
                  label: "Runs in Browser",
                },
                {
                  icon: <Activity size={14} />,
                  label: "Real-time Data",
                },
              ].map((f) => (
                <span
                  key={f.label}
                  className="pill"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                  }}
                >
                  <span style={{ color: "var(--primary-light)" }}>
                    {f.icon}
                  </span>
                  {f.label}
                </span>
              ))}
            </div>
          </section>
        )}

        <section
          className={`glass-glow ${result || loading ? "fade-in" : "fade-in-delay-1"}`}
          style={{
            borderRadius: 20,
            padding: result || loading ? "24px 28px" : "28px 32px",
            marginBottom: result || loading ? 24 : 0,
          }}
        >
          {(!result && !loading) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 20,
                color: "var(--text-muted)",
                fontSize: 13,
              }}
            >
              <Zap size={14} style={{ color: "var(--accent)" }} />
              Enter a ticker to begin prediction
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "stretch",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                flex: "1 1 280px",
                position: "relative",
              }}
            >
              <Search
                size={18}
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="text"
                placeholder="Enter stock ticker (e.g. AAPL, MSFT, GOOGL)"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handlePredict()}
                style={{
                  width: "100%",
                  padding: "16px 16px 16px 48px",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text)",
                  fontSize: 16,
                  fontWeight: 500,
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  fontFamily: "var(--font-mono)",
                  letterSpacing: 1,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.boxShadow =
                    "0 0 0 3px var(--primary-glow)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            <div style={{ position: "relative", flex: "0 0 auto" }}>
              <Calendar
                size={14}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                style={{
                  padding: "16px 40px 16px 38px",
                  borderRadius: 14,
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text)",
                  fontSize: 14,
                  fontWeight: 500,
                  outline: "none",
                  cursor: "pointer",
                  appearance: "none",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <option value="1y">1 Year</option>
                <option value="2y">2 Years</option>
                <option value="5y">5 Years</option>
                <option value="max">Max</option>
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                  pointerEvents: "none",
                }}
              />
            </div>

            <button
              className="btn-glow"
              onClick={handlePredict}
              disabled={loading || !ticker.trim()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "16px 32px",
                borderRadius: 14,
                fontSize: 15,
                fontWeight: 700,
                border: "none",
                cursor: loading || !ticker.trim() ? "not-allowed" : "pointer",
                opacity: loading || !ticker.trim() ? 0.6 : 1,
                flex: "0 0 auto",
                letterSpacing: 0.3,
              }}
            >
              {loading ? (
                <Loader2 size={18} className="brain-spin" />
              ) : (
                <Brain size={18} />
              )}
              {loading ? "Predicting..." : "Predict"}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "var(--text-muted)",
                flexShrink: 0,
              }}
            >
              <Clock size={13} />
              <span>Days: {predictionDays}</span>
            </div>
            <input
              type="range"
              min={7}
              max={90}
              value={predictionDays}
              onChange={(e) => setPredictionDays(Number(e.target.value))}
              style={{
                flex: 1,
                maxWidth: 240,
                accentColor: "var(--primary)",
                height: 6,
              }}
            />
          </div>

          {!result && !loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginTop: 16,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginRight: 4,
                }}
              >
                Quick select:
              </span>
              {POPULAR_STOCKS.slice(0, 8).map((s) => (
                <button
                  key={s.ticker}
                  className="pill"
                  onClick={() => setTicker(s.ticker)}
                  style={{
                    padding: "6px 14px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    color:
                      ticker === s.ticker
                        ? "var(--text)"
                        : "var(--text-secondary)",
                    background:
                      ticker === s.ticker
                        ? "var(--primary-glow)"
                        : "transparent",
                    transition: "all 0.2s",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {s.ticker}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 400,
                      color: "var(--text-muted)",
                    }}
                  >
                    {s.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        {loading && (
          <section
            className="glass fade-in"
            style={{
              borderRadius: 20,
              padding: "80px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div style={{ position: "relative", marginBottom: 32 }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  border: "3px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <Brain
                  size={36}
                  className="brain-spin"
                  style={{ color: "var(--primary)" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: -8,
                    borderRadius: "50%",
                    border: "2px solid var(--primary-glow)",
                    opacity: 0.4,
                    animation: "pulse 2s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: -18,
                    borderRadius: "50%",
                    border: "1px solid var(--primary-glow)",
                    opacity: 0.2,
                    animation: "pulse 2s ease-in-out infinite 0.5s",
                  }}
                />
              </div>
            </div>
            <h3
              style={{
                color: "var(--text)",
                fontSize: 20,
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              Analyzing {ticker.toUpperCase()}...
            </h3>
            <p
              style={{
                color: "var(--text-secondary)",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
              }}
            >
              {progress || "Loading model..."}
            </p>
            <div
              style={{
                marginTop: 24,
                display: "flex",
                gap: 24,
                color: "var(--text-muted)",
                fontSize: 12,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Loader2 size={12} className="brain-spin" /> Fetching data
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Activity size={12} /> Computing indicators
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Brain size={12} className="brain-spin" /> Training LSTM
              </span>
            </div>
          </section>
        )}

        {result && !loading && (
          <>
            <section
              className="fade-in"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 16,
                marginBottom: 16,
              }}
            >
              {[
                {
                  icon: <DollarSign size={20} />,
                  label: "Current Price",
                  value: `$${result.current_price.toFixed(2)}`,
                  color: "var(--text)",
                  ringColor: "var(--primary)",
                },
                {
                  icon: <Target size={20} />,
                  label: "Predicted Price",
                  value: `$${result.predicted_price.toFixed(2)}`,
                  color: "var(--primary-light)",
                  ringColor: "var(--accent)",
                  isGradient: true,
                },
                {
                  icon: isUp ? <TrendingUp size={20} /> : <TrendingDown size={20} />,
                  label: "Expected Change",
                  value: `${isUp ? "+" : ""}${changePct.toFixed(2)}%`,
                  color: isUp ? "var(--success)" : "var(--danger)",
                  ringColor: isUp ? "var(--success)" : "var(--danger)",
                },
                {
                  icon: isUp ? <ArrowRight size={20} /> : <TrendingDown size={20} />,
                  label: "Direction",
                  value: result.prediction_direction,
                  color: isUp ? "var(--success)" : "var(--danger)",
                  ringColor: isUp ? "var(--success)" : "var(--danger)",
                },
              ].map((card, i) => (
                <div
                  key={card.label}
                  className={`stat-card glass fade-in-delay-${Math.min(i + 1, 4)}`}
                  style={{
                    borderRadius: 16,
                    padding: "22px 24px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      {card.label}
                    </span>
                    <div className="metric-ring" style={{ borderColor: card.ringColor }}>
                      <span style={{ color: card.ringColor }}>{card.icon}</span>
                    </div>
                  </div>
                  <span
                    className={card.isGradient ? "gradient-text" : ""}
                    style={{
                      fontSize: 28,
                      fontWeight: 800,
                      color: card.isGradient ? undefined : card.color,
                      fontFamily: "var(--font-mono)",
                      letterSpacing: -0.5,
                    }}
                  >
                    {card.value}
                  </span>
                </div>
              ))}
            </section>

            <section
              className="fade-in fade-in-delay-2"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                marginBottom: 24,
              }}
            >
              {[
                {
                  icon: <Target size={18} />,
                  label: "MAE",
                  value: result.metrics.mae.toFixed(4),
                  color: "var(--primary-light)",
                },
                {
                  icon: <Activity size={18} />,
                  label: "RMSE",
                  value: result.metrics.rmse.toFixed(4),
                  color: "var(--accent-light)",
                },
                {
                  icon: <BarChart3 size={18} />,
                  label: "MAPE",
                  value: `${result.metrics.mape.toFixed(2)}%`,
                  color: "var(--success)",
                },
              ].map((m) => (
                <div
                  key={m.label}
                  className="glass stat-card"
                  style={{
                    borderRadius: 14,
                    padding: "18px 20px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div className="metric-ring" style={{ borderColor: m.color }}>
                    <span style={{ color: m.color }}>{m.icon}</span>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                        fontWeight: 500,
                        marginBottom: 2,
                      }}
                    >
                      {m.label}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 700,
                        color: "var(--text)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {m.value}
                    </div>
                  </div>
                </div>
              ))}
            </section>

            <section className="fade-in fade-in-delay-3" style={{ marginBottom: 24 }}>
              <div
                className="glass"
                style={{
                  display: "flex",
                  borderRadius: 14,
                  padding: 4,
                  gap: 4,
                  width: "fit-content",
                  marginBottom: 16,
                }}
              >
                {(
                  [
                    { key: "chart" as const, label: "Chart", icon: <LineChart size={15} /> },
                    { key: "info" as const, label: "Company Info", icon: <Info size={15} /> },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "10px 20px",
                      borderRadius: 10,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 600,
                      transition: "all 0.2s",
                      background:
                        activeTab === tab.key
                          ? "var(--primary)"
                          : "transparent",
                      color:
                        activeTab === tab.key
                          ? "var(--text)"
                          : "var(--text-muted)",
                    }}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === "chart" && (
                <div
                  className="glass"
                  style={{ borderRadius: 20, padding: "28px 24px 20px" }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 20,
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: 18,
                          fontWeight: 700,
                          color: "var(--text)",
                          marginBottom: 4,
                        }}
                      >
                        Price History & Prediction
                      </h3>
                      <p
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                        }}
                      >
                        {result.historical.length} days historical •{" "}
                        {result.predictions.length} days predicted
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12 }}>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 3,
                            borderRadius: 2,
                            background: "var(--primary)",
                            display: "inline-block",
                          }}
                        />
                        Historical
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--text-secondary)",
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 3,
                            borderRadius: 2,
                            background: isUp
                              ? "var(--success)"
                              : "var(--danger)",
                            display: "inline-block",
                          }}
                        />
                        Predicted
                      </span>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          color: "var(--text-muted)",
                        }}
                      >
                        <span
                          style={{
                            width: 20,
                            height: 1,
                            borderTop: "2px dashed var(--text-muted)",
                            display: "inline-block",
                          }}
                        />
                        Bounds
                      </span>
                    </div>
                  </div>

                  <div style={{ width: "100%", height: 420 }}>
                    <ResponsiveContainer>
                      <ComposedChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="gradHistorical"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor="var(--primary)"
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="100%"
                              stopColor="var(--primary)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="gradPrediction"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="0%"
                              stopColor={
                                isUp ? "var(--success)" : "var(--danger)"
                              }
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="100%"
                              stopColor={
                                isUp ? "var(--success)" : "var(--danger)"
                              }
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="var(--border)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="date"
                          tickFormatter={fmtDateShort}
                          stroke="var(--text-muted)"
                          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                          tickLine={false}
                          axisLine={false}
                          interval="preserveStartEnd"
                        />
                        <YAxis
                          stroke="var(--text-muted)"
                          tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `$${v}`}
                          domain={["auto", "auto"]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine
                          y={result.current_price}
                          stroke="var(--text-muted)"
                          strokeDasharray="6 4"
                          strokeWidth={1}
                          label={{
                            value: "Current",
                            position: "right",
                            fill: "var(--text-muted)",
                            fontSize: 11,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="historical"
                          fill="url(#gradHistorical)"
                          stroke="none"
                          name="Historical"
                        />
                        <Area
                          type="monotone"
                          dataKey="upper"
                          fill="none"
                          stroke="transparent"
                          name="Upper Bound"
                        />
                        <Area
                          type="monotone"
                          dataKey="lower"
                          fill="url(#gradPrediction)"
                          stroke="none"
                          name="Lower Bound"
                        />
                        <Line
                          type="monotone"
                          dataKey="historical"
                          stroke="var(--primary)"
                          strokeWidth={2.5}
                          dot={false}
                          name="Historical"
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="upper"
                          stroke={
                            isUp ? "var(--success)" : "var(--danger)"
                          }
                          strokeWidth={1}
                          strokeDasharray="4 4"
                          dot={false}
                          name="Upper Bound"
                          opacity={0.4}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="lower"
                          stroke={
                            isUp ? "var(--success)" : "var(--danger)"
                          }
                          strokeWidth={1}
                          strokeDasharray="4 4"
                          dot={false}
                          name="Lower Bound"
                          opacity={0.4}
                          connectNulls={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="predicted"
                          stroke={
                            isUp ? "var(--success)" : "var(--danger)"
                          }
                          strokeWidth={2.5}
                          dot={false}
                          name="Predicted"
                          connectNulls={false}
                        />
                        <Legend
                          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {activeTab === "info" && stockInfo && (
                <div
                  className="glass"
                  style={{ borderRadius: 20, padding: 32 }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(200px, 1fr))",
                      gap: 24,
                    }}
                  >
                    {[
                      {
                        label: "Company",
                        value: stockInfo.name || "—",
                        icon: <Info size={16} />,
                      },
                      {
                        label: "Sector",
                        value: stockInfo.sector || "—",
                        icon: <BarChart3 size={16} />,
                      },
                      {
                        label: "Industry",
                        value: stockInfo.industry || "—",
                        icon: <Activity size={16} />,
                      },
                      {
                        label: "Market Cap",
                        value: stockInfo.marketCap
                          ? fmtCur(stockInfo.marketCap)
                          : "—",
                        icon: <DollarSign size={16} />,
                      },
                      {
                        label: "P/E Ratio",
                        value: stockInfo.pe
                          ? stockInfo.pe.toFixed(2)
                          : "—",
                        icon: <TrendingUp size={16} />,
                      },
                    ].map((item) => (
                      <div key={item.label}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 12,
                            color: "var(--text-muted)",
                            textTransform: "uppercase",
                            letterSpacing: 0.8,
                            fontWeight: 500,
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ color: "var(--primary-light)" }}>
                            {item.icon}
                          </span>
                          {item.label}
                        </div>
                        <div
                          style={{
                            fontSize: 16,
                            fontWeight: 600,
                            color: "var(--text)",
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                  {stockInfo.description && (
                    <div style={{ marginTop: 28 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                          fontWeight: 500,
                          marginBottom: 8,
                        }}
                      >
                        Description
                      </div>
                      <p
                        style={{
                          fontSize: 14,
                          color: "var(--text-secondary)",
                          lineHeight: 1.7,
                          maxHeight: 160,
                          overflow: "auto",
                        }}
                      >
                        {stockInfo.description}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "info" && !stockInfo && (
                <div
                  className="glass"
                  style={{
                    borderRadius: 20,
                    padding: "48px 32px",
                    textAlign: "center",
                  }}
                >
                  <Info
                    size={32}
                    style={{ color: "var(--text-muted)", marginBottom: 12 }}
                  />
                  <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
                    Company info unavailable for this ticker.
                  </p>
                </div>
              )}
            </section>

            <div
              className="glass fade-in fade-in-delay-4"
              style={{
                borderRadius: 14,
                padding: "16px 20px",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontSize: 12,
                color: "var(--text-muted)",
                lineHeight: 1.6,
                borderLeft: "3px solid var(--accent)",
              }}
            >
              <AlertCircle
                size={16}
                style={{
                  color: "var(--accent)",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              />
              <span>
                <strong style={{ color: "var(--text-secondary)" }}>
                  Disclaimer:
                </strong>{" "}
                This prediction is generated by an LSTM neural network model
                running entirely in your browser. It is for educational and
                research purposes only. Do not use these predictions as the sole
                basis for investment decisions. Past performance does not
                guarantee future results.
              </span>
            </div>
          </>
        )}
      </main>

      <footer
        style={{
          position: "relative",
          zIndex: 1,
          textAlign: "center",
          padding: "32px 24px 40px",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <Brain size={16} style={{ color: "var(--primary)" }} />
          <span
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
              fontWeight: 500,
            }}
          >
            StockAI &copy; {new Date().getFullYear()}
          </span>
        </div>
        <div
          className="pill"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 12px",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          <Shield size={11} />
          100% Client-Side
        </div>
      </footer>
    </>
  );
}