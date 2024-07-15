const mongoose = require("mongoose");

const userDetailsSchema = new mongoose.Schema({
  id: {
    type: String,
  },
  userId: {
    type: String,
  },
  responseId: {
    type: String,
  },
  countryCode: {
    type: Number,
  },
  name: {
    type: String,
    default: null,
  },
  email: {
    type: String,
    default: null,
  },
  mobile: {
    type: Number,
  },
  token: {
    type: String,
  },

  createdBy: {
    type: Number,
    default: 0,
  },
  updatedBy: {
    type: Number,

    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("userDetails", userDetailsSchema);
