const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

console.log("🚀 BACKEND VERSION: ROLLBACK 8 INDICATORS");

// 🔥 YOUR WORKING SET
const INDICATORS = [
  { name: "USD/CHF", symbol: "CHF=X" },
  { name: "Oil", symbol: "CL=F" },
  { name: "Gold", symbol: "GC=F" },
  { name: "Silver", symbol: "SI=F" },
  { name: "Copper", symbol: "HG=F" },
  { name: "SPY", symbol: "SPY" },
  { name: "VIX", symbol: "^VIX" },
  { name: "Bitcoin", symbol: "BTC-USD" }
];

// 🔥 SINGLE YAHOO REQUEST (THIS WAS WORKING)
async function fetchYahoo() {
  const symbols = INDICATORS.map(s => s.symbol).join(",");

  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;

  const res = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  return res.data.quoteResponse.result;
}

// 📊 INDICATORS
app.get("/api/prices", async (req, res) => {
  try {
    const data = await fetchYahoo();

    const result = INDICATORS.map(s => {
      const q = data.find(x => x.symbol === s.symbol);

      return {
        name: s.name,
        price: q?.regularMarketPrice ?? 0,
        pctChange: q?.regularMarketChangePercent ?? 0
      };
    });

    res.json(result);

  } catch {
    res.json(INDICATORS.map(s => ({
      name: s.name,
      price: 0,
      pctChange: 0
    })));
  }
});

// 🧾 PORTFOLIO (keep simple)
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
    commentary: "Rollback 8-indicator version"
  });
});

app.get("/", (req, res) => res.send("Backend running 8-indicator rollback"));

app.listen(process.env.PORT || 3001);