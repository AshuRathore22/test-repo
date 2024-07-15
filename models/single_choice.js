const mongoose = require("mongoose");

const singleChoiceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  options: {
    type: Object,
    required: true,
  },
  showOptionCodes: {
    type: Boolean,
    required: true,
  },
  specialOption: {
    type: Object,
    required: true,
  }
});

module.exports = mongoose.model("QuestionTypes", questionTypesSchema);
