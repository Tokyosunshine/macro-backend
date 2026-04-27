const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());

// ✅ STATIC TEST DATA (guaranteed to work)
app.get("/api/prices", (req, res) => {
  res.json([
    { name: "Oil", price: 96.38, pctChange: 2.11 },
    { name: "Gold", price: 2350, pctChange: -0.5 }
  ]);
});

app.get("/api/sheet", (req, res) => {
  res.json([
    { key: "Cash", value: "$100,000" },
    { key: "Equity", value: "$250,000" }
  ]);
});

app.get("/api/watchlist", (req, res) => {
  res.json([
    { symbol: "AAPL", price: 180, pctChange: 1.2 },
    { symbol: "MSFT", price: 410, pctChange: -0.8 }
  ]);
});

app.get("/api/explain", (req, res) => {
  res.json({
    takeaway: "System working",
    action: "Observe",
    commentary: "This is a test response"
  });
});

app.get("/", (req, res) => res.send("Backend running"));

app.listen(process.env.PORT || 3001);