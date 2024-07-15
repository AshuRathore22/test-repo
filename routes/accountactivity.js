const express = require("express");
const {
  getaccountactivity,
  createAccountActivity,
  putactionAccountActivity,
} = require("../controllers/accountactivity");
const router = express.Router();

router.get("/accountactivity", getaccountactivity);

router.post("/accountactivity", createAccountActivity);

router.put("/accountactivity", putactionAccountActivity);
module.exports = router;
