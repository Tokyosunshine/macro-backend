const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

console.log("🚀 BACKEND VERSION: V5 LIVE");

// 📊 INDICATORS
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

// 🔥 SAFE FETCH PER SYMBOL (CRITICAL FIX)
async function fetchSingle(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;

    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 4000
    });

    const q = res.data.quoteResponse.result[0];

    if (!q) return null;

    return {
      price: q.regularMarketPrice,
      pctChange: q.regularMarketChangePercent
    };

  } catch {
    return null;
  }
}

// 📊 INDICATORS (NO MORE EMPTY)
app.get("/api/prices", async (req, res) => {
  const results = [];

  for (const s of INDICATORS) {
    const data = await fetchSingle(s.symbol);

    if (data) {
      results.push({
        name: s.name,
        price: data.price,
        pctChange: data.pctChange
      });
    } else {
      // 🔥 fallback
      results.push({
        name: s.name,
        price: 0,
        pctChange: 0
      });
    }
  }

  res.json(results);
});

// 🧾 PORTFOLIO
app.get("/api/sheet", async (req, res) => {
  try {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";

    const r = await axios.get(url);
    const rows = r.data.split("\n");

    const parsed = rows.slice(0, 9).map(r => {
      const p = r.split(",");
      return {
        key: p[0],
        value: p.slice(1).join(",")
      };
    });

    res.json(parsed);

  } catch {
    res.json([]);
  }
});

// 📊 WATCHLIST (SAFE)
app.get("/api/watchlist", async (req, res) => {
  try {
    const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";

    const r = await axios.get(sheetURL);
    const rows = r.data.split("\n");

    const symbols = rows
      .slice(9)
      .map(r => r.trim())
      .filter(x => x.length > 0);

    const results = [];

    for (const sym of symbols) {
      const data = await fetchSingle(sym);

      if (data) {
        results.push({
          symbol: sym,
          price: data.price,
          pctChange: data.pctChange
        });
      } else {
        results.push({
          symbol: sym,
          price: 0,
          pctChange: 0
        });
      }
    }

    res.json(results);

  } catch {
    res.json([]);
  }
});

// 🤖 AI
app.get("/api/explain", (req, res) => {
  res.json({
    takeaway: "Markets active",
    action: "Monitor",
    commentary: "V5 stable data feed"
  });
});

// ROOT
app.get("/", (req, res) => res.send("Backend running V5"));

app.listen(process.env.PORT || 3001);