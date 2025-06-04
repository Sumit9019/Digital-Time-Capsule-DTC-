const express = require("express");
const router = express.Router();
const {
  getAnalyticsSummary,
  getUserAnalytics,
} = require("../controllers/analyticsController");


router.get("/", getAnalyticsSummary);


router.get("/user/:userId", getUserAnalytics);

module.exports = router;
