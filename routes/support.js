const express = require("express");
const router = express.Router();
const SupportController = require("../controllers/support");

router.post("/support/supportTicket", SupportController.supportTicket);
router.get("/geo/geoLocation", SupportController.geoLocation);

module.exports = router;
