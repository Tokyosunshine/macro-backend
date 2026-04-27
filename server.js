const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

// 🔥 VERSION CHECK (CRITICAL)
console.log("🚀 BACKEND VERSION: V3 LIVE");

// 📊 FULL INDICATOR SET (8)
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

// 🔥 FETCH YAHOO
async function fetchYahoo(symbols) {
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`;

  const res = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
  });

  return res.data.quoteResponse.result;
}

// 📊 INDICATORS
app.get("/api/prices", async (req, res) => {
  try {
    console.log("📊 Fetching indicators...");

    const list = INDICATORS.map(s => s.symbol).join(",");
    const data = await fetchYahoo(list);

    const result = INDICATORS.map(s => {
      const q = data.find(x => x.symbol === s.symbol);

      return q
        ? {
            name: s.name,
            price: q.regularMarketPrice,
            pctChange: q.regularMarketChangePercent
          }
        : {
            name: s.name,
            price: null,
            pctChange: null
          };
    });

    res.json(result);

  } catch (err) {
    console.log("❌ Yahoo failed");

    res.json([
      { name: "Oil", price: 95, pctChange: 0 },
      { name: "Gold", price: 2300, pctChange: 0 },
      { name: "SPY", price: 500, pctChange: 0 }
    ]);
  }
});

// 🧾 PORTFOLIO
app.get("/api/sheet", async (req, res) => {
  res.json([
    { key: "Cash", value: "$100,000" },
    { key: "Equity", value: "$250,000" }
  ]);
});

// 📊 WATCHLIST
app.get("/api/watchlist", async (req, res) => {
  res.json([
    { symbol: "AAPL", price: 180, pctChange: 1.2 },
    { symbol: "MSFT", price: 410, pctChange: -0.8 }
  ]);
});

// 🤖 AI
app.get("/api/explain", (req, res) => {
  res.json({
    takeaway: "System working",
    action: "Observe",
    commentary: "Backend version V3 live"
  });
});

// ROOT
app.get("/", (req, res) => {
  res.send("Backend running V3");
});

app.listen(process.env.PORT || 3001);