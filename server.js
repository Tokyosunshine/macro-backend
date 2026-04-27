const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

// 📊 INDICATORS
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

// 🔥 FETCH ALL INDICATORS (STABLE)
async function getPrices() {
  try {
    const symbolList = symbols.map(s => s.symbol).join(",");

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolList}`;

    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json"
      }
    });

    const quoteData = response.data.quoteResponse.result;

    return symbols.map(s => {
      const q = quoteData.find(x => x.symbol === s.symbol);

      if (!q) {
        return { name: s.name, price: null, pctChange: null };
      }

      return {
        name: s.name,
        price: q.regularMarketPrice,
        pctChange: q.regularMarketChangePercent
      };
    });

  } catch (err) {
    console.error("PRICE FETCH ERROR:", err.message);

    return symbols.map(s => ({
      name: s.name,
      price: null,
      pctChange: null
    }));
  }
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

  } catch {
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

    if (symbols.length === 0) return res.json([]);

    const symbolList = symbols.join(",");

    const yahooURL = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolList}`;

    const yahooRes = await axios.get(yahooURL, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const data = yahooRes.data.quoteResponse.result;

    const results = symbols.map(sym => {
      const q = data.find(x => x.symbol === sym);
      if (!q) return null;

      return {
        symbol: sym,
        price: q.regularMarketPrice,
        pctChange: q.regularMarketChangePercent,
        afterHours: q.postMarketChangePercent ?? null
      };
    }).filter(x => x !== null);

    res.json(results);

  } catch (err) {
    console.error("WATCHLIST ERROR:", err.message);
    res.json([]);
  }
});

// 🤖 AI (SAFE FALLBACK)
app.get("/api/explain", async (req, res) => {
  res.json({
    takeaway: "Markets updating",
    action: "Hold",
    commentary: "AI temporarily simplified for stability."
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

    res.json({
      totalReturn: (equity - 100).toFixed(2) + "%"
    });

  } catch {
    res.json({});
  }
});

// 📊 PRICES
app.get("/api/prices", async (req, res) => {
  res.json(await getPrices());
});

// ✅ ROOT ROUTE
app.get("/", (req, res) => {
  res.send("Backend running");
});

// 🚀 START SERVER
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});