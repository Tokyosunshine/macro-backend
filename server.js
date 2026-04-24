const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const symbols = [
  { name: "USD/CHF", symbol: "CHF=X" },
  { name: "Oil", symbol: "CL=F" },
  { name: "Gold", symbol: "GC=F" },
  { name: "Silver", symbol: "SI=F" },
  { name: "SPX Futures", symbol: "ES=F" },
  { name: "SPY", symbol: "SPY" },
  { name: "VIX", symbol: "^VIX" },
  { name: "Bitcoin", symbol: "BTC-USD" }
];

// 🔥 RELIABLE DATA SOURCE ONLY
async function getPrices() {
  const results = [];

  for (const s of symbols) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.symbol}?range=1d&interval=5m`;

      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const chart = response.data?.chart?.result?.[0];

      if (!chart) throw new Error("No chart data");

      const closes = chart.indicators.quote[0].close;

      const valid = closes.filter(x => x !== null);

      if (valid.length < 2) throw new Error("Not enough data");

      const latest = valid[valid.length - 1];
      const prev = valid[0];

      const pctChange = ((latest - prev) / prev) * 100;

      results.push({
        name: s.name,
        symbol: s.symbol,
        price: latest,
        pctChange
      });

    } catch (err) {
      console.log("❌ Data error:", s.name, err.message);

      results.push({
        name: s.name,
        symbol: s.symbol,
        price: 0,
        pctChange: 0
      });
    }
  }

  console.log("✅ Prices:", results.map(r => r.price));

  return results;
}

// 📊 API
app.get("/api/prices", async (req, res) => {
  const prices = await getPrices();
  res.json(prices);
});

// 🤖 AI
app.get("/api/explain", async (req, res) => {
  const prices = await getPrices();

  const summary = prices
    .map(p => `${p.name}: ${p.pctChange.toFixed(2)}%`)
    .join(", ");

  const prompt = `
You are a macro strategist.

Market:
${summary}

Return JSON:
{
  "takeaway": "...",
  "action": "...",
  "confidence": number,
  "commentary": "4-6 sentences"
}
`;

  let result = {
    takeaway: "",
    action: "",
    confidence: null,
    commentary: "AI unavailable"
  };

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    result = JSON.parse(response.data.choices[0].message.content);

  } catch (err) {
    console.log("AI error:", err.message);
  }

  res.json(result);
});

app.get("/", (req, res) => {
  res.send("Backend running");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);