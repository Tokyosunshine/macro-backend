const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ✅ INDICATORS (UPDATED)
const symbols = [
  { name: "USD/CHF", symbol: "CHF=X" },
  { name: "Oil", symbol: "CL=F" },
  { name: "Gold", symbol: "GC=F" },
  { name: "Silver", symbol: "SI=F" },
  { name: "Copper", symbol: "HG=F" },       // NEW
  { name: "US 10Y", symbol: "^TNX" },       // NEW
  { name: "SPX Futures", symbol: "ES=F" },
  { name: "SPY", symbol: "SPY" },
  { name: "VIX", symbol: "^VIX" },
  { name: "Bitcoin", symbol: "BTC-USD" }
];

// 📊 MARKET DATA
async function getPrices() {
  const results = [];

  for (const s of symbols) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.symbol}?range=1d&interval=5m`;

      const response = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      const chart = response.data.chart.result[0];
      const closes = chart.indicators.quote[0].close;
      const valid = closes.filter(x => x !== null);

      const latest = valid[valid.length - 1];
      const prev = valid[0];

      const pctChange = ((latest - prev) / prev) * 100;

      results.push({
        name: s.name,
        price: latest,
        pctChange
      });

    } catch {
      results.push({
        name: s.name,
        price: 0,
        pctChange: 0
      });
    }
  }

  return results;
}

// 🧾 GOOGLE SHEET
app.get("/api/sheet", async (req, res) => {
  try {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";

    const response = await axios.get(url);

    const rows = response.data.split("\n");

    const parsed = rows
      .map(r => r.trim())
      .filter(r => r.length > 0)
      .map(r => {
        const parts = r.split(/,(.+)/);
        return {
          key: parts[0]?.replace(/"/g, "").trim(),
          value: parts[1]?.replace(/"/g, "").trim()
        };
      })
      .filter(r => r.key);

    res.json(parsed);

  } catch {
    res.json([]);
  }
});

// 📊 PRICES
app.get("/api/prices", async (req, res) => {
  res.json(await getPrices());
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
  "commentary": "4-6 sentences"
}
`;

  let result = { takeaway: "", action: "", commentary: "" };

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

  } catch {}

  res.json(result);
});

app.get("/", (req, res) => {
  res.send("Backend running");
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log("Server running on port " + PORT));