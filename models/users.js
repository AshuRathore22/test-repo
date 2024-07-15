const mongoose = require("mongoose");

const usersSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  role: {
    type: String,
    enum: ["user"],
    required: true,
    default: "user",
  },
  mobile: {
    type: String,
  },
  countryCode: {
    type: String,
  },
  // --------changes for account --------
  birthDate: {
    type: String,
  },
  gender: {
    type: String,
  },
  pinCode: {
    type: Number,
  },
  address: {
    type: String,
  },
  city: {
    type: String,
  },
  state: {
    type: String,
  },
  // --------changes for account --------
  email: {
    type: String,
  },
  password: {
    type: String,
  },
  token: {
    type: String,
  },
  permissions: [
    {
      organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Organizations",
      },
      type: {
        type: String,
        enum: ["administrator", "member", "owner", "manager", "audience"],
      },
      formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Forms",
      },
      teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teams",
      },
      createdAt: {
        type: Date,
        default: Date.now(),
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
      },
      updateBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
      },
      udpatedAt: {
        type: Date,
        default: Date.now(),
      },
      isVerified: {
        type: Boolean,
      },
      status: {
        type: Number,
        default: 1,
      },
      invitationStatus: {
        type: String,
        enum: ["Accepted", "Pending", "Deleted"],
      },
    },
  ],
  isPhoneVerified: {
    type: Boolean,
  },
  isEmailVerified: {
    type: Boolean,
  },
  deviceData: {
    ip: {
      type: String,
    },
    androidVersion: {
      type: String,
    },
    appVersion: {
      type: String,
    },
    batteryLevel: {
      type: String,
    },
    brand: {
      type: String,
    },
    hardware: {
      type: String,
    },
    carrierAvailable: {
      type: String,
    },
    isRooted: {
      type: String,
    },
    lastFormDiffUpdatedAt: {
      type: String,
    },
    lastVersionCode: {
      type: String,
    },
    model: {
      type: String,
    },
    networkConnected: {
      type: String,
    },
    product: {
      type: String,
    },
    sdkVersion: {
      type: String,
    },
    totalRam: {
      type: String,
    },
  },
  isSuperAdmin: {
    type: Boolean,
    default: false,
  },
  tempCode: {
    type: Number,
    default: undefined,
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
  category: {
    type: String,
    enum: ["mobile", "web"],
    required: true,
    default: "mobile",
  },
  updatedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  profilePic: {
    type: String,
  },
});

module.exports = mongoose.model("Users", usersSchema);
