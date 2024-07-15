const mongoose = require("mongoose");
const Category = require('./category');
const questionTypesSchema = new mongoose.Schema({
  title:{
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true
  },
  displayOrder: {
    type: Number,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    trim: true,
    required: true,
    ref: Category
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

module.exports = mongoose.model("QuestionTypes", questionTypesSchema);
