import express from "express";
const app = express();

app.get("/", (req, res) => {
  res.status(200).json({
    status: "API Intermediária MAC v1.0.0",
  });
});

app.listen(3000);
