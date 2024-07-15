const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
    ticketNumber: {
      type: String,
      required: true,
      unique: true
    },
    subject: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    },
    status: {
      type: String,
      // enum: ['Open', 'In Progress', 'Closed'],
      default: 'Open',
    },
    email: {
      type: String,
      required: true,
      validate: {
        validator: function(value) {
         
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        },
        message: 'Invalid email format'
      }
    },
    assignTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  });
  

const Support = mongoose.model('Support', supportSchema);

module.exports = Support;
