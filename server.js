const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 📊 CORE INDICATORS
const symbols = [
  { name: "USD/CHF", symbol: "CHF=X" },
  { name: "Oil", symbol: "CL=F" },
  { name: "Gold", symbol: "GC=F" },
  { name: "Silver", symbol: "SI=F" },
  { name: "Copper", symbol: "HG=F" },
  { name: "US 10Y", symbol: "^TNX" },
  { name: "SPX Futures", symbol: "ES=F" },
  { name: "SPY", symbol: "SPY" },
  { name: "VIX", symbol: "^VIX" },
  { name: "Bitcoin", symbol: "BTC-USD" }
];

// 🔥 SAFE INDICATOR FETCH
async function getPrices() {
  const results = [];

  for (const s of symbols) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.symbol}?range=1d&interval=5m`;
      const response = await axios.get(url);

      const result = response.data.chart?.result?.[0];
      if (!result) throw new Error("No chart result");

      const closes = result.indicators?.quote?.[0]?.close || [];
      const valid = closes.filter(x => x !== null);

      if (valid.length === 0) throw new Error("No valid prices");

      const latest = valid[valid.length - 1];
      const prev = result.meta?.previousClose;

      const pctChange = prev
        ? ((latest - prev) / prev) * 100
        : 0;

      results.push({
        name: s.name,
        price: latest,
        pctChange
      });

    } catch (err) {
      console.log("Indicator failed:", s.symbol);
      results.push({
        name: s.name,
        price: null,
        pctChange: null
      });
    }
  }

  return results;
}

// 🧾 PORTFOLIO (ROWS 1–9)
app.get("/api/sheet", async (req, res) => {
  try {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";
    const response = await axios.get(url);

    const rows = response.data.split("\n");

    const parsed = rows
      .slice(0, 9)
      .map(r => r.trim())
      .filter(r => r.includes(","))
      .map(r => {
        const parts = r.split(",");
        return {
          key: parts[0].replace(/"/g, "").trim(),
          value: parts.slice(1).join(",").replace(/"/g, "").trim()
        };
      });

    res.json(parsed);

  } catch (err) {
    console.error("Sheet error:", err.message);
    res.json([]);
  }
});

// 📊 WATCHLIST (ROWS 10+)
app.get("/api/watchlist", async (req, res) => {
  try {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";
    const response = await axios.get(url);

    const rows = response.data.split("\n");

    const symbols = rows
      .slice(9)
      .map(r => r.trim())
      .filter(r => r.length > 0)
      .map(r => r.replace(/"/g, "").split(",")[0])
      .filter(s => s.length > 0);

    const results = [];

    for (const symbol of symbols) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`;
        const response = await axios.get(url);

        const result = response.data.chart?.result?.[0];
        if (!result) continue;

        const closes = result.indicators?.quote?.[0]?.close || [];
        const valid = closes.filter(x => x !== null);

        if (valid.length === 0) continue;

        const last = valid[valid.length - 1];
        const prev = result.meta?.previousClose;

        const pct = prev
          ? ((last - prev) / prev) * 100
          : 0;

        const post = result.meta?.postMarketPrice;
        const postPct = post && last
          ? ((post - last) / last) * 100
          : null;

        results.push({
          symbol,
          price: last,
          pctChange: pct,
          afterHours: postPct
        });

      } catch {
        console.log("Watchlist symbol failed:", symbol);
      }
    }

    res.json(results);

  } catch (err) {
    console.error("Watchlist error:", err.message);
    res.json([]);
  }
});

// 🤖 AI (safe fallback)
app.get("/api/explain", async (req, res) => {
  res.json({
    takeaway: "Markets mixed",
    action: "Hold",
    commentary: "AI temporarily disabled or awaiting API key."
  });
});

// 📊 BACKTEST
app.get("/api/backtest", async (req, res) => {
  try {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/SPY?range=6mo&interval=1d";
    const response = await axios.get(url);

    const closes = response.data.chart.result[0].indicators.quote[0].close;
    const clean = closes.filter(x => x !== null);

    let equity = 100;

    for (let i = 1; i < clean.length; i++) {
      const r = (clean[i] - clean[i - 1]) / clean[i - 1];
      const pnl = (r > 0 ? 1 : -1) * r;
      equity *= (1 + pnl);
    }

    res.json({ totalReturn: (equity - 100).toFixed(2) + "%" });

  } catch (err) {
    res.json({});
  }
});

// 📊 PRICES
app.get("/api/prices", async (req, res) => {
  res.json(await getPrices());
});

// ✅ ROOT ROUTE (CRITICAL FIX)
app.get("/", (req, res) => {
  res.send("Backend running");
});

// START
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Server running on port " + PORT));