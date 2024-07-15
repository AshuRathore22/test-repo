const mongoose = require("mongoose");

const Getaccountactivity = new mongoose.Schema({
  activitytype: {
    type: String,
    required: true,
  },
  ipaddress: {
    type: String,
    // required: true,
  },
  browser: {
    type: String,
    // required: true,
    default: true,
  },
  os: {
    type: String,
    // required: true,
  },
  location: {
    type: String,
    // required: true,
  },
  activitytime: {
    type: String,
    required: true,
    // default: Date.now
  },
});

module.exports = mongoose.model("Accountactivity", Getaccountactivity);
