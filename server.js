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
  { name: "SPY", symbol: "SPY" },
  { name: "VIX", symbol: "^VIX" },
  { name: "Bitcoin", symbol: "BTC-USD" }
];

// 🔥 FETCH (simple + reliable)
async function getPrices() {
  try {
    const list = symbols.map(s => s.symbol).join(",");
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${list}`;

    const res = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const data = res.data.quoteResponse.result;

    return symbols.map(s => {
      const q = data.find(x => x.symbol === s.symbol);

      return q
        ? {
            name: s.name,
            price: q.regularMarketPrice || null,
            pctChange: q.regularMarketChangePercent || null
          }
        : { name: s.name, price: null, pctChange: null };
    });

  } catch {
    return symbols.map(s => ({
      name: s.name,
      price: null,
      pctChange: null
    }));
  }
}

// 📊 INDICATORS
app.get("/api/prices", async (req, res) => {
  res.json(await getPrices());
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

// 📊 WATCHLIST
app.get("/api/watchlist", async (req, res) => {
  try {
    const sheetURL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";

    const r = await axios.get(sheetURL);
    const rows = r.data.split("\n");

    const symbols = rows.slice(9).map(r => r.trim()).filter(x => x);

    if (symbols.length === 0) return res.json([]);

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(",")}`;

    const res2 = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const data = res2.data.quoteResponse.result;

    const results = symbols.map(sym => {
      const q = data.find(x => x.symbol === sym);
      return q
        ? {
            symbol: sym,
            price: q.regularMarketPrice || null,
            pctChange: q.regularMarketChangePercent || null
          }
        : null;
    }).filter(x => x);

    res.json(results);

  } catch {
    res.json([]);
  }
});

// 🤖 AI
app.get("/api/explain", (req, res) => {
  res.json({
    takeaway: "Markets stable",
    action: "Hold",
    commentary: "Data feed active"
  });
});

// ROOT
app.get("/", (req, res) => res.send("Backend running"));

app.listen(process.env.PORT || 3001);