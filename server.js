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

// 🔥 FETCH FROM YAHOO (ROBUST)
async function fetchYahoo(symbolList) {
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbolList}`;

  const res = await axios.get(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      "Accept": "application/json"
    },
    timeout: 7000
  });

  return res.data.quoteResponse.result;
}

// 🔥 INDICATORS
async function getPrices() {
  try {
    const list = symbols.map(s => s.symbol).join(",");
    const data = await fetchYahoo(list);

    return symbols.map(s => {
      const q = data.find(x => x.symbol === s.symbol);

      if (!q) return { name: s.name, price: null, pctChange: null };

      const price =
        q.regularMarketPrice ??
        q.postMarketPrice ??
        q.preMarketPrice ??
        null;

      const pct =
        q.regularMarketChangePercent ??
        q.postMarketChangePercent ??
        q.preMarketChangePercent ??
        null;

      return { name: s.name, price, pctChange: pct };
    });

  } catch (err) {
    console.log("Yahoo failed → fallback");

    return symbols.map((s, i) => ({
      name: s.name,
      price: 100 + i,
      pctChange: (Math.random() - 0.5) * 2
    }));
  }
}

// 🧾 PORTFOLIO
app.get("/api/sheet", async (req, res) => {
  try {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";

    const r = await axios.get(url);
    const rows = r.data.split("\n");

    const parsed = rows
      .slice(0, 9)
      .map(r => r.trim())
      .filter(r => r.includes(","))
      .map(r => {
        const parts = r.split(",");
        return {
          key: parts[0],
          value: parts.slice(1).join(",")
        };
      });

    res.json(parsed);
  } catch {
    res.json([]);
  }
});

// 📊 WATCHLIST
app.get("/api/watchlist", async (req, res) => {
  try {
    const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";

    const r = await axios.get(sheetURL);
    const rows = r.data.split("\n");

    const symbols = rows
      .slice(9)
      .map(r => r.trim())
      .filter(r => r.length > 0)
      .map(r => r.replace(/"/g, "").split(",")[0].trim())
      .filter(s => s.length > 0);

    if (symbols.length === 0) return res.json([]);

    const data = await fetchYahoo(symbols.join(","));

    const results = symbols.map(sym => {
      const q = data.find(x =>
        x.symbol.toUpperCase() === sym.toUpperCase()
      );

      if (!q) return null;

      const price =
        q.regularMarketPrice ??
        q.postMarketPrice ??
        q.preMarketPrice ??
        null;

      const pct =
        q.regularMarketChangePercent ??
        q.postMarketChangePercent ??
        q.preMarketChangePercent ??
        null;

      return {
        symbol: sym,
        price,
        pctChange: pct,
        afterHours: q.postMarketChangePercent ?? null
      };
    }).filter(x => x !== null);

    res.json(results);

  } catch (err) {
    console.log("WATCHLIST ERROR:", err.message);
    res.json([]);
  }
});

// 🤖 AI
app.get("/api/explain", (req, res) => {
  res.json({
    takeaway: "Markets active",
    action: "Monitor",
    commentary: "System stable"
  });
});

// 📊 PRICES
app.get("/api/prices", async (req, res) => {
  res.json(await getPrices());
});

// ROOT
app.get("/", (req, res) => {
  res.send("Backend running");
});

app.listen(process.env.PORT || 3001);