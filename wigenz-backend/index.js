const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Route test
app.get("/", (req, res) => {
  res.send("Wigenz backend is running 🚀");
});

// ⚠️ PORT DYNAMIQUE (IMPORTANT)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
