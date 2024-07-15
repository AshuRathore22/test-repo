const mongoose = require('mongoose');
const audioAuditSchema = new mongoose.Schema({
    audioAudit:{
        type:Array
    },
    audioAuditId:{
        type: mongoose.Schema.Types.ObjectId
    }
})
module.exports = mongoose.model("audioAudit",audioAuditSchema);