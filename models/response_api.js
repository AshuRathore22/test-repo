const mongoose = require("mongoose");

const responseApiSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  apiKey: {
    type: String,
    required: true,
  },
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Forms",
  },
  scope: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    required: true,
    default: "active",
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  audioAudit: {
    type: String,
  },
});

module.exports = mongoose.model("ResponseApi", responseApiSchema);
