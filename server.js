const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 🔍 Debug: confirm key exists
console.log("OPENAI KEY EXISTS:", !!OPENAI_API_KEY);

const symbols = [
  { name: "USD/CHF", symbol: "CHF=X" },
  { name: "Oil", symbol: "CL=F" },
  { name: "Gold", symbol: "GC=F" },
  { name: "Silver", symbol: "SI=F" },
  { name: "SPY", symbol: "SPY" },
  { name: "VIX", symbol: "^VIX" },
  { name: "Bitcoin", symbol: "BTC-USD" }
];

// 📊 Fetch market data
async function getPrices() {
  const results = [];

  for (const s of symbols) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.symbol}?range=2d&interval=5m`;

    const response = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const chart = response.data.chart.result[0];
    const closes = chart.indicators.quote[0].close;
    const timestamps = chart.timestamp;

    const latest = closes.slice().reverse().find(x => x !== null);

    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    yesterday.setHours(20, 0, 0, 0); // 4pm ET

    let refPrice = null;
    let minDiff = Infinity;

    timestamps.forEach((ts, i) => {
      if (!closes[i]) return;
      const time = new Date(ts * 1000);
      const diff = Math.abs(time - yesterday);
      if (diff < minDiff) {
        minDiff = diff;
        refPrice = closes[i];
      }
    });

    let pctChange = null;
    if (latest && refPrice) {
      pctChange = ((latest - refPrice) / refPrice) * 100;
    }

    results.push({
      name: s.name,
      price: latest,
      pctChange: pctChange
    });
  }

  return results;
}

// 📈 Prices endpoint
app.get("/api/prices", async (req, res) => {
  try {
    const prices = await getPrices();
    res.json(prices);
  } catch (err) {
    console.error("PRICE ERROR:", err.message);
    res.status(500).send("Error fetching prices");
  }
});

// 🤖 AI Explanation endpoint
app.get("/api/explain", async (req, res) => {
  try {
    const prices = await getPrices();

    const summary = prices
      .map(p => `${p.name}: ${p.pctChange?.toFixed(2)}%`)
      .join(", ");

    const prompt = `
You are a macro strategist.

Given the following market moves:
${summary}

Explain what is happening in markets in 2-3 sentences.
Focus on macro interpretation (rates, risk sentiment, inflation).
`;

    let explanation = "AI temporarily unavailable.";

    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",  // safest model
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          }
        }
      );

      explanation = response.data.choices[0].message.content;

    } catch (err) {
      console.error(
        "OPENAI ERROR FULL:",
        JSON.stringify(err.response?.data || err.message)
      );

      explanation =
        "ERROR: " +
        (err.response?.data?.error?.message || err.message);
    }

    res.json({ explanation });

  } catch (err) {
    console.error("EXPLAIN ERROR:", err.message);
    res.status(500).send("AI error");
  }
});

// 🌐 Root route
app.get("/", (req, res) => {
  res.send("Macro backend is running");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));