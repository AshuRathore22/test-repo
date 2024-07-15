const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  title:{
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  isActive: {
    type: Boolean,
    required: true,
    default: true,
  },
  displayOrder: {
    type: Number,
    required: true,
  },
  createdBy: {
    type: Number,
    default:0,
    required: true
  },
  updatedBy: {
    type: Number,
    required: true,
    default: 0
  },
  createdAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now,
  }
});

module.exports = mongoose.model("Category", categorySchema);
