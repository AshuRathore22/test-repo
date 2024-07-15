const mongoose = require("mongoose");
const QuestionTypes = require("./question_type");
const formsSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    teams: [
      {
        _id: false,
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
        Default: false,
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
        isShowKeyword: {
          type: Boolean,
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
                    ref: "Forms",
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
                  ref: "Forms",
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
              ref: "Forms",
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
            ref: "Forms",
          },
        ],
      },
    ],
    // --------monitoring--------------
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
    // --------monitoring--------------
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organizations",
    },
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reportmaster",
    },
    isReportAssigned: {
      type: Boolean, 
      require: true, 
      default: false
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
    publishedAt: {
      type: Date,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
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

module.exports = mongoose.model("Forms", formsSchema);
