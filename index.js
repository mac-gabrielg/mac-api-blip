import dotenv from "dotenv";
import express from "express";
import cron from "node-cron";

dotenv.config();
if (dotenv.error) {
  console.log(dotenv.parsed);
  throw dotenv.error;
}

const port = process.env.PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

import { macSurvey } from "./Schedules/macSurvey.js";

macSurvey(app);

// let second = "41";

// let task = cron.schedule(`* * * * * *`, () => {
//   console.log("running a task every one minutes");
// });

// task.start();
// setTimeout(() => {
//   task.stop();
// }, 6000);

// import nodeSchedule from "node-schedule";

// const dt = new Date(2022, 1, 24, 16, 49, 0);

// const job = nodeSchedule.scheduleJob(dt, () => {
//   console.log("olá mundo");
// });

app.get("/", (req, res) => {
  res.status(200).json({
    status: "API Intermediária MAC v1.0.0",
  });
});

app.get("/mac", (req, res) => {
  res.status(200).json({
    status: "API Intermediária MAC v1.0.0",
  });
});

app.listen(port, () => {
  console.log(`Server is up on port ${port}`);
});
