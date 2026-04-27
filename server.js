const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 📊 CORE INDICATORS
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

// 🔥 FETCH INDICATORS (YAHOO-CORRECT % CHANGE)
async function getPrices() {
  const results = [];

  for (const s of symbols) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.symbol}?range=1d&interval=5m`;
      const response = await axios.get(url);

      const chart = response.data.chart.result[0];
      const closes = chart.indicators.quote[0].close;
      const valid = closes.filter(x => x !== null);

      const latest = valid[valid.length - 1];
      const prev = chart.meta.previousClose;

      const pctChange = prev ? ((latest - prev) / prev) * 100 : 0;

      results.push({
        name: s.name,
        price: latest,
        pctChange
      });

    } catch {
      results.push({ name: s.name, price: 0, pctChange: 0 });
    }
  }

  return results;
}

// 🧾 PORTFOLIO (ROWS 1–9 ONLY)
app.get("/api/sheet", async (req, res) => {
  try {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";
    const response = await axios.get(url);

    const rows = response.data.split("\n");

    const parsed = rows
      .slice(0, 9)
      .map(r => r.trim())
      .filter(r => r.includes(","))
      .map(r => {
        const parts = r.split(",");
        return {
          key: parts[0].replace(/"/g, "").trim(),
          value: parts.slice(1).join(",").replace(/"/g, "").trim()
        };
      });

    res.json(parsed);

  } catch {
    res.json([]);
  }
});

// 📊 WATCHLIST (ROWS 10+)
app.get("/api/watchlist", async (req, res) => {
  try {
    const url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQs38DKrijbxXURWYSmVoP9RN2mNSvphDI6yCR5aBXSFmALsuUm4MNK54f3MphaBAnHETqRtzpY5pt6/pub?gid=1778497186&single=true&output=csv";
    const response = await axios.get(url);

    const rows = response.data.split("\n");

    const symbols = rows
      .slice(9)
      .map(r => r.trim())
      .filter(r => r.length > 0 && !r.includes(","));

    const results = [];

    for (const symbol of symbols) {
      try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1d&interval=5m`;
        const response = await axios.get(url);

        const chart = response.data.chart.result[0];
        const closes = chart.indicators.quote[0].close;
        const valid = closes.filter(x => x !== null);

        const last = valid[valid.length - 1];
        const prev = chart.meta.previousClose;

        const pct = prev ? ((last - prev) / prev) * 100 : 0;

        const post = chart.meta.postMarketPrice;
        const postPct = post && last ? ((post - last) / last) * 100 : null;

        results.push({
          symbol,
          price: last,
          pctChange: pct,
          afterHours: postPct
        });

      } catch {}
    }

    res.json(results);

  } catch {
    res.json([]);
  }
});

// 🤖 AI COMMENTARY
app.get("/api/explain", async (req, res) => {
  const prices = await getPrices();

  const summary = prices.map(p => `${p.name}: ${p.pctChange.toFixed(2)}%`).join(", ");

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

// 📊 BACKTEST
function runBacktest(prices) {
  let equity = 100;
  let peak = 100;
  let maxDrawdown = 0;
  let wins = 0;
  let total = 0;

  for (let i = 1; i < prices.length; i++) {
    const r = (prices[i] - prices[i - 1]) / prices[i - 1];
    const signal = r > 0 ? 1 : -1;
    const pnl = signal * r;

    equity *= (1 + pnl);

    if (pnl > 0) wins++;
    total++;

    if (equity > peak) peak = equity;
    const dd = (equity - peak) / peak;
    if (dd < maxDrawdown) maxDrawdown = dd;
  }

  return {
    totalReturn: (equity - 100).toFixed(2) + "%",
    hitRate: ((wins / total) * 100).toFixed(1) + "%",
    maxDrawdown: (maxDrawdown * 100).toFixed(1) + "%"
  };
}

app.get("/api/backtest", async (req, res) => {
  try {
    const url = "https://query1.finance.yahoo.com/v8/finance/chart/SPY?range=6mo&interval=1d";
    const response = await axios.get(url);

    const closes = response.data.chart.result[0].indicators.quote[0].close;
    const clean = closes.filter(x => x !== null);

    res.json(runBacktest(clean));
  } catch {
    res.json({});
  }
});

// 📊 PRICES
app.get("/api/prices", async (req, res) => {
  res.json(await getPrices());
});

app.listen(process.env.PORT || 3001, () => console.log("Server running"));