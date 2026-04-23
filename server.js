const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());

const symbols = [
  { name: "USD/CHF", symbol: "CHF=X" },
  { name: "Oil", symbol: "CL=F" },
  { name: "Gold", symbol: "GC=F" },
  { name: "Silver", symbol: "SI=F" },
  { name: "SPY", symbol: "SPY" },
  { name: "VIX", symbol: "^VIX" },
  { name: "Bitcoin", symbol: "BTC-USD" }
];

app.get("/api/prices", async (req, res) => {
  try {
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

      // 4pm ET ≈ 20:00 UTC
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      yesterday.setHours(20, 0, 0, 0);

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

    res.json(results);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching data");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));