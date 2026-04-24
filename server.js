const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 📊 Symbols
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


// 📈 Fetch market data (REAL % change)
async function getPrices() {
  const results = [];

  for (const s of symbols) {
    try {
      const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${s.symbol}`;

      const response = await axios.get(url);
      const quote = response.data?.quoteResponse?.result?.[0];

      results.push({
        name: s.name,
        symbol: s.symbol,
        price: quote?.regularMarketPrice ?? null,
        pctChange: quote?.regularMarketChangePercent ?? null
      });

    } catch (err) {
      console.log("Data error:", s.name);

      results.push({
        name: s.name,
        symbol: s.symbol,
        price: null,
        pctChange: null
      });
    }
  }

  return results;
}


// 📊 API: Prices
app.get("/api/prices", async (req, res) => {
  const prices = await getPrices();
  res.json(prices);
});


// 🤖 API: AI Explanation
app.get("/api/explain", async (req, res) => {
  const prices = await getPrices();

  const summary = prices
    .map(p => `${p.name}: ${p.pctChange?.toFixed(2)}%`)
    .join(", ");

  const prompt = `
You are a senior macro hedge fund strategist.

Market:
${summary}

Tasks:
1. Identify dominant macro driver
2. Explain cross-asset relationships
3. Provide a clear takeaway
4. Suggest a trade
5. Assign confidence (0-100)

Return STRICT JSON:
{
  "takeaway": "short macro takeaway",
  "action": "trade idea",
  "confidence": number,
  "commentary": "detailed 4-6 sentence macro explanation"
}
`;

  let result = {
    takeaway: "No signal",
    action: "No action",
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

    const text = response.data?.choices?.[0]?.message?.content;

    try {
      result = JSON.parse(text);
    } catch {
      console.log("JSON parse error (AI output not clean)");
    }

  } catch (err) {
    console.log("AI error:", err.message);
  }

  res.json(result);
});


// 🧪 Health check
app.get("/", (req, res) => {
  res.send("Backend running");
});


// 🚀 Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});