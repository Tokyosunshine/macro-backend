const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

console.log("🚀 BACKEND VERSION: V8 HYBRID");

// 🔑 Twelve Data API Key
const TD_API_KEY = process.env.TD_API_KEY;

// 📊 INDICATORS (split by provider)
const YAHOO_SYMBOLS = [
  { name: "Oil", symbol: "CL=F" },
  { name: "Gold", symbol: "GC=F" },
  { name: "Silver", symbol: "SI=F" },
  { name: "VIX", symbol: "^VIX" }
];

const TD_SYMBOLS = [
  { name: "SPY", symbol: "SPY" },
  { name: "Bitcoin", symbol: "BTC/USD" },
  { name: "EUR/USD", symbol: "EUR/USD" }
];

// 🔥 YAHOO FETCH
async function fetchYahoo(symbols) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`;

    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 5000
    });

    return res.data.quoteResponse.result;
  } catch {
    return [];
  }
}

// 🔥 TWELVE DATA FETCH
async function fetchTD(symbols) {
  try {
    const url = `https://api.twelvedata.com/quote?symbol=${symbols.join(",")}&apikey=${TD_API_KEY}`;
    const res = await axios.get(url);
    return res.data;
  } catch {
    return {};
  }
}

// 📊 INDICATORS (HYBRID)
app.get("/api/prices", async (req, res) => {
  try {
    const yahooData = await fetchYahoo(YAHOO_SYMBOLS.map(s => s.symbol));
    const tdData = await fetchTD(TD_SYMBOLS.map(s => s.symbol));

    const yahooResults = YAHOO_SYMBOLS.map(s => {
      const q = yahooData.find(x => x.symbol === s.symbol);
      return {
        name: s.name,
        price: q?.regularMarketPrice ?? 0,
        pctChange: q?.regularMarketChangePercent ?? 0
      };
    });

    const tdResults = TD_SYMBOLS.map(s => {
      const q = tdData[s.symbol];
      return {
        name: s.name,
        price: q?.close ? parseFloat(q.close) : 0,
        pctChange: q?.percent_change ? parseFloat(q.percent_change) : 0
      };
    });

    res.json([...yahooResults, ...tdResults]);

  } catch {
    res.json([{ name: "Fallback", price: 0, pctChange: 0 }]);
  }
});

// 🧾 PORTFOLIO
app.get("/api/sheet", async (req, res) => {
  try {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";

    const r = await axios.get(url);
    const rows = r.data.split("\n");

    const parsed = rows.slice(0, 9).map(r => {
      const p = r.split(",");
      return { key: p[0], value: p.slice(1).join(",") };
    });

    res.json(parsed);
  } catch {
    res.json([]);
  }
});

// 📊 WATCHLIST (Yahoo only → correct values)
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

    const data = await fetchYahoo(symbols);

    const result = symbols.map(sym => {
      const q = data.find(x => x.symbol === sym);
      return {
        symbol: sym,
        price: q?.regularMarketPrice ?? 0,
        pctChange: q?.regularMarketChangePercent ?? 0
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
    takeaway: "Hybrid data active",
    action: "Monitor",
    commentary: "Stable + accurate feed"
  });
});

app.get("/", (req, res) => res.send("Backend running V8"));

app.listen(process.env.PORT || 3001);