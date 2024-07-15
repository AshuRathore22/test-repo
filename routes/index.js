const express = require("express");
const router = express.Router();
const authenticate = require("../middleware/auth.js");

// --------- all routes here --------- //
router.use("/users", require("./users"));
router.use("/forms", require("./form"));
router.use("/organization", require("./organization"));
router.use("/forms", require("./form"));
router.use("/teams", require("./teams"));
router.use("/accountactivity", require("./accountactivity"));
router.use("/response", require("./response"));
router.use("/support", require("./support"));
router.use("/excel-import", require("./excel-import"));

module.exports = router;
