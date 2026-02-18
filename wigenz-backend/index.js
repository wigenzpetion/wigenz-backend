const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Route test
app.get("/", (req, res) => {
  res.send("Wigenz backend is running 🚀");
});

// Port serveur
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
