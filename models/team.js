const mongoose = require("mongoose");

const teamsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  organization_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organizations"
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
    default: Date.now
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  updated_at: {
    type: Date,
    required: true,
    default: Date.now
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true
  }
});

module.exports = mongoose.model("Teams", teamsSchema);
