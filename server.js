const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const API_KEY = process.env.TD_API_KEY;

// 📊 INDICATORS (Twelve Data symbols)
const symbols = [
  { name: "USD/CHF", symbol: "USD/CHF" },
  { name: "Oil", symbol: "WTI" },
  { name: "Gold", symbol: "XAU/USD" },
  { name: "Silver", symbol: "XAG/USD" },
  { name: "Copper", symbol: "HG" },
  { name: "US 10Y", symbol: "US10Y" },
  { name: "SPY", symbol: "SPY" },
  { name: "VIX", symbol: "VIX" },
  { name: "Bitcoin", symbol: "BTC/USD" }
];

// 🔥 FETCH INDICATORS
app.get("/api/prices", async (req, res) => {
  try {
    const list = symbols.map(s => s.symbol).join(",");

    const url = `https://api.twelvedata.com/price?symbol=${list}&apikey=${API_KEY}`;

    const r = await axios.get(url);

    const results = symbols.map(s => ({
      name: s.name,
      price: parseFloat(r.data[s.symbol]?.price || 0),
      pctChange: 0 // free tier limitation
    }));

    res.json(results);

  } catch (err) {
    console.log(err.message);
    res.json([]);
  }
});

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
      .filter(r => r.length > 0);

    if (symbols.length === 0) return res.json([]);

    const list = symbols.join(",");

    const url = `https://api.twelvedata.com/price?symbol=${list}&apikey=${API_KEY}`;
    const resp = await axios.get(url);

    const data = resp.data;

    const results = symbols.map(sym => ({
      symbol: sym,
      price: parseFloat(data[sym]?.price || 0),
      pctChange: 0
    }));

    res.json(results);

  } catch (err) {
    console.log(err.message);
    res.json([]);
  }
});

// 🤖 AI
app.get("/api/explain", (req, res) => {
  res.json({
    takeaway: "Stable",
    action: "Monitor",
    commentary: "Reliable data feed active"
  });
});

// ROOT
app.get("/", (req, res) => {
  res.send("Backend running");
});

app.listen(process.env.PORT || 3001);