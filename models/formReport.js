const mongoose = require('mongoose');

const formReportSchema = new mongoose.Schema({
    reportId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Reportmaster', 
        require: true
    }, 
    formId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Forms', 
        require: true
    },  
    pdfReport: {
        type: mongoose.Schema.Types.Mixed,
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
    updatedAt: {
        type: Date,
        required: true,
        default: Date.now,
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
    },
    updated_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
        required: true,
    }
});

module.exports = mongoose.model('formReport', formReportSchema);
