const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

// 📊 INDICATORS
const symbols = [
  { name: "USD/CHF", symbol: "CHF=X", type: "fx" },
  { name: "Oil", symbol: "CL=F", type: "future" },
  { name: "Gold", symbol: "GC=F", type: "future" },
  { name: "Silver", symbol: "SI=F", type: "future" },
  { name: "Copper", symbol: "HG=F", type: "future" },
  { name: "US 10Y", symbol: "^TNX", type: "rate" },
  { name: "SPX Futures", symbol: "ES=F", type: "future" },
  { name: "SPY", symbol: "SPY", type: "equity" },
  { name: "VIX", symbol: "^VIX", type: "index" },
  { name: "Bitcoin", symbol: "BTC-USD", type: "crypto" }
];

// 🔥 FETCH YAHOO
async function fetchYahoo(list) {
  const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${list}`;
  const res = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" }
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

      if (!q) {
        console.log("Missing symbol:", s.symbol);
        return { name: s.name, price: null, pctChange: null };
      }

      let price = q.regularMarketPrice;
      let pct = q.regularMarketChangePercent;

      // 🔥 FIX RATE (TNX)
      if (s.type === "rate" && price) {
        price = price / 10;
      }

      // 🔥 FX sometimes missing pct
      if (s.type === "fx" && pct == null) {
        pct = 0;
      }

      return {
        name: s.name,
        price,
        pctChange: pct
      };
    });

  } catch (err) {
    console.log("Yahoo failed");
    return symbols.map(s => ({
      name: s.name,
      price: null,
      pctChange: null
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
      .map(r => r.replace(/"/g, "").split(",")[0].trim());

    if (symbols.length === 0) return res.json([]);

    console.log("Watchlist symbols:", symbols);

    const data = await fetchYahoo(symbols.join(","));

    const results = [];

    for (const sym of symbols) {
      const q = data.find(x => x.symbol === sym);

      if (!q) {
        console.log("Not found:", sym);
        continue;
      }

      results.push({
        symbol: sym,
        price: q.regularMarketPrice,
        pctChange: q.regularMarketChangePercent,
        afterHours: q.postMarketChangePercent ?? null
      });
    }

    res.json(results);

  } catch (err) {
    console.log("Watchlist error:", err.message);
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