const { json } = require('body-parser');
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    reportTitle: {
        type: String,
    }, 
    templateReport: {
        type: mongoose.Schema.Types.Mixed,
    }, 
    organizationId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Organizations', 
        require: true
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

module.exports = mongoose.model('Reportmaster', reportSchema);
