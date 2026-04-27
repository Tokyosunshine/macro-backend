const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

console.log("🚀 BACKEND VERSION: V7 CLEAN");

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

// 🔥 CORRECT FETCH FUNCTION
async function fetchPrices(symbols) {
  const url = `https://api.twelvedata.com/quote?symbol=${symbols.join(",")}&apikey=${API_KEY}`;
  const r = await axios.get(url);

  return r.data;
}

// 📊 INDICATORS
app.get("/api/prices", async (req, res) => {
  try {
    const data = await fetchPrices(INDICATORS.map(s => s.symbol));

    const result = INDICATORS.map(s => {
      const q = data[s.symbol];

      return {
        name: s.name,
        price: q?.close ? parseFloat(q.close) : null,
        pctChange: q?.percent_change ? parseFloat(q.percent_change) : null
      };
    });

    res.json(result);

  } catch (err) {
    console.log("Indicator error:", err.message);
    res.json([]);
  }
});

// 📊 WATCHLIST
app.get("/api/watchlist", async (req, res) => {
  try {
    // 🔥 replace with your real sheet later
    const symbols = ["AAPL", "MSFT", "GOOG"];

    const data = await fetchPrices(symbols);

    const result = symbols.map(sym => {
      const q = data[sym];

      return {
        symbol: sym,
        price: q?.close ? parseFloat(q.close) : null,
        pctChange: q?.percent_change ? parseFloat(q.percent_change) : null
      };
    });

    res.json(result);

  } catch (err) {
    console.log("Watchlist error:", err.message);
    res.json([]);
  }
});

// 🧾 PORTFOLIO (keep simple for now)
app.get("/api/sheet", (req, res) => {
  res.json([
    { key: "Cash", value: "$100,000" },
    { key: "Equity", value: "$250,000" }
  ]);
});

// 🤖 AI
app.get("/api/explain", (req, res) => {
  res.json({
    takeaway: "Stable data feed",
    action: "Monitor",
    commentary: "V7 correct parsing"
  });
});

app.get("/", (req, res) => res.send("Backend running V7"));

app.listen(process.env.PORT || 3001);