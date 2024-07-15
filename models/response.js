const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema({
  revisionId: {
    type: String,
  },
  isResurveyResponse: {
    type: String,
    enum: ["yes", "no"],
    default: "no",
    required: true,
  },
  parentResurveyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Response",
    default: undefined,
  },
  timeZone: {
    name: {
      type: String,
    },
    offset: {
      type: String,
    },
  },
  formId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Forms",
  },
  versionNumber: {
    type: Number,
  },
  revisionStatus: {
    type: String,
    enum: ["online", "offline", "draft", "flagged", "resolved"],
    default: "online",
    required: true,
  },
  tag: {
    type: String,
    enum: [
      "archived",
      "verified",
      "no_tag",
      "flagged",
      "resurveyed",
      "rejected",
      "pending",
    ],
    default: "no_tag",
  },
  timeSpent: {
    type: Number,
  },
  formRevision: [
    {
      createdIn: {
        type: String, // version id
      },
      submittedIn: {
        type: String, // version id
      },
      lastModifiedIn: {
        type: String, // version id
      },
    },
  ],
  submittedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
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
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organizations",
  },
  responseNote: {
    type: String,
  },
  submittedAt: {
    type: Date,
    required: true,
    default: Date.now,
  },
  responseParantId: {
    type: mongoose.Schema.Types.ObjectId,
    default: undefined,
    ref: "Response",
  },
  responseCount: {
    type: Number,
    default: 0,
  },
  responses: [
    {
      answer: {
        type: Object,

        /*
            text: "Good"
            number: 5
            date: "13-10-1995"
            location: {
                "coordinates": {
                    "latitude": 21.2816721,
                    "longitude": 81.6395802,
                    "provider": "fused",
                    "accuracy": 64.1
                }
            }
            "media": {
                "mimeType": "video/mp4",
                "_id": "4008c402-32f1-475c-98a5-9df34e27f0c0",
                "url": "https://collect-v2-production.s3.ap-south-1.amazonaws.com/yBzxNGmVmqASvWvdX97C/UjYTpVcMEHDnEIuDXMJG/RDS7L6LN8eZ6o4EhMWLk/4eb298b5-6c58-45b5-8847-b821542d6195.mp4?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVX57N7M6B3MR5E5X%2F20220926%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20220926T080727Z&X-Amz-Expires=3600&X-Amz-Signature=5434b53a78df91d6abc8e0bd8354135bd94edbe6172ea05b42113b897c8b8fc3&X-Amz-SignedHeaders=host"
            }
        */
      },
      status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active",
      },
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Forms.questions",
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Users",
      },
      createdOnDeviceAt: {
        type: Date,
        default: Date.now,
      },
      lastModifiedOnDeviceAt: {
        type: Date,
        default: Date.now,
      },
      questionType: {
        type: String,
      },
      isFlagged: {
        type: Boolean,
        default: false,
      },
      // appVersion: {
      //   createdIn: {
      //     type: String,
      //   },
      //   lastModifiedIn: {
      //     type: String,
      //   },
      // },
      isParent: {
        type: Boolean,
      },
      groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Forms.questions",
        default: undefined,
      },
      groupLabelId: {
        type: String,
        default: undefined,
      },
    },
  ],
  createdOn: {
    type: Date,
    default: Date.now(),
  },
  updatedOn: {
    type: Date,
    default: Date.now(),
  },
  flaggedOn: {
    type: Date,
    default: undefined,
  },
  importedId: {
    type: String,
    default: undefined,
  },
});

module.exports = mongoose.model("Response", responseSchema);
