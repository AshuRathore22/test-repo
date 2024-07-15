const mongoose = require("mongoose");

const downloadedResponseSchema = new mongoose.Schema({
  form_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Forms",
  },
  response_type: {
    type: String,
    enum: ["table", "media"],
    required: true,
  },
  from_date: {
    type: String,
    required: true,
  },
  to_date: {
    type: String,
    required: true,
  },
  submitted_by: {
    type: Array,
    required: true,
  },
  tags: {
    type: Array,
    required: true,
  },
  response_ids: {
    type: Array,
    required: true,
  },
  group_answers: {
    type: String,
  },
  mcq_options: {
    type: String,
  },
  revision_answers: {
    type: String,
  },
  monitoring_answers: {
    type: String,
  },
  created_at: {
    type: Date,
    required: true,
    default: Date.now,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
});

module.exports = mongoose.model("DownloadedResponse", downloadedResponseSchema);
