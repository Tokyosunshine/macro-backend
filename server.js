const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

console.log("🚀 BACKEND VERSION: V4 LIVE");

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

// 🔥 YAHOO FETCH
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
        : { name: s.name, price: null, pctChange: null };
    });

    res.json(result);

  } catch {
    res.json([]);
  }
});

// 🧾 PORTFOLIO (Google Sheet rows 1–9)
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

// 📊 WATCHLIST (Google Sheet rows 10+)
app.get("/api/watchlist", async (req, res) => {
  try {
    const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";

    const r = await axios.get(sheetURL);
    const rows = r.data.split("\n");

    const symbols = rows
      .slice(9)
      .map(r => r.trim())
      .filter(x => x.length > 0);

    if (symbols.length === 0) return res.json([]);

    const data = await fetchYahoo(symbols.join(","));

    const result = symbols.map(sym => {
      const q = data.find(x => x.symbol === sym);

      return q
        ? {
            symbol: sym,
            price: q.regularMarketPrice,
            pctChange: q.regularMarketChangePercent
          }
        : {
            symbol: sym,
            price: null,
            pctChange: null
          };
    });

    res.json(result);

  } catch {
    res.json([]);
  }
});

// 🤖 AI
app.get("/api/explain", (req, res) => {
  res.json({
    takeaway: "Markets active",
    action: "Monitor",
    commentary: "Backend V4 fully connected"
  });
});

// ROOT
app.get("/", (req, res) => res.send("Backend running V4"));

app.listen(process.env.PORT || 3001);