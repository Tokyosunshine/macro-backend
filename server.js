const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 📊 Indicators
const symbols = [
  { name: "USD/CHF", symbol: "CHF=X" },
  { name: "DXY", symbol: "DX-Y.NYB" },
  { name: "US 10Y", symbol: "^TNX" },
  { name: "Oil", symbol: "CL=F" },
  { name: "Gold", symbol: "GC=F" },
  { name: "SPX Futures", symbol: "ES=F" },
  { name: "NASDAQ", symbol: "QQQ" },
  { name: "VIX", symbol: "^VIX" },
  { name: "Bitcoin", symbol: "BTC-USD" }
];

// 🔥 TEST ROUTE (use this to confirm deployment)
app.get("/api/test", (req, res) => {
  res.send("NEW VERSION WORKING");
});

// 🔥 MARKET DATA
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
        price: latest,
        pctChange
      });

    } catch (err) {
      console.log("❌ Data error:", s.name, err.message);

      results.push({
        name: s.name,
        price: 0,
        pctChange: 0
      });
    }
  }

  return results;
}

// 📊 PRICES
app.get("/api/prices", async (req, res) => {
  const prices = await getPrices();
  res.json(prices);
});

// 🧾 GOOGLE SHEET (YOUR LINK)
app.get("/api/sheet", async (req, res) => {
  try {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";

    const response = await axios.get(url);
    const rows = response.data.split("\n");

    // skip header row, clean quotes
    const parsed = rows
      .slice(1)
      .map(r => r.split(","))
      .filter(r => r.length >= 2 && r[0])
      .map(r => ({
        key: r[0].replace(/"/g, "").trim(),
        value: r[1] ? r[1].replace(/"/g, "").trim() : ""
      }));

    console.log("✅ SHEET:", parsed);

    res.json(parsed);

  } catch (err) {
    console.log("❌ Sheet error:", err.message);
    res.json([]);
  }
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

    try {
      result = JSON.parse(response.data.choices[0].message.content);
    } catch {
      console.log("⚠️ AI JSON parse issue");
    }

  } catch (err) {
    console.log("❌ AI error:", err.message);
  }

  res.json(result);
});

// ROOT
app.get("/", (req, res) => {
  res.send("Backend running");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});