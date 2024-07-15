const mongoose = require("mongoose");

const fileUploadSchema = new mongoose.Schema({
    fileData: {
        type: Object
    },
    questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
    }
});

module.exports = mongoose.model("FilesUpload", fileUploadSchema);