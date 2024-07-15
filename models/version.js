const mongoose = require("mongoose");
const versionSchema = new mongoose.Schema(
  {
    formId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Forms",
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    teams: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Teams",
      },
    ],
    formStatus: {
      type: String,
      enum: ["live", "draft"],
      default: "draft",
      required: true,
    },
    settings: {
      isFlagging: {
        type: Boolean,
        default: false,
      },
      isLimitResponses: {
        type: Boolean,
      },
      limitResponsesValue: {
        type: Number,
      },
      isResurveyEnabled: {
        type: Boolean,
      },
      isAudioAudit: {
        type: Boolean,
      },
      isPushNotifications: {
        type: Boolean,
      },
      isDraftResponseDisabled: {
        type: Boolean,
      },
      Administrators: {
        type: Object,
      },
      formCollaborators: {
        type: Object,
      },
      responseCollaborators: {
        type: Object,
      },
    },

    questions: [
      {
        questionType: {
          type: String,
        },
        title: {
          type: String,
        },
        description: {
          type: String,
        },
        keyword: {
          type: String,
        },
        isRequired: {
          type: Boolean,
        },
        helpImageURL: {
          type: Object,
          default: {},
        },
        displayOrder: {
          type: Number,
        },
        // ---------------checkbox-
        other: {
          type: Boolean,
          // default: 0
        },
        response: {
          type: String,
        },
        properties: {
          type: Object,
          default: {},
        },
        isGroupChild: {
          type: Boolean,
          default: false,
        },
        groupQuestions: {
          childQuestions: [
            {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Forms",
            },
          ],
          rules: [
            {
              operator: {
                enum: ["AND", "OR"],
                type: String,
              },
              conditions: [
                {
                  questionId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Forms.questions",
                  },
                  ruleType: {
                    type: String,
                    enum: ["number", "choice"],
                  },
                  properties: {
                    type: Object,
                  },
                },
              ],
              questions: [
                {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "Forms.questions",
                },
              ],
            },
          ],
          parantSettings: {
            questionId: {
              type: mongoose.Schema.Types.ObjectId,
              default: undefined,
            },
            criteria: {
              type: Object,
              default: undefined,
            },
            groupLabels: [
              {
                type: String,
                default: undefined,
              },
            ],
          },
        },
        // ----------------monitoring--------------
        attributes: [
          {
            formId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Forms",
            },
            attribute: [
              {
                questionId: {
                  type: mongoose.Schema.Types.ObjectId,
                  ref: "Forms",
                },
                questionName: {
                  type: String
                },
                questionText: {
                  type: String
                },
                checkboxStatus: {
                  type: Boolean,
                },
              },
            ],
          },
        ],
        // ----------------monitoring--------------
      },
    ],
    responses: [],
    rules: [
      {
        operator: {
          enum: ["AND", "OR"],
          type: String,
        },
        conditions: [
          {
            questionId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Forms.questions",
            },
            ruleType: {
              type: String,
              enum: ["number", "choice"],
            },
            properties: {
              type: Object,
            },
          },
        ],
        questions: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Forms.questions",
          },
        ],
      },
    ],
    // --------monitoring--------------
  
    // --------monitoring--------------
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizations",
    },
    isActive: {
      type: Boolean,
      required: true,
      default: true,
    },
    versionNumber: {
      type: String,
      default: "0",
    },
    newVersionNumber: {
      type: String,
      default: "0",
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now(),
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    publishedAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
      required: true,
      default: Date.now(),
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
  },
  { minimize: false }
);

module.exports = mongoose.model("Versions", versionSchema);
