import express from "express";
const app = express();

app.get("/", (req, res) => {
  res.status(200).json({
    status: "API Intermediária MAC v1.0.0",
  });
});

const port = 3000;

app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});


