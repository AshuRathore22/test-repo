const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  logo: {
    type: String
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    required: true,
    default: "active"
  },
  created_at: {
    type: Date,
    required: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  updated_at: {
    type: Date,
    required: true,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  }
});

module.exports = mongoose.model("Organizations", organizationSchema);
