const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

console.log("🚀 BACKEND VERSION: V6 (STABLE API)");

const API_KEY = process.env.TD_API_KEY;

// 📊 INDICATORS
const INDICATORS = [
  { name: "USD/CHF", symbol: "USD/CHF" },
  { name: "Oil", symbol: "WTI" },
  { name: "Gold", symbol: "XAU/USD" },
  { name: "Silver", symbol: "XAG/USD" },
  { name: "Copper", symbol: "HG" },
  { name: "SPY", symbol: "SPY" },
  { name: "VIX", symbol: "VIX" },
  { name: "Bitcoin", symbol: "BTC/USD" }
];

// 🔥 INDICATORS
app.get("/api/prices", async (req, res) => {
  try {
    const list = INDICATORS.map(s => s.symbol).join(",");

    const url = `https://api.twelvedata.com/price?symbol=${list}&apikey=${API_KEY}`;
    const r = await axios.get(url);

    const result = INDICATORS.map(s => ({
      name: s.name,
      price: parseFloat(r.data[s.symbol]?.price || 0),
      pctChange: 0
    }));

    res.json(result);

  } catch {
    res.json([]);
  }
});

// 📊 WATCHLIST
app.get("/api/watchlist", async (req, res) => {
  try {
    const symbols = ["AAPL", "MSFT", "GOOG"]; // temp test

    const url = `https://api.twelvedata.com/price?symbol=${symbols.join(",")}&apikey=${API_KEY}`;
    const r = await axios.get(url);

    const result = symbols.map(sym => ({
      symbol: sym,
      price: parseFloat(r.data[sym]?.price || 0),
      pctChange: 0
    }));

    res.json(result);

  } catch {
    res.json([]);
  }
});

// 🧾 PORTFOLIO (unchanged)
app.get("/api/sheet", (req, res) => {
  res.json([
    { key: "Cash", value: "$100,000" },
    { key: "Equity", value: "$250,000" }
  ]);
});

// 🤖 AI
app.get("/api/explain", (req, res) => {
  res.json({
    takeaway: "Stable",
    action: "Monitor",
    commentary: "Reliable data source active"
  });
});

app.get("/", (req, res) => res.send("Backend running V6"));

app.listen(process.env.PORT || 3001);