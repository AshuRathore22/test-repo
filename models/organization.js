const mongoose = require("mongoose");

const organizationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  logo: {
    type: String
  },
  start_date: {
    type: Date
  }, 
  end_date: {
    type: Date
  },
  subscriptionType: {
    type: String, 
    enum: ['free', 'premium'], 
    default: 'free'
  },
  maxUserLimit: {
    type: Number, 
    default: 25
  },
  features: {
    mcq_single: {
      type: Boolean, 
      default: false
    }, 
    mcq_multiple: {
      type: Boolean, 
      default: false
    }, 
    text: {
      type: Boolean, 
      default: false
    }, 
    number: {
      type: Boolean, 
      default: false
    }, 
    location: {
      type: Boolean, 
      default: false
    }, 
    date: {
      type: Boolean, 
      default: false
    }, 
    time: {
      type: Boolean, 
      default: false
    }, 
    note: {
      type: Boolean, 
      default: false
    }, 
    signature: {
      type: Boolean, 
      default: false
    }, 
    sectionBreak: {
      type: Boolean, 
      default: false
    }, 
    area_on_map: {
      type: Boolean, 
      default: false
    }, 
    distance_on_map: {
      type: Boolean, 
      default: false
    }, 
    drop_down: {
      type: Boolean, 
      default: false
    }, 
    image: {
      type: Boolean, 
      default: false
    }, 
    multiple_image_upload: {
      type: Boolean, 
      default: false
    }, 
    image_geo_tag: {
      type: Boolean, 
      default: false
    }, 
    multiple_image_geo_tag: {
      type: Boolean, 
      default: false
    }, 
    phone: {
      type: Boolean, 
      default: false
    }, 
    email: {
      type: Boolean, 
      default: false
    }, 
    audio: {
      type: Boolean, 
      default: false
    }, 
    video: {
      type: Boolean, 
      default: false
    }, 
    file_upload: {
      type: Boolean, 
      default: false
    }, 
    multiple_file_upload: {
      type: Boolean, 
      default: false
    }, 
    likert_scale: {
      type: Boolean, 
      default: false
    }, 
    tracking: {
      type: Boolean, 
      default: false
    }, 
    scale: {
      type: Boolean, 
      default: false
    }, 
    rating: {
      type: Boolean, 
      default: false
    }, 
    matrix: {
      type: Boolean, 
      default: false
    }, 
    grp_no_repeat: {
      type: Boolean, 
      default: false
    }, 
    grp_number: {
      type: Boolean, 
      default: false
    }, 
    grp_choice: {
      type: Boolean, 
      default: false
    }, 
    grp_custom: {
      type: Boolean, 
      default: false
    }, 
    monitoring: {
      type: Boolean, 
      default: false
    }, 
    barcode: {
      type: Boolean, 
      default: false
    }, 
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    required: true,
    default: "active"
  },
  created_at: {
    type: Date,
    required: true,
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  },
  updated_at: {
    type: Date,
    required: true,
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Users",
    required: true,
  }
});

module.exports = mongoose.model("Organizations", organizationSchema);
