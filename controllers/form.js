const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const error_code = require("../config/error-code");
const QuestionType = require("../models/question_type");
const Form = require("../models/form");
const Users = require("../models/users");
const Version = require("../models/version");
const Response = require("../models/response");
const ResponseApiKey = require("../models/response_api");
const mongoose = require("mongoose");
const countryCodes = require("../config/country-code");
const nodemailer = require("../config/email.config");
const mailContent = require("../middleware/emailcontent");
const moment = require("moment");
const _ = require("lodash");
const version = require("../models/version");
const axios = require('axios');

// ------sms-------------------
// const twilio = require("twilio");
// const accountSid = "AC6e4228b12748f090f70407356c831605";
// const authToken = "3b595f09ac74d5119596f6c0719779af";
// const twilioClient = twilio(accountSid, authToken);
// -------sms-----------------------
exports.getForm = async (req, res, next) => {
  try {
    if (!req.params.id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const formData = await Form.find(
      { _id: req.params.id, isActive: true },
      { questions: 0, organizationId: 0, teams: 0, responses: 0, rules: 0 }
    );

    if (!formData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      data: formData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.getQuestions = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const questions = await Form.find({
      _id: req.params.formId,
      isActive: true,
      questions: {
        $elemMatch: {
          isGroupChild: false,
        },
      },
    })
      .select("questions rules")
      .sort({ createdAt: -1 });
    if (!questions) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    let getAllQuestions = [];
    let count = 0;
    if (questions[0]?.questions) {
      let formData = questions[0]?.questions.filter((obj) => {
        if (obj.isGroupChild == false) {
          return obj;
        }
      });
      formData.map((question) => {
        if (question.questionType === "section_break") {
          getAllQuestions.push({ ...question._doc, count: null });
        } else {
          getAllQuestions.push({ ...question._doc, count: ++count });
        }
      });
      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        questions: getAllQuestions,
        rules: questions[0]?.rules,
      });
    } else {
      const err = new Error(error_code.NO_DATA.CODE);
      err.statusCode = 0;
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

exports.getAllFormsList = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    let getRole;
    let orgId;
    let allFormList = [];
    let formCount = 0;
    checkValidUser.permissions.find((i) => {
      if (i.type.includes("member")) {
        getRole = "member";
        orgId = i.organizationId;
      }
      if (i.type.includes("manager")) {
        getRole = "manager";
        orgId = i.organizationId;
      }
      if (i.type.includes("administrator")) {
        getRole = "administrator";
        orgId = i.organizationId;
      }
      if (i.type.includes("owner")) {
        getRole = "owner";
        orgId = i.organizationId;
      }
    });
    if (getRole == "owner" || getRole == "administrator") {
      let params = [
        {
          $match: {
            organizationId: mongoose.Types.ObjectId(orgId),
            formStatus: "live",
            isActive: true,
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            versionNumber: 1,
            updatedAt: 1,
            publishedAt: 1,
            settings: 1,
            questionCount: {
              $size: {
                $filter: {
                  input: "$questions",
                  as: "question",
                  cond: {
                    $and: [
                      { $eq: ["$$question.isGroupChild", false] },
                      { $ne: ["$$question.questionType", "section_break"] },
                    ],
                  },
                },
              },
            },
            responsesCount: { $size: { $ifNull: ["$responses", []] } },
          },
        },
        {
          $sort: {
            updatedAt: -1,
          },
        },
      ];

      let limit = 0;
      let pageNo = 0;
      if (req.query.pageNo && req.query.pageNo > 0) {
        pageNo = (req.query.pageNo - 1) * req.query.limit;
        params.push({
          $skip: Number(pageNo),
        });
      }
      if (req.query.limit && req.query.limit > 0) {
        limit = req.query.limit;
        params.push({
          $limit: Number(limit),
        });
      }
      allFormList = await Form.aggregate(params);
      formCount = await Form.countDocuments({
        organizationId: orgId,
        formStatus: "live",
        isActive: true,
      });
    } else if (getRole == "member" || getRole == "manager") {
      let forms = await Users.find(
        { _id: req.sessionUserData.userid },
        { permissions: 1 }
      );
      if (Array.isArray(forms) && forms.length == 0) {
        const err = new Error(error_code.FORM_NOT_FOUND.CODE);
        err.statusCode = 0;
        throw err;
      }
      let formArray = [];
      let teamArray = [];
      for (let form of forms[0].permissions) {
        if (form.status == 1) {
          if (form.formId) {
            formArray.push(form.formId);
          }
          if (form.teamId) {
            teamArray.push(form.teamId);
          }
        }
      }
      const teamForms = await Form.find(
        {
          teams: {
            $in: teamArray,
          },
        },
        { _id: 1 }
      );
      for (let form of teamForms) {
        if (!formArray.includes(form._id)) {
          formArray.push(form._id);
        }
      }
      let params = [
        {
          $match: {
            _id: { $in: formArray },
            formStatus: "live",
            isActive: true,
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            versionNumber: 1,
            updatedAt: 1,
            publishedAt: 1,
            settings: 1,
            questionCount: {
              $size: {
                $filter: {
                  input: "$questions",
                  as: "question",
                  cond: {
                    $and: [
                      { $eq: ["$$question.isGroupChild", false] },
                      { $ne: ["$$question.questionType", "section_break"] },
                    ],
                  },
                },
              },
            },
            responsesCount: { $size: { $ifNull: ["$responses", []] } },
          },
        },
        {
          $sort: {
            updatedAt: -1,
          },
        },
      ];
      let limit = 0;
      let pageNo = 0;
      if (req.query.pageNo && req.query.pageNo > 0) {
        pageNo = (req.query.pageNo - 1) * req.query.limit;
        params.push({
          $skip: Number(pageNo),
        });
      }
      if (req.query.limit && req.query.limit > 0) {
        limit = req.query.limit;
        params.push({
          $limit: Number(limit),
        });
      }
      allFormList = await Form.aggregate(params);
      formCount = await Form.countDocuments({
        _id: { $in: formArray },
        formStatus: "live",
        isActive: true,
      });
    }
    res.status(200).json({
      forms: allFormList,
      status: 1,
      total: formCount,
    });
  } catch (err) {
    next(err);
  }
};

//################################ Admin Form APIs ################################//

// Get all question type API

exports.getAllQuestionTypes = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const popularQusType = await QuestionType.find({})
      .select("_id title icon displayOrder isActive code")
      .populate({ path: "category" })
      .sort("displayOrder");

    if (!popularQusType) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: popularQusType,
    });
  } catch (err) {
    next(err);
  }
};

exports.addAudience = async (req, res, next) => {
  try {
    if (!req.body.countryCode || req.body.countryCode == "") {
      const err = new Error("Please enter country code");
      err.statusCode = 400;
      throw err;
    }

    if (!req.body.mobile || req.body.mobile == "") {
      const err = new Error("Please enter mobile number");
      err.statusCode = 400;
      throw err;
    }

    if (!req.body.formId) {
      const err = new Error("Invalid form id");
      err.statusCode = 400;
      throw err;
    }

    if (req.body.mobile.length > 16 || req.body.mobile.length < 7) {
      const err = new Error("Invalid mobile number");
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkObj = {
      mobile: req.body.mobile,
      countryCode: req.body.countryCode,
    };

    const mobileCheck = await Users.findOne(checkObj);

    if (mobileCheck) {
      const permissionCheck = await Users.find(
        {
          mobile: req.body.mobile,
          countryCode: req.body.countryCode,
          "permissions.type": "member",
          "permissions.formId": mongoose.Types.ObjectId(req.body.formId),
        },
        { permissions: 1 }
      );
      if (!permissionCheck || permissionCheck.length == 0) {
        const updatedPermission = await Users.updateOne(checkObj, {
          $push: {
            permissions: {
              formId: req.body.formId,
              type: "member",
              organizationId: req.body.orgId,
              createdBy: req.sessionUserData.userid,
              updatedBy: req.sessionUserData.userid,
            },
          },
        });

        if (!updatedPermission) {
          const err = new Error(error_code.UNKNOWN_ERROR.CODE);
          err.statusCode = 0;
          throw err;
        }
      }
      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
      });
    } else {
      const setNewUser = await new Users({
        mobile: req.body.mobile,
        countryCode: req.body.countryCode,
        isPhoneVerified: false,
        category: "web",
        role: "user",
        permissions: [
          {
            formId: req.body.formId,
            type: "member",
            organizationId: req.body.orgId,
            createdBy: req.sessionUserData.userid,
            updatedBy: req.sessionUserData.userid,
          },
        ],
      }).save();

      if (!setNewUser) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }

      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        body: {
          is_new_user: setNewUser.isPhoneVerified ? 0 : 1,
        },
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.removeAudience = async (req, res, next) => {
  try {
    if (!Array.isArray(req.body.userIds) && req.body.userIds.length === 0) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const updatedPermission = await Users.updateMany(
      { _id: { $in: req.body.userIds } },
      {
        $pull: {
          permissions: {
            formId: req.body.formId,
            type: "member",
          },
        },
      },
      { multi: true }
    );

    if (!updatedPermission) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.getFormAdmin = async (req, res, next) => {
  // console.log('dev')
  //return;
  try {
    if (!req.params.id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const formData = await Form.find(
      { _id: req.params.id, isActive: true },
      { questions: 0 }
    );

    if (!formData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      data: formData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.addQuestion = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    if (!req.body.questionType || req.body.questionType == "") {
      const err = new Error(error_code.QUESTION_TYPE_NOT_FOUND.CODE);
      err.statusCode = 400;
      //throw err;
    }

    const isFormExists = await Form.countDocuments({ _id: req.body.formId });

    if (!isFormExists) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const questionObj = {
      _id: mongoose.Types.ObjectId(),
      // formId: req.body.formId,
      questionType: req.body.questionType,
      title: req.body.title || "No Title",
      description: req.body.description || null,
      keyword: req.body.keyword || null,
      isRequired: req.body.isRequired || false,
      helpImageURL: req.body.helpImageURL || {},
      displayOrder: req.body.displayOrder,
      properties: req.body.properties || {},
      isGroupChild: req.body.isGroupChild || false,
    };

    // console.log(req.body, questionObj, "Dev bhai");
    const verId = await Version.find({
      formId: req.body.formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);
    // console.log(verId,">verId")
    //  console.log(verId[0].formStatus,"<<<<<<<<ver")

    if (verId[0].formStatus == "live") {
      const verObj = {
        formId: req.body.formId,
        title: verId[0].title,
        organizationId: verId[0].organizationId,
        description: verId[0].description,
        isActive: true,
        questions: verId[0].questions,
        responses: verId[0].responses,
        settings: verId[0].settings,
        versionNumber: Number(verId[0].versionNumber),
        newVersionNumber: Number(verId[0].newVersionNumber),
        createdBy: req.sessionUserData.userid,
        updatedBy: req.sessionUserData.userid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const addVersionForm = await new Version(verObj).save();
      const modifyForm = await Form.findByIdAndUpdate(req.body.formId, {
        updatedAt: Date.now(),
      });

      addQuestion = await Version.updateOne(
        { _id: addVersionForm._id },
        {
          $push: {
            questions: {
              $each: [questionObj],
              $position: req.body.displayOrder,
            },
          },
        }
      );
    } else {
      addQuestion = await Version.updateOne(
        { _id: verId[0]._id },
        {
          $push: {
            questions: {
              $each: [questionObj],
              $position: req.body.displayOrder,
            },
          },
        }
      );
      // console.log(addQuestion, "questionObj");
      const modifyForm = await Form.findByIdAndUpdate(req.body.formId, {
        updatedAt: Date.now(),
      });
    }

    if (!addQuestion) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    // console.log(questionObj, "questionObj");
    res.status(200).json({
      status: 1,
      id: questionObj._id,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateQuestion = async (req, res, next) => {
  //console.log('dev update')
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    let allOptionProperty = {};
    if (req.body.properties && req.body.properties != "null") {
      allOptionProperty = JSON.parse(req.body.properties);
      let i = 0;
      if (
        req.body.questionType == "mcq_single" ||
        req.body.questionType == "mcq_multiple"
      ) {
        allOptionProperty.options.forEach((element, index) => {
          if (element.optImgFile) {
            element.optImg = req.files["optionImages[]"][i].path;
            delete element.optImgFile;
            i++;
          }
        });
      }
    }

    const updateObj = {
      "questions.$.questionType": req.body.questionType,
      "questions.$.title": req.body.title || "No Title",
      "questions.$.description":
        !req.body.description ||
        req.body.description == "undefined" ||
        req.body.description == "null"
          ? null
          : req.body.description,
      "questions.$.keyword":
        !req.body.keyword ||
        req.body.keyword == "undefined" ||
        req.body.keyword == "null"
          ? null
          : req.body.keyword,
      "questions.$.isRequired":
        !req.body.isRequired || req.body.isRequired == "undefined"
          ? false
          : req.body.isRequired,
      "questions.$.other": req.body.other,
      "questions.$.response": req.body.response,
      "questions.$.displayOrder": req.body.displayOrder,

      "questions.$.properties": allOptionProperty,
    };
    // console.log(updateObj);
    if (
      Array.isArray(req.files.helpImageURL) &&
      req.files.helpImageURL.length > 0
    ) {
      let helpImageURL = req.files.helpImageURL[0];
      delete helpImageURL.fieldname;
      delete helpImageURL.encoding;
      delete helpImageURL.destination;
      delete helpImageURL.filename;
      delete helpImageURL.originalname;
      delete helpImageURL.size;
      updateObj["questions.$.helpImageURL"] = helpImageURL;
      // updateObj["questions.$.helpImageURL"] = {
      //   _id: mongoose.Types.ObjectId(),
      //   mimetype: helpImageURL.mimetype,
      //   path: helpImageURL.path
      // };
    }
    const verId = await Version.find({
      formId: req.body.formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);
    const isQuestionUpdated = await Version.updateOne(
      {
        _id: verId[0]._id,
        "questions._id": req.params.id,
      },
      {
        $set: updateObj,
      }
    );
    const modifyForm = await Form.findByIdAndUpdate(req.body.formId, {
      updatedAt: Date.now(),
    });

    if (!isQuestionUpdated) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      message: "updated successfully",
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteHelpImage = async (req, res, next) => {
  try {
    const verId = await Version.findOne({
      formId: req.body.formId,
      isActive: true,
    }).sort({ _id: -1 });
    if (!verId) {
      return res.status(404).json({ message: "Version not found" });
    }
    const questionIndex = verId.questions.findIndex(question => question._id.toString() === req.params.id);
    if (questionIndex === -1) {
      return res.status(404).json({ message: "Question not found in the version" });
    }
    const question = verId.questions[questionIndex];
    if (!question.helpImageURL) {
      return res.status(404).json({ message: "No help image found for this question" });
    }
    question.helpImageURL = null;

    // Save the updated version
    await verId.save();

    res.status(200).json({ message: "Help image deleted successfully" });
  } catch (err) {
    next(err);
  }
};















exports.deleteQuestion = async function deleteQuestion(req, res, next) {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const verId = await Version.find({
      formId: req.params.formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);
    let findObj = {
      _id: mongoose.Types.ObjectId(verId[0]._id),
      questions: {
        $elemMatch: {
          _id: mongoose.Types.ObjectId(req.params.questionId),
        },
      },
    };
    const childIds = await Version.find({ findObj })
      .select("questions._id questions.groupQuestions.childQuestions")
      .sort({ _id: -1 })
      .limit(1);
    const childIdData = childIds[0]?.questions.filter((obj) => {
      if (obj._id == req.params.questionId) {
        return obj;
      }
    });

    const deleteChildQuestion = await Version.updateOne(
      {
        _id: verId[0]._id,
        "questions._id": childIdData[0]?.groupQuestions?.childQuestions,
      },
      {
        $pull: {
          questions: { _id: childIdData[0]?.groupQuestions?.childQuestions },
        },
      }
      );
  
      const deleteRule = await Version.updateOne(
        { 
          _id: verId[0]._id,
          "rules.conditions.questionId": req.params.questionId 
        },
        {
          $pull: {
            rules: { "conditions.questionId": req.params.questionId },
          },
        }
      );
console.log(deleteRule);
      const deleteQuestion = await Version.updateOne(
      { _id: verId[0]._id, "questions._id": req.params.questionId },
      {
        $pull: {
          questions: { _id: req.params.questionId },
        },
      }
    );

    const modifyForm = await Form.findByIdAndUpdate(req.params.formId, {
      updatedAt: Date.now(),
    });

    if (!deleteQuestion) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      message: "Question deleted successfully",
    });
  } catch (err) {
    next(err);
  }
};

exports.getAdminQuestions = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );
    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const allQuestions = await Version.aggregate([
      {
        $match: {
          formId: mongoose.Types.ObjectId(req.params.formId),
          isActive: true,
        },
      },
      {
        $project: {
          _id: 1,
          questions: {
            $filter: {
              input: "$questions",
              as: "questions",
              cond: {
                $and: [
                  {
                    $or: [
                      {
                        $regexMatch: {
                          input: "$$questions.title",
                          regex: new RegExp(req.query.s),
                        },
                      },
                      {
                        $regexMatch: {
                          input: "$$questions.keyword",
                          regex: new RegExp(req.query.s),
                        },
                      },
                    ],
                  },
                  {
                    $eq: ["$$questions.isGroupChild", false],
                  },
                ],
              },
            },
          },
        },
      },
      { $sort: { _id: -1, displayOrder: 1 } },
      { $limit: 1 },
    ]);

    if (!allQuestions) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    let getAllQuestions = [];
    let questionNumber = 0;
    if (Array.isArray(allQuestions) && allQuestions.length) {
      getAllQuestions = allQuestions[0].questions;
      getAllQuestions = getAllQuestions.map((question) => {
        if (
          question.questionType === "section_break" ||
          question.isGroupChild
        ) {
          return { ...question, questionNumber: null };
        }
        questionNumber++;
        return { ...question, questionNumber };
      });
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      questions: getAllQuestions,
      last: allQuestions[0]?._id,
    });
  } catch (err) {
    next(err);
  }
};

// exports.getAdminQuestions = async (req, res, next) => {
//   try {
//     if (!req.params.formId || req.params.formId == "") {
//       const err = new Error(error_code.FORM_NOT_FOUND.CODE);
//       err.statusCode = 400;
//       throw err;
//     }

//     const checkValidUser = await Users.findById(req.sessionUserData.userid);

//     if (!checkValidUser) {
//       const err = new Error(error_code.USER_NOT_FOUND.CODE);
//       err.statusCode = 0;
//       throw err;
//     }

//     const isOwnerOrAdmin = checkValidUser.permissions.some(
//       (i) => i.type.includes("owner") || i.type.includes("administrator")
//     );

//     if (!isOwnerOrAdmin) {
//       const err = new Error(error_code.NOT_AUTHERIZED.CODE);
//       err.statusCode = 0;
//       throw err;
//     }

//     //const questions = await Form.findById({_id: req.params.formId,"questions.isGroupChild":false}).select('questions').sort({displayOrder: 1});
//     // const questions = await Version.find({formId: req.params.formId,"questions.isGroupChild":false}).select('questions').sort({_id: -1,displayOrder: 1}).limit(1);
//     const allQuestions = await Version.aggregate([
//       {
//         $match: {
//           formId: mongoose.Types.ObjectId(req.params.formId),
//           isActive: true,
//         },
//       },
//       {
//         $project: {
//           questions: {
//             $filter: {
//               input: "$questions",
//               as: "questions",
//               cond: {
//                 $and: [
//                   {
//                     $or: [
//                       {
//                         $regexMatch: {
//                           input: "$$questions.title",
//                           regex: new RegExp(req.query.s),
//                         },
//                       },
//                       {
//                         $regexMatch: {
//                           input: "$$questions.keyword",
//                           regex: new RegExp(req.query.s),
//                         },
//                       },
//                     ],
//                   },
//                   {
//                     $eq: ["$$questions.isGroupChild", false],
//                   },
//                 ],
//               },
//             },
//           },
//         },
//       },
//       { $sort: { _id: -1, displayOrder: 1 } },
//       { $limit: 1 },
//     ]);

//     if (!allQuestions) {
//       const err = new Error(error_code.UNKNOWN_ERROR.CODE);
//       err.statusCode = 0;
//       throw err;
//     }
//     let getAllQuestions = [];
//     if (Array.isArray(allQuestions) && allQuestions.length) {
//       getAllQuestions = allQuestions[0].questions;
//     }
//     console.log(getAllQuestions);
//     res.status(200).json({
//       status: 1,
//       error_code: error_code.NONE.CODE,
//       questions: getAllQuestions,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

exports.getAudience = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    let findObj = {
      "permissions.type": "member",
      "permissions.formId": req.params.formId,
    };
    if (req.query.search) {
      let regex = new RegExp(req.query.search, "i");
      findObj["$or"] = [
        {
          name: regex,
        },
        {
          mobile: regex,
        },
      ];
    }

    let limit = 0;

    let pageNo = 0;

    if (req.query.limit && req.query.limit > 0) {
      limit = req.query.limit;
    }

    if (req.query.page && req.query.page > 0) {
      pageNo = req.query.page * limit;
    }

    const getAudience = await Users.find(findObj, {
      permissions: 0,
    });
    const total = await Users.countDocuments(findObj);
    if (!getAudience) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      audience: getAudience,
      total: total,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.publishForm = async (req, res, next) => {
  
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    var getData = await Version.find({
      formId: req.params.formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);

    let formVersion = await Form.find({
      _id: req.params.formId,
      isActive: true,
    }).select("versionNumber");


const updateVersion = Number(formVersion[0].versionNumber) + 1;


    const verObj = {
      formId: getData[0].formId,
      title: getData[0].title,
      description: getData[0].description,
      organizationId: getData[0].organizationId,
      teams: getData[0].teams,
      formStatus: "live",
      settings: getData[0].settings,
      questions: getData[0].questions,
      responses: getData[0].responses,
      rules: getData[0].rules,
      versionNumber: updateVersion,
      newVersionNumber: updateVersion,
      isActive: true,
      publishedAt: Date.now(),
      createdBy: req.sessionUserData.userid,
      updatedBy: req.sessionUserData.userid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const addVersionForm = await new Version(verObj).save();

    var getPublishVersionData = await Version.find(
      {
        formId: req.params.formId,
        formStatus: "live",
        isActive: true,
      },
      { _id: 0 }
    )
      .sort({ _id: -1 })
      .limit(1);

    const isFormUpdated = await Form.updateOne(
      {
        _id: req.params.formId,
      },
      {
        $set: getPublishVersionData[0],
      }
    );
    if (!isFormUpdated) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      versionNumber: updateVersion,
    });
    // const isFormExists = await Form.countDocuments({_id: req.params.formId});

    // if(!isFormExists){
    //     const err = new Error(error_code.FORM_NOT_FOUND.CODE);
    //     err.statusCode = 0;
    //     throw err;
    // }

    // let formVersion = await Form.find({_id: req.params.formId}).select('versionNumber');
    // const updateVersion = Number(formVersion[0].versionNumber) + 1;

    // let updateForm = await Form.updateOne(
    //   {
    //     _id: req.params.formId
    //   },
    //   {
    //     $set : {
    //       formStatus: 'live',
    //       versionNumber: updateVersion
    //     }
    //   }
    // );
    // if (!updateForm) {
    //   const err = new Error(error_code.UNKNOWN_ERROR.CODE);
    //   err.statusCode = 0;
    //   throw err;
    // }

    // res.status(200).json({
    //   status: 1,
    //   error_code: error_code.NONE.CODE,
    //   versionNumber: updateVersion
    // });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.getFormStatus = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const formStatus = await Form.find({
      _id: req.params.formId,
      isActive: true,
    }).select("formStatus versionNumber");

    if (!formStatus) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      formStatus: formStatus,
    });
  } catch (err) {
    next(err);
  }
};

exports.getFormResponsesCount = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const responseCount = await Form.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(req.params.formId),
        },
      },
      {
        $project: {
          _id: 0,
          responsesCount: { $size: { $ifNull: ["$responses", []] } },
        },
      },
    ]);
    // console.log(responseCount);
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      count: responseCount ? responseCount[0].responsesCount : 0,
    });
  } catch (err) {
    next(err);
  }
};

exports.getFormUsersCount = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const formUsers = await Users.countDocuments({
      "permissions.formId": req.params.formId,
      $or: [
        {
          "permissions.type": "member",
        },
        {
          "permissions.type": "manager",
        },
      ],
    });

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      count: formUsers,
    });
  } catch (err) {
    next(err);
  }
};

exports.addNewForm = async (req, res, next) => {
  //console.log('dev')
  //return;
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.title) {
      const err = new Error(error_code.FORM_TITLE.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.orgId) {
      const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const obj = {
      title: req.body.title,
      organizationId: req.body.orgId,
      description: req.body.description,
      isActive: true,
      // --------------
      questions: req.body.questions || [], // change here
      // ---------------

      responses: [],
      "settings.isFlagging": true,
      "settings.isPushNotifications": true, // Add push notifications value
      "settings.isAudioAudit": true, // Add audio audit value
      versionNumber: "0",
      createdBy: req.sessionUserData.userid,
      updatedBy: req.sessionUserData.userid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const addForm = await new Form(obj).save();

    if (!addForm) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    //Add in version table
    const verObj = {
      formId: addForm._id,
      title: req.body.title,
      organizationId: req.body.orgId,
      description: req.body.description,
      isActive: true,
      // --------------
      questions: req.body.questions || [], // change here
      // ---------------

      responses: [],
      "settings.isFlagging": true,
      "settings.isPushNotifications": true, // Add push notifications value
      "settings.isAudioAudit": true,
      versionNumber: "0",
      newVersionNumber: "0",
      createdBy: req.sessionUserData.userid,
      updatedBy: req.sessionUserData.userid,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    // console.log(verObj, obj);
    const addVersionForm = await new Version(verObj).save();
    // console.log(addVersionForm);
    if (!addVersionForm) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    //Add in version table End

    res.status(200).json({
      id: addForm._id,
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};

exports.getAdminFormsList = async (req, res, next) => {
  try {
    // console.log("shubham"); return
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.params.orgId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    // let params = [{
    //     "$match": {
    //       "organizationId": mongoose.Types.ObjectId(req.params.orgId)
    //     }
    //   },
    //   {
    //     $group: {
    //        _id: "$_id",
    //        formId: {"$last":"$formId"},
    //        updatedAt: { $max: "$updatedAt" },
    //     }
    //   },
    //   {
    //     "$project": {
    //       "_id": 1,
    //       "formId": 1,
    //       "title": 1,
    //       "description": 1,
    //       "versionNumber": 1,
    //       "updatedAt": 1,
    //       "publishedAt": 1,
    //       "formStatus": 1,
    //       "questionsCount": { $size: { "$ifNull": [ "$questions", [] ] }},
    //       "responsesCount": { $size: { "$ifNull": [ "$responses", [] ] }}
    //     }
    //   },
    //   {
    //     "$sort": {
    //       "updatedAt": -1
    //     }
    //   }
    // ]

    let findObj = {
      organizationId: req.params.orgId,
    };

    let sortObj = {};
    //console.log(req.query, req.query.sortBy, req.query.sortOrder);
    if (req.query.sortBy && req.query.sortOrder) {
      sortObj[req.query.sortBy] = req.query.sortOrder;
    }

    if (req.query.search) {
      let regex = new RegExp(req.query.search, "i");
      findObj.title = regex;
    }

    if (req.query.formStatus && req.query.formStatus != "all") {
      findObj.formStatus = req.query.formStatus;
    }

    let limit = 0;
    let page = 0;

    if (req.query.page && req.query.page > 0) {
      page = req.query.page * req.query.limit;
    }

    if (req.query.limit && req.query.limit > 0) {
      limit = req.query.limit;
    }
    findObj.isActive = true;

    const allVersionList = await Form.find(findObj, { questions: 0, rules: 0 })
      .sort(sortObj)
      .limit(limit)
      .skip(page)
      .lean();

    const totalForms = await Form.countDocuments(findObj);
    // console.log(totalForms, "<<<<<<totalForms"); return
    const formsList = allVersionList.map(async (m) => {
      let questions = await Version.find(
        { formId: m._id, isActive: true },
        { questions: 1 }
      )
        .sort({ _id: -1 })
        .limit(1);

      let responseCount = await Response.countDocuments({ formId: m._id });
      let questionCount = 0;
      if (Array.isArray(questions) && questions.length) {
        for (let i = 0; i < questions[0].questions.length; i++) {
          if (questions[0].questions[i]?.isGroupChild == false) {
            questionCount++;
          }
        }
      }
      return {
        ...m,
        questionCount: questionCount,
        responseCount: responseCount,
      };
    });

    const forms = await Promise.all(formsList);
    // console.log(forms, "<<<<<Forms");
    res.status(200).json({
      forms: forms,
      status: 1,
      total: totalForms,
    });
  } catch (err) {
    next(err);
  }
};

exports.shubgetAdminFormsList = async (req, res, next) => {
  try {
    //  if (!req.params.orgId || req.params.orgId === "") {
    //   const err = new Error(error_code.FORM_NOT_FOUND.CODE);
    //   err.statusCode = 400;
    //   throw err;
    // }

    // const checkValidUser = await Users.findById(req.sessionUserData.userid);

    // if (!checkValidUser) {
    //   const err = new Error(error_code.USER_NOT_FOUND.CODE);
    //   err.statusCode = 0;
    //   throw err;
    // }

    // const isOwnerOrAdmin = checkValidUser.permissions.some(
    //   (i) => i.type.includes("owner") || i.type.includes("administrator")
    // );

    // if (!isOwnerOrAdmin) {
    //   const err = new Error(error_code.NOT_AUTHERIZED.CODE);
    //   err.statusCode = 0;
    //   throw err;
    //  }

    let findObj = {
      "permissions.type": { $in: ["member", "manager"] },
      "permissions.organizationId": req.params.orgId,
    };

    if (req.query.search) {
      let regex = new RegExp(req.query.search, "i");
      findObj.$or = [
        {
          name: regex,
        },
        {
          mobile: regex,
        },
      ];
    }

    let limit = 0;
    let pageNo = 0;

    if (req.query.limit && req.query.limit > 0) {
      limit = req.query.limit;
    }

    if (req.query.page && req.query.page > 0) {
      pageNo = req.query.page * limit;
    }

    let getAudience = await Users.find(findObj)
      .lean()
      .sort({ updatedAt: -1 })
      .skip(pageNo)
      .limit(limit);

    let audienceTotal = await Users.countDocuments(findObj);

    if (!getAudience) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const audienceListWithCounts = await Promise.all(
      getAudience.map(async (obj) => {
        let memberTeamCount = 0;
        let managerTeamCount = 0;

        obj.permissions.forEach((i) => {
          if (i.teamId && i.type === "member") {
            memberTeamCount++;
          }
          if (i.teamId && i.type === "manager") {
            managerTeamCount++;
          }
        });

        let responseCount = await Response.countDocuments({ userId: obj._id });
        let countObj = {
          deviceCount: obj.devices.length,
          responsesCount: responseCount,
          memberTeamCount: memberTeamCount,
          managerTeamCount: managerTeamCount,
        };

        delete obj.permissions;
        return { ...obj, ...countObj };
      })
    );

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      audience: audienceListWithCounts,
      total: audienceTotal,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.getQuestionsCount = async (req, res, next) => {
  try {
    if (!req.params.formId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    let questions = await Version.find(
      { formId: req.params.formId, isActive: true },
      { questions: 1 }
    )
      .sort({ _id: -1 })
      .limit(1);
    questionCount = 0;
    if (Array.isArray(questions) && questions.length) {
      questionCount = questions[0].questions.length;
    }
    res.status(200).json({
      status: 1,
      total: questionCount,
    });
  } catch (err) {
    next(err);
  }
};

exports.getRulesTypes = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
  } catch (err) {
    next(err);
  }
};

exports.getRulesQuestions = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const last = await version
      .findOne({ formId: req.params.formId })
      .sort({ updatedAt: -1 });
    const masterId = last._id.toString();
    console.log(masterId);
    const questions = await Version.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(masterId),
          isActive: true,
        },
      },
      { $unwind: "$questions" },
      {
        $match: {
          "questions.questionType": {
            $in: ["number", "mcq_single", "mcq_multiple"],
          },
        },
      },
      {
        $group: {
          // formId: "$formId",
          _id: masterId,
          questions: {
            $push: {
              questionType: "$questions.questionType",
              title: "$questions.title",
              displayOrder: "$questions.displayOrder",
              _id: "$questions._id",
            },
          },
        },
      },
    ]);

    if (!questions) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      questions: questions[0].questions,
    });
  } catch (err) {
    next(err);
  }
};

exports.addRule = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );
    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    const isFormExists = await Form.countDocuments({ _id: req.body.formId });
    // console.log(isFormExists, "isFormExists");
    if (!isFormExists) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const ruleObj = {
      _id: mongoose.Types.ObjectId(),
      operator: req.body.operator,
      conditions: req.body.conditions,
      questions: req.body.questions,
    };

    const verId = await Version.find({
      formId: req.body.formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);
    let checkId = await Version.updateOne(
      { _id: verId[0]._id },
      {
        $push: {
          rules: ruleObj,
        },
      }
    );
    // console.log(a, "<=====a");
    const modifyForm = await Form.findByIdAndUpdate(req.body.formId, {
      updatedAt: Date.now(),
    });
    // console.log(ruleObj._id,"<<<ruleObj._id")
    if (!checkId) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      id: checkId,
      message: "Added Rule Successfully",
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateRule = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const isFormExists = await Form.countDocuments({ _id: req.body.formId });

    if (!isFormExists) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    let { conditions, operator, questions, ruleId, formId } =
      req.body;
      const verId = await Version.find({ formId: formId });
      console.log(verId,"verId");
    if (verId.length > 0) {
      for (let i = 0; i < conditions.length; i++) {
        conditions[i].questionId = mongoose.Types.ObjectId(
          conditions[i].questionId
        );
      }
      for (let i = 0; i < questions.length; i++) {
        questions[i] = mongoose.Types.ObjectId(questions[i]);
      }
      const lastId = await Version.findOne({ formId: formId }).sort({
        updatedAt: -1,
      });
      // .exec();
      const masterId = lastId._id.toString();
      // console.log(masterId);
      // ----------------
      let check = await Version.updateOne(
        // { formId: formId, versionNumber: versionNumber },
        { _id: masterId },
        {
          $set: {
            "rules.$[rule].operator": operator,
            "rules.$[rule].conditions": conditions,
            "rules.$[rule].questions": questions,
          },
        },
        {
          arrayFilters: [{ "rule._id": mongoose.Types.ObjectId(ruleId) }],
        }
      );

      res.status(200).json({
        status: 200,
        success: true,
        message: "Data updated Succesfully",
        data: check,
      });
    } else {
      res.status(400).json({ data: check, message: "Data Not Found" });
    }
  } catch (error) {
    console.log(error);
  }
};

exports.updateRule1 = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const isFormExists = await Form.countDocuments({ _id: req.body.formId });

    if (!isFormExists) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    let { conditions, operator, questions, ruleId, formId, versionNumber } =
      req.body;
    const verId = await Version.find({ formId: formId });
    if (verId.length > 0) {
      for (let i = 0; i < conditions.length; i++) {
        conditions[i].questionId = mongoose.Types.ObjectId(
          conditions[i].questionId
        );
      }
      for (let i = 0; i < questions.length; i++) {
        questions[i] = mongoose.Types.ObjectId(questions[i]);
      }

      let check = await Version.updateOne(
        { formId: formId, versionNumber: versionNumber },
        {
          $set: {
            "rules.$[rule].operator": operator,
            "rules.$[rule].conditions": conditions,
            "rules.$[rule].questions": questions,
          },
        },
        {
          arrayFilters: [{ "rule._id": mongoose.Types.ObjectId(ruleId) }],
        }
      );

      res.status(200).json({
        status: 200,
        success: true,
        message: "Data updated Succesfully",
        data: check,
      });
    } else {
      res.status(400).json({ data: check, message: "Data Not Found" });
    }
  } catch (error) {
    console.log(error);
  }
};

// ------update Rule------

exports.copyForm = async (req, res, next) => {
  try {
    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.orgId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.formTitle) {
      const err = new Error("Form title not found");
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    // Fetch the latest version of the form
    let obj = await Version.findOne(
      { formId: req.body.formId, orgId: req.body.orgId },
      { _id: 0, __v: 0, formId: 0 }
    ).sort({ createdAt: -1 });

    if (!obj) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    obj = obj.toObject();
    obj.title = req.body.formTitle;
    obj.publishedAt = Date.now();
    obj.updatedAt = Date.now();
    obj.createdAt = Date.now();
    obj.formStatus = "draft";
    
    let addForm = await new Form(obj).save();

    if (!addForm) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    obj["formId"] = addForm._id;

    const addVersionForm = await new Version(obj).save();

    if (!addVersionForm) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      id: addForm._id,
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

// --------------------------- Rules for group-------------------------
exports.addRuleForGroup = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );
    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.parantId || req.body.parantId == "") {
      const err = new Error(error_code.QUESTION_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isFormExists = await Form.countDocuments({ _id: req.body.formId });
    if (!isFormExists) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const ruleObjForGroup = {
      _id: mongoose.Types.ObjectId(),
      operator: req.body.operator,
      conditions: req.body.conditions,
      questions: req.body.questions,
    };
    const verId = await Version.find({
      formId: req.body.formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);
    let checkId = await Version.updateOne(
      { _id: verId[0]._id, "questions._id": req.body.parantId },
      {
        $push: {
          "questions.$.groupQuestions.rules": ruleObjForGroup,
        },
      }
    );
    const modifyForm = await Form.findByIdAndUpdate(req.body.formId, {
      updatedAt: Date.now(),
    });
    if (!checkId) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    res.status(200).json({
      status: 1,
      id: checkId,
      message: "Added child Rule Successfully",
      error_code: error_code.NONE.CODE,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.updateRuleForGroup = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );
    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.parantId || req.body.parantId == "") {
      const err = new Error(error_code.QUESTION_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.ruleId || req.body.ruleId == "") {
      const err = new Error(error_code.RULE_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isFormExists = await Form.countDocuments({ _id: req.body.formId });
    if (!isFormExists) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    let { conditions, operator, questions, ruleId, formId, parantId } =
      req.body;
    const verId = await Version.find({
      formId: formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);
    if (verId.length > 0) {
      for (let i = 0; i < conditions.length; i++) {
        conditions[i].questionId = mongoose.Types.ObjectId(
          conditions[i].questionId
        );
      }
      for (let i = 0; i < questions.length; i++) {
        questions[i] = mongoose.Types.ObjectId(questions[i]);
      }
      let checkId = await Version.updateOne(
        {
          _id: verId[0]._id,
          "questions._id": parantId,
          "questions.groupQuestions.rules._id": ruleId,
        },
        {
          $set: {
            "questions.$[elem].groupQuestions.rules.$[rule].operator": operator,
            "questions.$[elem].groupQuestions.rules.$[rule].conditions":
              conditions,
            "questions.$[elem].groupQuestions.rules.$[rule].questions":
              questions,
          },
        },
        {
          arrayFilters: [{ "elem._id": parantId }, { "rule._id": ruleId }],
        }
      );
      const modifyForm = await Form.findByIdAndUpdate(formId, {
        updatedAt: Date.now(),
      });

      if (!checkId) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }

      res.status(200).json({
        status: 1,
        id: checkId,
        message: "Updated group Rule Successfully",
      });
    } else {
      res.json({
        status: 400,
        success: false,
        message: "Data Not Found",
      });
    }
  } catch (error) {
    console.log(error);
  }
};

exports.deleteRuleForGroup = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );
    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const formId = req.params.formId;
    const ruleId = req.params.ruleId;
    const parentId = req.params.parentId;
    if (!formId) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!ruleId) {
      const err = new Error(error_code.RULE_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!parentId) {
      const err = new Error(error_code.PARENT_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isFormExists = await Form.countDocuments({ _id: formId });

    if (!isFormExists) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const verId = await Version.find({
      formId: formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);
    //  -------------------------
    const parentAndRuleExist = await Version.exists({
      _id: verId[0]._id,
      "questions._id": parentId,
      "questions.groupQuestions.rules._id": ruleId,
    });

    if (!parentAndRuleExist) {
      const err = new Error(error_code.PARENT_AND_RULE_NOT_EXIST.CODE);
      err.statusCode = 0;
      throw err;
    } 
    //  ------------------------- 
    const result = await Version.updateOne(
      {
        _id: verId[0]._id,
        "questions._id":parentId,
        "questions.groupQuestions.rules._id": ruleId,
      },
      {
        $pull: {
          "questions.$.groupQuestions.rules": { _id: ruleId },
        },
      }
    );
    if (!result) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    const modifyForm = await Form.findByIdAndUpdate(formId, {
      updatedAt: Date.now(),
    });
    res.json({
      status: 200,
      success: true,
      message: "Group rule deleted successfully",
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getRulesForGroup = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );
    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const formId = req.params.formId;
    const parentId = req.params.parentId;

    if (!formId || !parentId) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 400;
      throw err;
    }

    const groupRules = await Version.findOne({
      formId: formId,
      isActive: true,
      'questions._id': parentId,
    })
      .select('questions.groupQuestions.rules')
      .sort({ _id: -1 })
      .limit(1);

    const extractedRules = Array.isArray(groupRules?.questions)
      ? groupRules.questions
          .map((question) => question.groupQuestions.rules)
          .flat()
      : [];

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      rules: extractedRules,
    });
  } catch (error) {
    next(error);
  }
};
// --------------------------- Rules for group-------------------------

exports.getRules = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const rules = await Version.find({
      formId: req.params.formId,
      isActive: true,
    })
      .select("rules")
      .sort({ _id: -1 })
      .limit(1);

    if (!rules) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    //     // -----------rules count -----------
    //     const rulesArray = rules[0].rules;
    //     const rulesWithCount = rulesArray.map((rule, index) => ({
    //       ...rule._doc,
    //       count: index + 1,
    //     }));
    // //  -----------rules count ----------
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      rules: rules[0].rules,
      // rules: rulesWithCount,
    });
  } catch (err) {
    next(err);
  }
};

exports.searchRules = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const allQuestions = await Version.aggregate([
      {
        $match: {
          formId: mongoose.Types.ObjectId(req.params.formId),
        },
      },
      {
        $project: {
          questions: {
            $filter: {
              input: "$questions",
              as: "questions",
              cond: {
                $and: [
                  {
                    $or: [
                      {
                        $regexMatch: {
                          input: "$$questions.title",
                          regex: new RegExp(req.query.s),
                        },
                      },
                      {
                        $regexMatch: {
                          input: "$$questions.keyword",
                          regex: new RegExp(req.query.s),
                        },
                      },
                    ],
                  },
                  {
                    $eq: ["$$questions.isGroupChild", false],
                  },
                ],
              },
            },
          },
        },
      },
      { $sort: { _id: -1, displayOrder: 1 } },
      { $limit: 1 },
    ]);
    if (allQuestions[0] && allQuestions[0].questions.length) {
      let questionsArr = allQuestions[0].questions;
      const rules = await Version.aggregate([
        {
          $match: {
            formId: mongoose.Types.ObjectId(req.params.formId),
          },
        },
        {
          $project: {
            rules: {
              $filter: {
                input: "$rules",
                as: "rules",
                cond: {},
              },
            },
          },
        },
        { $sort: { _id: -1, displayOrder: 1 } },
        { $limit: 1 },
      ]);
      let newRulesArr = [];
      if (!rules) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      } else {
        for (let i = 0; i < rules[0].rules.length; i++) {
          let ifExists = false;
          for (let condition of rules[0].rules[i].conditions) {
            if (
              questionsArr
                .map((o) => {
                  return o._id.toString();
                })
                .includes(condition.questionId.toString())
            ) {
              ifExists = true;
            }
          }
          for (let question of rules[0].rules[i].questions) {
            if (
              questionsArr
                .map((o) => {
                  return o._id.toString();
                })
                .includes(question.toString())
            ) {
              ifExists = true;
            }
          }
          if (ifExists == true) {
            newRulesArr.push(rules[0].rules[i]);
          }
        }
      }

      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        rules: newRulesArr,
      });
    } else {
      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        rules: [],
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.addTeamAccess = async (req, res, next) => {
  try {
    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const addAccess = await Form.updateOne(
      { _id: req.body.formId },
      {
        $addToSet: { teams: req.body.teamId },
      }
    );

    const addAccessVersion = await Version.updateMany(
      { formId: req.body.formId },
      {
        $addToSet: { teams: req.body.teamId },
      }
    );

    if (!addAccess) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.removeTeamAccess = async (req, res, next) => {
  if (!req.body.formId || req.body.formId == "") {
    const err = new Error(error_code.FORM_NOT_FOUND.CODE);
    err.statusCode = 400;
    throw err;
  }

  const checkValidUser = await Users.findById(req.sessionUserData.userid);

  if (!checkValidUser) {
    const err = new Error(error_code.USER_NOT_FOUND.CODE);
    err.statusCode = 0;
    throw err;
  }

  const isOwnerOrAdmin = checkValidUser.permissions.some(
    (i) => i.type.includes("owner") || i.type.includes("administrator")
  );

  if (!isOwnerOrAdmin) {
    const err = new Error(error_code.NOT_AUTHERIZED.CODE);
    err.statusCode = 0;
    throw err;
  }

  const removeAccess = await Form.updateOne(
    { _id: req.body.formId },
    {
      $pull: {
        teams: {
          $in: req.body.teamId,
        },
      },
    }
  );

  if (!removeAccess) {
    const err = new Error(error_code.UNKNOWN_ERROR.CODE);
    err.statusCode = 0;
    throw err;
  }

  res.status(200).json({
    status: 1,
    error_code: error_code.NONE.CODE,
  });
};

/////delete////
exports.deleteTeamForForms = async (req, res, next) => {
  // console.log(req.body);
  if (!req.body.teamId || req.body.teamId == "") {
    // const err = new Error(error_code.ID_NOT_FOUND.CODE);
    // err.statusCode = 400;
    // throw err;
    console.log("NOT TEAMID");
  }

  if (!req.body.formsId) {
    console.log("NOT FORMID");
    // const err = new Error(error_code.ID_NOT_FOUND.CODE);
    // err.statusCode = 400;
    // throw err;
  }
  // const updateUser = [];
  // for (let i = 0; i < req.body.formsId.length; i++) {
  // updateUser.push(
  const result = await Form.update(
    {
      _id: mongoose.Types.ObjectId(req.body.formsId),
      teams: {
        $elemMatch: {
          teamId: mongoose.Types.ObjectId(req.body.teamId),
        },
      },
    },
    {
      $pull: {
        teams: {
          teamId: mongoose.Types.ObjectId(req.body.teamId),
        },
      },
    }
  );

  res.status(200).json({
    status: 1,
    error_code: error_code.NONE.CODE,
    data: result,
  });
};

exports.getFormTeams = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const getTeams = await Form.find(
      { _id: req.params.formId, isActive: true },
      { teams: 1, _id: 0 }
    );

    if (!getTeams) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      teams: getTeams[0].teams,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.getFormVersionbyId = async (req, res, next) => {
  try {
    if (!req.params.formId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    let limit = 0;
    let page = 0;

    if (req.query.page && req.query.page > 0) {
      page = req.query.page * req.query.limit;
    }

    if (req.query.limit && req.query.limit > 0) {
      limit = req.query.limit;
    }

    const versionData = await Version.find({
      formId: req.params.formId,
      isActive: true,
    })
      .sort({ updatedAt: -1 })
      .skip(page)
      .limit(limit);
    const formsCount = await Version.countDocuments({
      formId: req.params.formId,
    });
    if (!versionData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      data: versionData,
      total: formsCount,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.exportForm = async (req, res, next) => {
  try {
    if (!req.params.formId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const versionData = await Version.find({ formId: req.params.formId })
      .sort({ updatedAt: -1 })
      .limit(1);

    if (!versionData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    let jsonData = {
      title: versionData[0].title,
      questions: [],
      rules: [],
    };
    let questions = versionData[0].questions;
    for (let i = 0; i < questions.length; i++) {
      let obj = {
        Id: questions[i]._id,
        Order: questions[i].displayOrder || i,
        "Question Type": "",
        "Question Title": questions[i].title,
        Description: questions[i].description ? questions[i].description : null,
        Keyword: questions[i].keyword ? questions[i].keyword : null,
        Mandatory: questions[i].isRequired,
        "Help Image":
          !questions[i].helpImageURL ||
          JSON.stringify(questions[i].helpImageURL) == "{}" ||
          !questions[i].helpImageURL.path
            ? ""
            : questions[i].helpImageURL.path,
        "Lower Limit": "",
        "Upper Limit": "",
        "Image Quality": "",
        Accuracy: "",
        "Mark On Map": "",
        "Gallery Upload Allowed": "",
        "Allow Caption": "",
        "Allow Decimal Number": "",
        "Date Format": "",
        "Time Format": "",
        "Default Country": "",
        "Grouped Question Child": questions[i].isGroupChild,
        "Group Type": "",
        "Group Labels": "",
        "Group Labels Dependent On": "",
        Option: "",
        "Option Active": "",
        "Option Type": "",
        "Special Option Code": "",
        Code: "",
        "Option Image": "",
        "Validation Type": "",
        "Measurement Unit": "",
        "Audio Muted": "",
        "Rating Type": "",
        "Step Size": "",
      };
      if (questions[i].questionType == "mcq_single") {
        if (questions[i].properties.hasOwnProperty("options")) {
          for (let option1 of questions[i].properties.options) {
            obj["Question Type"] = "Choice";
            obj["Option"] = option1.label ? option1.label : "";
            obj["Option Active"] = option1.isActive ? option1.isActive : true;
            obj["Option Type"] = option1.type ? option1.type : "simple";
            obj["Special Option Code"] = option1.code ? option1.code : "";
            obj["Code"] = option1.code ? option1.code : "";
            obj["Option Image"] = option1.optImg ? option1.optImg : "";
            obj["Lower Limit"] = questions[i].properties.minLimit
              ? questions[i].properties.minLimit
              : 1;
            obj["Upper Limit"] = questions[i].properties.maxLimit
              ? questions[i].properties.maxLimit
              : 1;
            jsonData.questions.push({ ...obj });
          }
        }
      } else if (questions[i].questionType == "mcq_multiple") {
        if (questions[i].properties.hasOwnProperty("options")) {
          for (let option of questions[i].properties.options) {
            obj["Question Type"] = "Choice";
            obj["Option"] = option.label ? option.label : "";
            obj["Option Active"] = option.isActive ? option.isActive : true;
            obj["Option Type"] = option.type ? option.type : "";
            obj["Special Option Code"] = option.code ? option.code : "";
            obj["Code"] = option.code ? option.code : "";
            obj["Option Image"] = option.optImg ? option.optImg : "";
            obj["Lower Limit"] = questions[i].properties.minLimit
              ? questions[i].properties.minLimit
              : 1;
            obj["Upper Limit"] = questions[i].properties.maxLimit
              ? questions[i].properties.maxLimit
              : 1;
            jsonData.questions.push({ ...obj });
          }
        }
      } else if (questions[i].questionType == "text") {
        obj["Question Type"] = "Text";
        obj["Upper Limit"] = questions[i].properties.maxLimit
          ? questions[i].properties.maxLimit
          : "";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "number") {
        obj["Question Type"] = "Number";
        obj["Lower Limit"] = questions[i].properties.minLimit
          ? questions[i].properties.minLimit
          : "";
        obj["Upper Limit"] = questions[i].properties.maxLimit
          ? questions[i].properties.maxLimit
          : "";
        obj["Allow Decimal Number"] = questions[i].properties.isDecimalAllowed
          ? questions[i].properties.isDecimalAllowed
          : "";
        obj["Validation Type"] = questions[i].properties.validationType
          ? questions[i].properties.validationType
          : "";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "location") {
        obj["Question Type"] = "Location";
        obj["Accuracy"] = questions[i].properties.accuracy
          ? questions[i].properties.accuracy
          : "";
        obj["Mark On Map"] = questions[i].properties.isMap
          ? questions[i].properties.isMap
          : "";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "date") {
        obj["Question Type"] = "Date";
        obj["Date Format"] = questions[i].properties.dateFormat
          ? questions[i].properties.dateFormat
          : "";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "time") {
        obj["Question Type"] = "Time";
        obj["Time Format"] = questions[i].properties.timeFormat
          ? questions[i].properties.timeFormat
          : "";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "note") {
        obj["Question Type"] = "Note";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "signature") {
        obj["Question Type"] = "Signature";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "section_break") {
        obj["Question Type"] = "Section Break";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "area_on_map") {
        obj["Question Type"] = "Area on Map";
        obj["Measurement Unit"] = questions[i].properties.measurementUnit
          ? questions[i].properties.measurementUnit
          : "";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "distance_on_map") {
        obj["Question Type"] = "Distance on Map";
        obj["Measurement Unit"] = questions[i].properties.measurementUnit
          ? questions[i].properties.measurementUnit
          : "";
        jsonData.questions.push(obj);
      }
      // ---------dropdown
      else if (questions[i].questionType == "dropdown") {
        obj["Question Type"] = "dropdown";
        jsonData.questions.push(obj);
      }
      // --------------dropdown
      else if (questions[i].questionType == "image") {
        obj["Question Type"] = "Image";
        obj["Image Quality"] = questions[i].properties.imgQuality
          ? questions[i].properties.imgQuality
          : "";
        obj["Gallery Upload Allowed"] = questions[i].properties.galleryAllowed
          ? questions[i].properties.galleryAllowed
          : "";
        jsonData.questions.push(obj);
      }
      // ---------------multiple_images
      else if (questions[i].questionType == "multiple_image") {
        obj["Question Type"] = "Multiple Image";
        obj["Image Quality"] = questions[i].properties.imgQuality
          ? questions[i].properties.imgQuality
          : "";
        obj["Gallery Upload Allowed"] = questions[i].properties.galleryAllowed
          ? questions[i].properties.galleryAllowed
          : "";
        jsonData.questions.push(obj);
      }
      // ---------------multiple_images
      else if (questions[i].questionType == "image_geo_tag") {
        obj["Question Type"] = "Image Geo Tag";
        obj["Image Quality"] = questions[i].properties.imageResolution
          ? questions[i].properties.imageResolution
          : "";
        obj["Accuracy"] = questions[i].properties.locationAccuracy
          ? questions[i].properties.locationAccuracy
          : "";
        jsonData.questions.push(obj);
      }
      // ---------------------multiple image geo tag-------------------------------
      else if (questions[i].questionType == "multiple_image_geo_tag") {
        obj["Question Type"] = "Multiple Image Geo Tag";
        obj["Image Quality"] = questions[i].properties.imageResolution
          ? questions[i].properties.imageResolution
          : "";
        obj["Accuracy"] = questions[i].properties.locationAccuracy
          ? questions[i].properties.locationAccuracy
          : "";
        jsonData.questions.push(obj);
      }
      // ---------------------multiple image geo tag-------------------------------
      else if (questions[i].questionType == "phone") {
        obj["Question Type"] = "Phone";
        let countryCode =
          countryCodes.find(
            (o) => o.calling_code == questions[i].properties.countryCode
          ) || {};
        obj["Default Country"] = countryCode.country ? countryCode.country : "";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "email") {
        obj["Question Type"] = "Email";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "audio") {
        obj["Question Type"] = "Audio";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "video") {
        obj["Audio Muted"] = questions[i].properties.isAudioMuted;
        if (questions[i].properties.videoResolution == "480p") {
          obj["Image Quality"] = "low";
        } else if (questions[i].properties.videoResolution == "720p") {
          obj["Image Quality"] = "medium";
        } else if (questions[i].properties.videoResolution == "1080p") {
          obj["Image Quality"] = "high";
        }
        obj["Question Type"] = "Video";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "file_upload") {
        obj["Question Type"] = "File Upload";
        jsonData.questions.push(obj);
      }
      // -------------multiple File Upload
      else if (questions[i].questionType == "multiple_file_upload") {
        obj["Question Type"] = "Multiple File Upload";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "likert_scale") {
        obj["Question Type"] = "Likert Scale";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "scale") {
        obj["Question Type"] = "Scale";
        obj["Lower Limit"] = questions[i].properties.minLimit
          ? questions[i].properties.minLimit
          : "";
        obj["Upper Limit"] = questions[i].properties.maxLimit
          ? questions[i].properties.maxLimit
          : "";
        obj["Step Size"] = questions[i].properties.stepSize
          ? questions[i].properties.stepSize
          : "";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "rating") {
        obj["Question Type"] = "Rating";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "grp_no_repeat") {
        obj["Question Type"] = "Group";
        obj["Group Type"] = "No Repeat";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "grp_number") {
        obj["Question Type"] = "Group";
        obj["Group Type"] = "numerical";
        obj["Group Labels Dependent On"] = questions[i].groupQuestions
          .parantSettings.questionId
          ? questions[i].groupQuestions.parantSettings.questionId
          : "";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "grp_choice") {
        obj["Question Type"] = "Group";
        if (questions[i].groupQuestions.parantSettings.criteria.selection) {
          obj["Group Type"] = "selected";
        } else {
          obj["Group Type"] = "notselected";
        }
        obj["Group Labels Dependent On"] = questions[i].groupQuestions
          .parantSettings.questionId
          ? questions[i].groupQuestions.parantSettings.questionId
          : "";
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "grp_custom") {
        obj["Question Type"] = "Group";
        obj["Group Type"] = "Static";
        obj["Group Labels"] =
          questions[i].groupQuestions.parantSettings.groupLabels.join();
        jsonData.questions.push(obj);
      } else if (questions[i].questionType == "monitoring") {
        jsonData.questions.push(obj);
      }
       else if (questions[i].questionType == "barcode") {
        obj["Question Type"] = "Barcode";
        jsonData.questions.push(obj);
      }
       else if (questions[i].questionType == "live_tracking") {
        obj["Question Type"] = "Live Tracking";
        jsonData.questions.push(obj);
      }
    }

    let rules = versionData[0].rules;

    for (let i = 0; i < rules.length; i++) {
      let rulesObj = {
        "Rule Id": rules[i]._id,
        "Criteria Type": "",
        "Show Question": "",
        "If Answer to Question": "",
        "Matches Condition": "",
        "Value to Match": "",
        "Criteria Join Over": "",
        "Rule Join Over": "",
      };
      for (let question of rules[i].questions) {
        for (let condition of rules[i].conditions) {
          rulesObj["Show Question"] = question._id;
          rulesObj["Criteria Type"] = condition.ruleType;
          rulesObj["If Answer to Question"] = condition.questionId;
          rulesObj["Matches Condition"] = condition.properties.operator;
          if (condition.ruleType == "choice") {
            rulesObj["Value to Match"] = condition.properties.options.join(",");
          } else if (condition.ruleType == "number") {
            rulesObj["Value to Match"] = condition.properties.value;
          }
          rulesObj["Criteria Join Over"] = "OR";
          rulesObj["Rule Join Over"] = rules[i].operator;
          jsonData.rules.push({ ...rulesObj });
        }
      }
    }

    res.status(200).json({
      status: 1,
      data: jsonData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.getVersionbyId = async (req, res, next) => {
  try {
    if (!req.params.id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const versionData = await Version.findById(req.params.id);
    //console.log(versionData);
    if (!versionData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      data: versionData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateFormById = async (req, res, next) => {
  try {
    if (!req.params.formId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.title) {
      const err = new Error("Form title is required");
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isUpdated = await Form.updateOne(
      { _id: req.params.formId },
      {
        $set: {
          title: req.body.title,
          description: req.body.description,
        },
      }
    );
    if (!isUpdated) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    const verId = await Version.find({
      formId: req.params.formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);
    const isUpdatedVersion = await Version.updateOne(
      { formId: req.params.formId },
      {
        $set: {
          title: req.body.title,
          description: req.body.description,
        },
      }
    );
    if (!isUpdatedVersion) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteRules = async (req, res, next) => {
  if (!req.params.formId || req.params.formId == "") {
    const err = new Error(error_code.FORM_NOT_FOUND.CODE);
    err.statusCode = 400;
    throw err;
  }

  const checkValidUser = await Users.findById(req.sessionUserData.userid);

  if (!checkValidUser) {
    const err = new Error(error_code.USER_NOT_FOUND.CODE);
    err.statusCode = 0;
    throw err;
  }

  const isOwnerOrAdmin = checkValidUser.permissions.some(
    (i) => i.type.includes("owner") || i.type.includes("administrator")
  );

  if (!isOwnerOrAdmin) {
    const err = new Error(error_code.NOT_AUTHERIZED.CODE);
    err.statusCode = 0;
    throw err;
  }

  const verId = await Version.find({
    formId: req.params.formId,
    isActive: true,
  })
    .sort({ _id: -1 })
    .limit(1);

  const deleteQuestion = await Version.updateOne(
    { _id: verId[0]._id, "rules._id": req.params.ruleId },
    {
      $pull: {
        rules: { _id: req.params.ruleId },
      },
    }
  );

  const modifyForm = await Form.findByIdAndUpdate(req.params.formId, {
    updatedAt: Date.now(),
  });

  if (!deleteQuestion) {
    const err = new Error(error_code.UNKNOWN_ERROR.CODE);
    err.statusCode = 0;
    throw err;
  }

  res.status(200).json({
    status: 1,
    error_code: error_code.NONE.CODE,
  });
};

exports.publishFlagging = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const flagObj = {
      "settings.isFlagging": req.body.isFlagging,
    };

    //Get the Data from Version Table
    var getData = await Version.find({
      formId: req.params.formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);

    const isVersionUpdated = await Version.updateOne(
      {
        _id: getData[0]._id,
      },
      {
        $set: flagObj,
      }
    );
    const isFormUpdated = await Form.updateOne(
      {
        _id: req.params.formId,
      },
      {
        $set: flagObj,
      },
      {
        upsert: true,
      }
    );

    if (!isFormUpdated) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.changeFormSettings = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.settingType || req.body.settingType == "") {
      const err = new Error(error_code.SETTING_TYPE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (typeof req.body.settingValue !== "boolean") {
      const err = new Error(error_code.SETTING_VALUE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    let settingObj = {};
    if (req.body.settingType === "limit") {
      settingObj["settings.isLimitResponses"] = req.body.settingValue;
      settingObj["settings.limitResponsesValue"] = req.body.settingValue
        ? req.body.settingAllowRes
        : null;
    } else if (req.body.settingType === "notifi") {
      settingObj["settings.isPushNotifications"] = req.body.settingValue;
    } else if (req.body.settingType === "audit") {
      settingObj["settings.isAudioAudit"] = req.body.settingValue;
    } else if (req.body.settingType === "draft") {
      settingObj["settings.isDraftResponseDisabled"] = req.body.settingValue;
    } else {
      const err = new Error(error_code.INVALID_SETTING_TYPE.CODE);
      err.statusCode = 0;
      throw err;
    }

    //Get the Data from Version Table
    var getData = await Version.find({
      formId: req.params.formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);

    const isVersionUpdated = await Version.updateOne(
      { _id: getData[0]._id },
      { $set: settingObj }
    );
    const isFormUpdated = await Form.updateOne(
      { _id: req.params.formId },
      { $set: settingObj },
      { upsert: true }
    );

    if (!isFormUpdated) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.unpublishForm = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    //Get the Data from Version Table
    var getData = await Version.find({
      formId: req.params.formId,
      isActive: true,
    })
      .sort({ _id: -1 })
      .limit(1);

    const isVersionUpdated = await Version.updateOne(
      { _id: getData[0]._id },
      { $set: { formStatus: "draft" } }
    );
    const isFormUpdated = await Form.updateOne(
      { _id: req.params.formId },
      { $set: { formStatus: "draft" } }
    );

    if (!isFormUpdated || !isVersionUpdated) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.deleteForm = async (req, res, next) => {
  // soft delete
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isVersionUpdated = await Version.updateMany(
      { formId: req.params.formId },
      { $set: { isActive: false } }
    );
    const isFormUpdated = await Form.updateOne(
      { _id: req.params.formId },
      { $set: { isActive: false } }
    );
    const isResponseUpdated = await Form.updateMany(
      { formId: req.params.formId },
      { $set: { status: "inactive" } }
    );

    if (!isFormUpdated || !isVersionUpdated || !isResponseUpdated) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

///////////////////////// Group ques ///////////////////////////////

exports.addChildQuestion = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.parantId || req.body.parantId == "") {
      const err = new Error(error_code.QUESTION_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.childId || req.body.childId == "") {
      const err = new Error(error_code.QUESTION_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const lastId = await Version.findOne({ formId: req.params.formId })
      .sort({ updatedAt: -1 })
      .exec();
    const masterId = lastId._id;
    console.log(masterId, "masterId");
    const updateQuestion = await Version.updateOne(
      // { formId: req.params.formId, "questions._id": req.body.parantId },
      { _id: masterId, "questions._id": req.body.parantId },
      {
        $push: {
          "questions.$.groupQuestions.childQuestions": req.body.childId,
        },
        $set: { updatedAt: Date.now() },
      }
    );

    if (!updateQuestion) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.removeChildQuestion = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.parantId || req.body.parantId == "") {
      const err = new Error(error_code.QUESTION_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.childId || req.body.childId == "") {
      const err = new Error(error_code.QUESTION_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const lastId = await Version.findOne({ formId: req.params.formId }).sort({
      updatedAt: -1,
    });
    const masterId = lastId._id;
    const updateQuestion = await Version.updateOne(
      // { formId: req.params.formId, "questions._id": req.body.parantId },
      { _id: masterId, "questions._id": req.body.parantId },
      {
        $pull: {
          "questions.$.groupQuestions.childQuestions": req.body.childId,
        },
        $set: { updatedAt: Date.now() },
      }
    );

    if (!updateQuestion) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.getChildQuestions = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    console.log(req.query.childQues);
    if (!req.query.childQues || req.query.childQues == "") {
      req.query.childQues = [];
    } else {
      req.query.childQues = JSON.parse(req.query.childQues || "{}");
    }
    const childQuestions = req.query.childQues.map((child) =>
      mongoose.Types.ObjectId(child)
    );

    console.log(childQuestions, req.query.childQues);
    // console.log(childQuestions,"childddd");
    const allQuestions = await Version.aggregate([
      {
        $match: {
          formId: mongoose.Types.ObjectId(req.params.formId),
          isActive: true,
        },
      },
      {
        $project: {
          questions: {
            $filter: {
              input: "$questions",
              as: "questions",
              cond: {
                $and: [
                  { $eq: ["$$questions.isGroupChild", true] },
                  { $in: ["$$questions._id", childQuestions] },
                ],
              },
            },
          },
        },
      },
      { $sort: { _id: -1, displayOrder: 1 } },
      { $limit: 1 },
    ]);

    if (!allQuestions) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    //console.log(allQuestions,"allquestions");
    let getAllQuestions = [];
    if (Array.isArray(allQuestions) && allQuestions.length) {
      getAllQuestions = allQuestions[0].questions;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      questions: getAllQuestions,
    });
  } catch (err) {
    next(err);
  }
};

exports.getTypeSpecificQuestions = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (req.query.type === "choice") {
      req.query.type = ["mcq_single", "mcq_multiple"];
    } else {
      req.query.type = ["number"];
    }

    const allQuestions = await Version.aggregate([
      {
        $match: {
          formId: mongoose.Types.ObjectId(req.params.formId),
          isActive: true,
        },
      },
      {
        $project: {
          questions: {
            $filter: {
              input: "$questions",
              as: "questions",
              cond: {
                $and: [
                  { $eq: ["$$questions.isGroupChild", false] },
                  { $in: ["$$questions.questionType", req.query.type] },
                ],
              },
            },
          },
        },
      },
      { $sort: { _id: -1, displayOrder: 1 } },
      { $limit: 1 },
    ]);

    if (!allQuestions) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    let getAllQuestions = [];
    if (Array.isArray(allQuestions) && allQuestions.length) {
      getAllQuestions = allQuestions[0].questions;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      questions: getAllQuestions,
    });
  } catch (err) {
    next(err);
  }
};

exports.updateTypeSpecificQuestionsInParant = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.parantId || req.body.parantId == "") {
      const err = new Error(error_code.QUESTION_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.groupType || req.body.groupType == "") {
      const err = new Error(error_code.GROUP_TYPE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!["non-custom", "custom"].includes(req.body.groupType)) {
      const err = new Error(error_code.GROUP_TYPE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (req.body.groupType === "non-custom") {
      if (!req.body.quesId || req.body.quesId == "") {
        const err = new Error(error_code.QUESTION_ID_NOT_FOUND.CODE);
        err.statusCode = 0;
        throw err;
      }
      if (typeof req.body.criteria !== "object" && !req.body.criteria) {
        const err = new Error(error_code.CRITERIA_NOT_FOUND.CODE);
        err.statusCode = 0;
        throw err;
      }
    } else {
      if (!Array.isArray(req.body.lables) && req.body.lables.length == 0) {
        const err = new Error(error_code.LABLES_NOT_FOUND.CODE);
        err.statusCode = 0;
        throw err;
      }
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const setParantSettings = {};
    if (req.body.groupType === "non-custom") {
      (setParantSettings.questionId = req.body.quesId),
        (setParantSettings.criteria = req.body.criteria);
    } else {
      setParantSettings.groupLabels = req.body.lables;
    }
    const lastFormID = await Version.findOne({
      formId: req.params.formId,
    }).sort({ updatedAt: -1 });
    const masterId = lastFormID._id;
    console.log(masterId);
    const updateQuestion = await Version.updateOne(
      // { formId: req.params.formId, "questions._id": req.body.parantId },
      { _id: masterId, "questions._id": req.body.parantId },
      {
        $set: {
          updatedAt: Date.now(),
          "questions.$.groupQuestions.parantSettings": setParantSettings,
        },
      }
    );

    if (!updateQuestion) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.contactForm = async (req, res, next) => {
  try {
    let html = `<div class="Table" style="padding-left: 170px">`;
    html += ` <div style="display: table-row; ">`;
    html += ` <div style="display: table-cell;  font-weight: bold; text-align:justify">Email:</div>`;
    html += `<div style="display: table-cell ; text-align:justify ">${req.body.email}</div>`;
    html += `</div>`;
    html += `<div style="display: table-row;">`;
    html += `<div style="display: table-cell; font-weight: bold; text-align:justify">Subject:</div>`;
    html += `<div style="display: table-cell;  text-align:justify ">${req.body.subject}</div>`;
    html += `</div>`;
    html += `<div style="display: table-row;">`;
    html += `<div style="display: table-cell; font-weight: bold;  text-align:justify">Description:</div>`;
    html += ` <div style="display: table-cell; text-align:justify ">${req.body.description}</div>`;
    html += `</div>`;
    html += `<div style="display: table-row;">`;
    html += `<div style="display: table-cell; font-weight: bold;  text-align:justify">Contact Number:</div>`;
    html += `<div style="display: table-cell; text-align:justify">${req.body.contact_number}</div>`;
    html += `</div>`;
    html += `<div style="display: table-row;">`;
    html += `<div style="display: table-cell; font-weight: bold;  text-align:justify">Attached File:</div>`;
    html += `<div style="display: table-cell; text-align:justify">${
      Array.isArray(req.files.uploadingFile) && req.files.uploadingFile.length
        ? req.files.uploadingFile[0].path
        : ""
    }</div>`;
    html += `</div>`;
    html += `</div>`;

    // nodemailer.sendEMail(req.body.email, "New Enquiry", html);
    nodemailer.sendEMail(
      req.body.email,
      "New Enquiry",
      mailContent.mail_content("", html, "New Enquiry")
    );
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    console.error(err);
    next(err);
  }
};

exports.updateQuestionKeywordStatus = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.params.form_id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const dataToUpdate = {
      isShowKeyword: req.body.isShowKeyword,
    };

    const updateOrg = await Form.findByIdAndUpdate(
      req.params.form_id,
      dataToUpdate
    );

    if (!updateOrg) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

//Get Grp Questions
exports.getGroupQuestions = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    // console.log(checkValidUser, "checkValidUser");

    if (!req.query.childQues || req.query.childQues == "") {
      req.query.childQues = [];
    } else {
      req.query.childQues = JSON.parse(req.query.childQues);
    }

    const allQuestions = await Version.aggregate([
      {
        $match: {
          formId: mongoose.Types.ObjectId(req.params.formId),
          isActive: true,
        },
      },
      {
        $project: {
          questions: {
            $filter: {
              input: "$questions",
              as: "questions",
              cond: {
                $and: [
                  { $eq: ["$$questions.isGroupChild", true] },
                  {
                    $in: [
                      "$$questions._id",
                      req.query.childQues.map((child) =>
                        mongoose.Types.ObjectId(child)
                      ),
                    ],
                  },
                ],
              },
            },
          },
        },
      },
      { $sort: { _id: -1, displayOrder: 1 } },
      { $limit: 1 },
    ]);
    // console.log(allQuestions, "allQuestions");

    if (!allQuestions) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    let getAllQuestions = [];
    if (Array.isArray(allQuestions) && allQuestions.length) {
      getAllQuestions = allQuestions[0].questions;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      questions: getAllQuestions,
    });
  } catch (err) {
    next(err);
  }
};

exports.addResponseApiKey = async (req, res, next) => {
  try {
    if (!req.body.formId) {
      const err = new Error("Invalid form id");
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const setNewKey = await new ResponseApiKey({
      name: req.body.name,
      apiKey: req.body.api_key,
      scope: req.body.scope,
      formId: req.body.formId,
      status: "active",
      createdBy: req.sessionUserData.userid,
    }).save();

    if (!setNewKey) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.getResponseApiKey = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const apiKeyData = await ResponseApiKey.find({
      formId: req.params.formId,
      createdBy: req.sessionUserData.userid,
      status: "active",
    });

    if (!apiKeyData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      data: apiKeyData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteApiKey = async (req, res, next) => {
  if (!req.params.formId || req.params.formId == "") {
    const err = new Error(error_code.FORM_NOT_FOUND.CODE);
    err.statusCode = 400;
    throw err;
  }

  const checkValidUser = await Users.findById(req.sessionUserData.userid);

  if (!checkValidUser) {
    const err = new Error(error_code.USER_NOT_FOUND.CODE);
    err.statusCode = 0;
    throw err;
  }

  const isOwnerOrAdmin = checkValidUser.permissions.some(
    (i) => i.type.includes("owner") || i.type.includes("administrator")
  );

  if (!isOwnerOrAdmin) {
    const err = new Error(error_code.NOT_AUTHERIZED.CODE);
    err.statusCode = 0;
    throw err;
  }

  const keyId = await ResponseApiKey.findOne({
    formId: req.params.formId,
    createdBy: req.sessionUserData.userid,
    status: "active",
  });
  //console.log(keyId,req.params.formId,req.sessionUserData.userid);return;
  const deleteApiKey = await ResponseApiKey.updateOne(
    { formId: req.params.formId, _id: keyId._id },
    { $set: { status: "inactive" } }
  );

  if (!deleteApiKey) {
    const err = new Error(error_code.UNKNOWN_ERROR.CODE);
    err.statusCode = 0;
    throw err;
  }

  res.status(200).json({
    status: 1,
    error_code: error_code.NONE.CODE,
  });
};
const rearrangeAllData = (data) => {
  // console.log(data.parentResurveyId,"datadatadatadata");
  return {
    submitted_by: data.submittedBy.userId.name,
    submitted_by_phone: data.submittedBy.userId.mobile,
    response_id: data._id,
    // synced:'Aug 19, 2022 12:22 PM',
    submitted: data.submittedAt,
    time_spent: data.timeSpent,
    revision_submitted_in: data.formRevision[0].submittedIn,
    revision_created_in: data.formRevision[0].createdIn,
    tag: data.tag,
    response_note: data.responseNote,
    submitted_through: data.submittedBy.deviceData.androidVersion
      ? "android"
      : "iOS",
    appVersion: data.submittedBy.deviceData.appVersion,
    answers: data.responses,
    flaggedOn: data.flaggedOn,
    responseParantId: data.parentResurveyId,
  };
};
exports.getAllResponseByFormId = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const allResponses = await Response.find({
      formId: req.params.formId,
      status: "active",
    })
      .populate([
        {
          path: "formId",
          select: "title formStatus questions rules versionNumber publishedAt",
        },
        {
          path: "submittedBy.userId",
          select: "name mobile countryCode email category",
        },
        { path: "organizationId", select: "name logo created_at updated_at" },
      ])
      .sort({ submittedAt: -1 });

    const totalResponse = await Response.countDocuments({
      formId: req.params.formId,
      status: "active",
    });
    const firstResponseDate = await Response.find({
      formId: req.params.formId,
      status: "active",
    })
      .sort({ submittedAt: 1 })
      .limit(1);
    const allSubmittedUsersId = await Response.find({
      formId: req.params.formId,
      status: "active",
    }).distinct("submittedBy.userId");
    const submittedUsersDetails = await Users.find(
      { _id: { $in: allSubmittedUsersId } },
      "name mobile countryCode email category"
    );
    if (!allResponses) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const allResponsesData = allResponses.map((data) => rearrangeAllData(data));

    res.status(200).json({
      data: allResponsesData,
      total: totalResponse,
      filterData: {
        firstResponseDate: firstResponseDate[0]?.submittedAt,
        allResponseSubmittedUsers: submittedUsersDetails,
      },
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};

exports.clearFormMob = async (req, res, next) => {
  try {
    if (!req.params.userId || req.params.userId == 0) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const userData = await Users.findById(req.params.userId);
    const formIdArray = userData.permissions.map(
      (permission) => permission.formId
    );

    //console.log(formIdArray);return;

    const updatedPermission = await Users.update(
      { _id: mongoose.Types.ObjectId(req.params.userId) },
      {
        $pull: {
          permissions: {
            formId: formIdArray,
            type: "member",
          },
        },
      },
      { multi: true }
    );

    if (!updatedPermission) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};
exports.copyQuestion = async (req, res, next) => {
  // console.log(req.body, "FROM FRONTEND")
  try {
    const {
      formId,
      sourceIndex,
      destinationIndex,
      versionNumber,
      position,
      isGroupQuestion,
      questionIndex,
      masterId,
      parentQuesId,
    } = req.body;
    if (position == "") {
      const err = new Error(error_code.COPY_POSITION_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!destinationIndex) {
      const err = new Error(error_code.COPY_QUES_TYPE.CODE);
      err.statusCode = 0;
      throw err;
    }
    // return console.log("did'nt worked")
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);

      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );
    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);

      err.statusCode = 0;

      throw err;
    }
    if (isGroupQuestion) {
      // ? copy child question
      const newPosition =
        position === "after" ? +destinationIndex + 1 : +destinationIndex;

      const form = await Version.find({
        // formId: formId,
        // versionNumber: versionNumber,
        _id: masterId,
      });

      if (!form) {
        const err = new Error(error_code.FORM_NOT_FOUND.CODE);
        err.statusCode = 400;
        throw err;
      }

      const allQuestion = form[0].questions;
      const question = form[0].questions.filter(
        (question) => question._id == parentQuesId
      );
      const parentQuestionIndex = form[0].questions.findIndex(
        (question) => question._id == parentQuesId
      );
      console.log(
        allQuestion.length,
        question,
        parentQuestionIndex,
        "main ques",
        newPosition
      );

      if (!question) {
        const err = new Error("Question not found");
        err.statusCode = 400;
        throw err;
      }
      const childQuestions = question[0].groupQuestions.childQuestions;
      console.log(childQuestions, "INitial", allQuestion.length, newPosition);
      let questionToMove = childQuestions[sourceIndex];
      let _id = new mongoose.Types.ObjectId();
      childQuestions.splice(+newPosition, 0, _id);
      question[0].groupQuestions.childQuestions = childQuestions;
      console.log(questionToMove, childQuestions, "AFTER COPY");

      let newChildQuesArrToPush = [];
      childQuestions.forEach((childQues) => {
        allQuestion.forEach((question) => {
          if (question._id.equals(childQues)) {
            // console.log(question, "NEW ARRAY OF CHILD")
            newChildQuesArrToPush.push(question);
            allQuestion.splice(
              allQuestion.findIndex((ques) => ques.equals(childQues)),
              1
            );
          }
        });
      });

      let finalChildQues = {
        ...newChildQuesArrToPush[+sourceIndex]._doc,
        title: `${newChildQuesArrToPush[+sourceIndex]._doc.title}_copy`,
        _id: childQuestions[+newPosition],
      };

      newChildQuesArrToPush.splice(+newPosition, 0, finalChildQues);

      console.log(
        newChildQuesArrToPush[sourceIndex],
        childQuestions[newPosition],
        allQuestion.length,
        "FINAL",
        finalChildQues,
        "THIS ARRAY",
        newChildQuesArrToPush
      );

      let finalAllQuesArr = [...allQuestion, ...newChildQuesArrToPush];
      // return console.log(finalAllQuesArr.length)
      await Version.findOneAndUpdate(
        { _id: masterId },
        {
          $set: { questions: finalAllQuesArr },
          $currentDate: { updatedAt: true },
        }
      );

      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        message: "Child question moved successfully",
        data: childQuestions,
      });
    } else {
      // ? copy main question
      let newIndex;
      if (position === "after") {
        newIndex = +destinationIndex + 1;
      } else {
        newIndex = +destinationIndex === 0 ? 0 : +destinationIndex;
      }

      const form = await Version.find({
        // formId: formId,
        // versionNumber: versionNumber,
        _id: masterId,
      });

      if (!form) {
        const err = new Error(error_code.FORM_NOT_FOUND.CODE);
        err.statusCode = 400;
        throw err;
      }

      const questions = form[0].questions;
      const questionToCopy = questions[sourceIndex];
      console.log(questionToCopy); //return
      console.log(questionToCopy.title);
      // questionToCopy.title += "_copy";
      // return console.log(questionToCopy);
      const { _id, ...rest } = questionToCopy?._doc;
      const newQuestionToCopy = {
        ...rest,
        title: `${questionToCopy.title}_copy`,
      };
      // return
      console.log(newQuestionToCopy);

      questions.splice(newIndex, 0, newQuestionToCopy);

      await Version.updateOne(
        // { formId: formId, versionNumber: versionNumber },
        { _id: masterId },
        {
          $set: { questions: questions },
        }
      );

      res.status(200).json({
        status: 1,

        error_code: error_code.NONE.CODE,

        message: "Question copied successfully",

        data: questions,
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.moveQuestion = async (req, res, next) => {
  // return console.log(req.body, "from frontend")
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const {
      formId,
      sourceIndex,
      destinationIndex,
      versionNumber,
      position,
      isGroupQuestion,
      questionIndex,
      masterId,
      parentQuesId,
    } = req.body;

    if (position == "") {
      const err = new Error(error_code.MOVE_POSITION_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!destinationIndex) {
      const err = new Error(error_code.MOVE_QUES_TYPE.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (isGroupQuestion) {
      // ? move child question
      let newIndex;
      if (position === "after") {
        newIndex = +destinationIndex + 1;
        if (+sourceIndex < +destinationIndex) {
          console.log(+sourceIndex < +destinationIndex, "NEW CONDITION");
          newIndex = +destinationIndex;
        }
      } else {
        newIndex = destinationIndex;
      }
      const form = await Version.findOne({
        // formId: formId,
        // versionNumber: versionNumber,
        _id: masterId,
      });

      if (!form) {
        const err = new Error(error_code.FORM_NOT_FOUND.CODE);
        err.statusCode = 400;
        throw err;
      }
      const allQuestion = form.questions;
      const question = form.questions.filter(
        (question) => question._id == parentQuesId
      );
      const parentQuestionIndex = form.questions.findIndex(
        (question) => question._id == parentQuesId
      );
      console.log(
        question[0].groupQuestions.childQuestions,
        req.body,
        "main ques"
      );
      // return;

      if (!question) {
        const err = new Error("Question not found");
        err.statusCode = 400;
        throw err;
      }

      const childQuestions = question[0].groupQuestions.childQuestions;
      console.log(childQuestions, "INitial", allQuestion.length);
      let questionToMove = childQuestions.splice(sourceIndex, 1)[0];
      childQuestions.splice(+newIndex, 0, questionToMove);
      question[0].groupQuestions.childQuestions = childQuestions;
      console.log(
        allQuestion[parentQuestionIndex],
        "CHECKING",
        parentQuestionIndex
      );
      // allQuestion.splice(parentQuestionIndex, 1, question)
      let newChildQuesArrToPush = [];
      childQuestions.forEach((childQues) => {
        form.questions.forEach((question) => {
          if (question._id.equals(childQues)) {
            console.log(question, "NEW ARRAY OF CHILD");
            newChildQuesArrToPush.push(question);
          }
        });
      });

      childQuestions.forEach((childQues) => {
        if (allQuestion.findIndex((ques) => ques.equals(childQues)) !== -1) {
          // console.log(childQues, "ID REUTRN", allQuestion.findIndex(ques => ques.equals(childQues)))
          allQuestion.splice(
            allQuestion.findIndex((ques) => ques.equals(childQues)),
            1
          );
        }
      });
      // form.questions.forEach((question) => {
      //   if(childQuestions.indexOf(question._id) !== -1){
      //     console.log(question, "QUESTION OF FORM")
      //   }
      // })
      // console.log(form.questions, "FORM");
      let finalAllQuesArr = [...allQuestion, ...newChildQuesArrToPush];
      // return console.log(childQuestions, "ques array", questionToMove, parentQuestionIndex, allQuestion.length, finalAllQuesArr.length, question[0].groupQuestions.childQuestions, finalAllQuesArr[parentQuestionIndex])

      // if (
      //   sourceIndex < 0 ||
      //   sourceIndex >= childQuestions.length ||
      //   destinationIndex < 0 ||
      //   destinationIndex >= childQuestions.length
      // ) {
      //   const err = new Error("Invalid source or destination index");
      //   err.statusCode = 400;
      //   throw err;
      // }

      // const childQuestion = childQuestions.splice(sourceIndex, 1)[0];

      // if (!childQuestion) {
      //   const err = new Error("Child question not found");
      //   err.statusCode = 400;
      //   throw err;
      // }

      // const newPosition =
      //   position === "after" ? destinationIndex + 1 : destinationIndex;
      // childQuestions.splice(newPosition, 0, childQuestion);

      await Version.findOneAndUpdate(
        { _id: masterId },
        {
          $set: { questions: finalAllQuesArr },
          $currentDate: { updatedAt: true },
        }
      );

      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        message: "Child question moved successfully",
        data: childQuestions,
      });
    } else {
      // ? move main question
      let newIndex;
      if (position === "after") {
        newIndex = +destinationIndex + 1;
      } else {
        newIndex = destinationIndex;
      }
      const form = await Version.find({
        // formId: formId,
        // versionNumber: versionNumber,
        _id: masterId,
      });

      if (!form) {
        const err = new Error(error_code.FORM_NOT_FOUND.CODE);

        err.statusCode = 400;

        throw err;
      }

      console.log(form, req.body, "FORM DATA");
      let questions = form[0]?.questions.filter(
        (question) => !question.isGroupChild
      );
      let grpQuestions = form[0]?.questions.filter(
        (question) => question.isGroupChild
      );
      console.log("source ques", questions[req.body.sourceIndex]);
      console.log("dest ques", questions[req.body.destinationIndex]);
      let questionToMove = questions[req.body.sourceIndex];
      console.log(questionToMove, "MOVE THIS");
      const { _id, ...rest } = questionToMove?._doc;
      console.log(rest, questionToMove._id, "MOVE THIS");
      questions.splice(+newIndex, 0, rest);
      let removeId = questions
        .map((elem) => elem._id)
        .indexOf(questionToMove._id);
      questions.splice(+removeId, 1);
      console.log(questions.length, "ques array", req.body, newIndex, removeId);
      let newQuesArr = [...questions, ...grpQuestions];
      console.log(newQuesArr.length, "Final length");
      // return
      await Version.updateOne(
        // { formId: formId, versionNumber: versionNumber },
        { _id: masterId },
        {
          $set: { questions: newQuesArr },
        }
      );

      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        message: "Question moved successfully",
        data: newQuesArr,
      });
    }
  } catch (error) {
    next(error);
  }
};

exports.upRule = async (req, res, next) => {
  const checkValidUser = await Users.findById(req.sessionUserData.userid);

  if (!checkValidUser) {
    const err = new Error(error_code.USER_NOT_FOUND.CODE);
    err.statusCode = 0;
    throw err;
  }

  const isOwnerOrAdmin = checkValidUser.permissions.some(
    (i) => i.type.includes("owner") || i.type.includes("administrator")
  );

  if (!isOwnerOrAdmin) {
    const err = new Error(error_code.NOT_AUTHERIZED.CODE);
    err.statusCode = 0;
    throw err;
  }

  if (!req.body.formId || req.body.formId == "") {
    const err = new Error(error_code.FORM_NOT_FOUND.CODE);
    err.statusCode = 400;
    throw err;
  }

  const isFormExists = await Form.countDocuments({ _id: req.body.formId });

  if (!isFormExists) {
    const err = new Error(error_code.FORM_NOT_FOUND.CODE);
    err.statusCode = 0;
    throw err;
  }

  let { conditions, operator, questions, ruleId, formId, versionNumber } =
    req.body;
  const verId = await Version.find({ formId: formId });
  if (verId.length > 0) {
    for (let i = 0; i < conditions.length; i++) {
      conditions[i].questionId = mongoose.Types.ObjectId(
        conditions[i].questionId
      );
    }
    for (let i = 0; i < questions.length; i++) {
      questions[i] = mongoose.Types.ObjectId(questions[i]);
    }
    // console.log(conditions, operator, questions, ruleId, formId, "<===data");
    let a = await Version.updateOne(
      { formId: formId, versionNumber: versionNumber },
      {
        $set: {
          "rules.$[rule].operator": operator,
          "rules.$[rule].conditions": conditions,
          "rules.$[rule].questions": questions,
        },
      },
      {
        arrayFilters: [{ "rule._id": mongoose.Types.ObjectId(ruleId) }],
      }
    );

    res.status(200).json({ message: "Data updated Succesfully" });
  } else {
    res.status(400).json({ data: a, message: "Data Not Found" });
  }
};

// ------------------
exports.dashboard = async (req, res) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    const id = checkValidUser.id;
    // console.log(id, "id");
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const check = req.params.orgId;
    // console.log(check, "check");
    const formCount = await Form.countDocuments({
      updatedBy: id,
      organizationId: check,
    });
    // console.log(formCount, "formCount"); // correct
    // const allResponses1 = await Response.countDocuments({ organizationId: check });
    // console.log(allResponses1,"allResponses1");return
    const allResponses = await Response.find({ organizationId: check });
    let totalResponseArray = 0;
    if (allResponses) {
      for (const response of allResponses) {
        totalResponseArray += response.responses.length;
      }
    }
    // console.log(totalResponseArray, "totalResponseArray");

    let findObj = {
      "permissions.type": "member",
      "permissions.orgId": req.params.orgId,
    };

    const getAudience = await Users.find(findObj, {
      permissions: 0,
    });

    const total = await Users.countDocuments(findObj);
    // console.log(total, "total");

    // Counting audience in the last 30 days
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() - 30);
    const audienceLast30Days = await Users.countDocuments({
      ...findObj,

      updatedAt: { $gte: thirtyDays },
      status: "active",
    });
    // Counting audience in the current month
    const currentDate = new Date();
    const firstDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const lastDayOfMonth = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );
    const audienceCurrentMonth = await Users.countDocuments({
      ...findObj,
      updatedAt: { $gte: firstDayOfMonth, $lte: lastDayOfMonth },
      status: "active",
    });

    // console.log(audienceCurrentMonth, "audienceCurrentMonth");

    // console.log(audienceLast30Days, "audienceLast30Days");
    res.json({
      status: 200,
      success: true,
      FormCount: formCount,
      TotalResponseArray: totalResponseArray,
      TotalDevice: total,
      audienceLast30Days: audienceLast30Days,
      audienceCurrentMonth: audienceCurrentMonth,
    });
  } catch (error) {
    console.log(error);
  }
};

// -----------------share form-----------------------

exports.shareForm = async (req, res) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const emailList = req.body.email;
    const formId = req.body.formId;
    const mobileList = req.body.mobile;
    const note = req.body.note;
    if (!emailList && !mobileList) {
      return res.status(400).json({ message: "Please enter email or mobile" });
    }
    const links = [];
    const tokens = [];
    if (emailList) {
      const invalidEmails = emailList.filter(
        (email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      );
      if (invalidEmails.length > 0) {
        return res.status(400).json({ message: "Invalid email " });
      }
      for (const email of emailList) {
        const find = await Users.find({ email });
        if (find.length > 0) {
          const userid = find[0]._id;
          const tokenData = {
            formId,
            email,
            is_new_user: 0,
            userid,
            find,
          };
          const token = generateTokenForForm(tokenData);
          tokens.push(token);

          const link = `${config.shareFormUrl}/form/${encodeURIComponent(
            token
          )}`;
          links.push(link);
          nodemailer.sendEmailLink(link, email, note);
        } else {
          const setNewUser = new Users({
            name: "Guest User",
            email: email,
          });
          const saveUser = await setNewUser.save();
          const userid = saveUser._id;
          const tokenData = {
            formId,
            email,
            is_new_user: 1,
            userid,
            saveUser,
          };
          const token = generateTokenForForm(tokenData);
          tokens.push(token);
          const link = `${config.shareFormUrl}/form/${encodeURIComponent(
            token
          )}`;
          links.push(link);
          nodemailer.sendEmailLink(link, email, note);
        }
      }
    }
    if (mobileList) {
      const invalidMobiles = mobileList.filter(
        (mobile) => !/^[0-9]{10}$/.test(mobile)
      );

      if (invalidMobiles.length > 0) {
        return res.status(400).json({ message: "Invalid mobile number" });
      }
      for (const mobile of mobileList) {
        const user = await Users.find({ mobile });
        if (user.length > 0) {
          const entry = `${mobile}@yopmail.com`;
          const tokenData = {
            formId,
            entry,
            is_new_user: 0,

            userid: user[0]._id,
            user,
          };
          const token = generateTokenForForm(tokenData);
          tokens.push(token);
          const link = `${config.shareFormUrl}/form/${encodeURIComponent(
            token
          )}`;
          links.push(link);
          // console.log(`Token for ${entry}:${token}`);
          nodemailer.sendEmailLink(link, entry, note);
        } else {
          const setNewUser = new Users({
            name: "Guest User",
            mobile: mobile,
            countryCode: "91",
          });
          const saveUser = await setNewUser.save();
          const userid = saveUser._id;
          // console.log("New user created:", saveUser);
          // console.log("New user ID:", userid);
          const entry = `${mobile}@yopmail.com`;
          const tokenData = {
            formId,
            entry,
            is_new_user: 1,

            userid,
            saveUser,
          };
          const token = generateTokenForForm(tokenData);
          tokens.push(token);

          const link = `${config.shareFormUrl}/form/${encodeURIComponent(
            token
          )}`;
          links.push(link);
          // console.log(`Token for ${entry}:${token}`);
          nodemailer.sendEmailLink(link, entry, note);
        }
      }
    }

    res.json({
      status: 200,
      success: true,
      message: "Form has been shared",
      token: tokens,
      link: links,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "An error occurred" });
  }
};
exports.shareFormCopyLink = async (req, res) => {
  try {
    const formId = req.body.formId;

    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const shortenUrl = async (longUrl) => {
      try {
        const response = await axios.post('http://tinyurl.com/api-create.php?url=' + longUrl);
        return response.data;
      } catch (error) {
        console.error('TinyURL shortening error:', error);
        return longUrl;
      }
    };
    const setNewUser = new Users({
      name: "Guest User",
    });
    const saveUser = await setNewUser.save();
    const userid = saveUser._id;
    const tokenData = {
      formId,
      userid,
      is_new_user: 1,
      is_copy: 1,
    };
    const token = generateTokenForForm(tokenData);
    const originalLink = `${config.shareFormUrl}/form/${encodeURIComponent(token)}`;
    const link = await shortenUrl(originalLink);
    res.json({
      status: 200,
      success: true,
      copyLink: link,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "An error occurred" });
  }
};

exports.verifyShareToken = async (req, res) => {
  try {
    const token = req.params.token;

    jwt.verify(token, config.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: "Unauthorized token",
        });
      }
      const formId = decodedToken.formId;
      const email = decodedToken.email;
      const mobile = decodedToken.entry;
      const user = decodedToken.user;
      const userid = decodedToken.userid;
      const newUser = decodedToken.is_new_user;
      const find = await Form.findOne({ _id: formId });
      const title = find.title;

      const questions = await Form.find({
        _id: formId,
        isActive: true,
        questions: {
          $elemMatch: {
            isGroupChild: false,
          },
        },
      })
        .select("questions rules")
        .sort({ createdAt: -1 });

      if (!questions) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }

      let formDataNew = [];
      if (questions[0]?.questions) {
        formDataNew = questions[0]?.questions.filter((obj) => {
          if (obj.isGroupChild == false) {
            return obj;
          }
        });
      } else {
        const err = new Error(error_code.NO_DATA.CODE);
        err.statusCode = 0;
        throw err;
      }

      const childQues = req.query.childQues || []; // Default to an empty array if not defined

      const allQuestions = await Version.aggregate([
        {
          $match: {
            formId: mongoose.Types.ObjectId(formId),
            isActive: true,
          },
        },
        {
          $project: {
            questions: {
              $filter: {
                input: "$questions",
                as: "questions",
                cond: {
                  $and: [
                    { $eq: ["$$questions.isGroupChild", true] },
                    {
                      $in: [
                        "$$questions._id",
                        childQues.map((child) =>
                          mongoose.Types.ObjectId(child)
                        ),
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
        { $sort: { _id: -1, displayOrder: 1 } },
        { $limit: 1 },
      ]);
      if (!allQuestions) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }

      let getAllQuestions = [];
      if (Array.isArray(allQuestions) && allQuestions.length) {
        getAllQuestions = allQuestions[0].questions;
      }

      return res.json({
        status: 200,
        success: true,
        formId: formId,
        email: email,
        userid: userid,
        FormName: title,
        mobile: mobile,
        user: user,
        is_new_user: newUser,
        questions: formDataNew,
        rules: questions[0]?.rules,
        getAllQuestions: getAllQuestions,
      });
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: 500,
      success: false,
      message: "Internal server error",
    });
  }
};

// -----------------------------generating token For Share form-------------------------------------------

const generateTokenForForm = (data) => {
  const tokenReqInfo = {
    secretKey: (JWT_SECRET = config.JWT_SECRET),
  };
  const token = jwt.sign(data, tokenReqInfo.secretKey, {
    expiresIn: "365d",
  });

  return token;
};
// -----------------------------generating token For Share form-------------------------------------------

// ======================monitoring Question=================================

exports.getAllFormForMonitoring = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    let findObj = {
      organizationId: checkValidUser.permissions[0].organizationId,
      formStatus: 'live'
    };
    let limit = 0;
    let page = 0;
    if (req.query.page && req.query.page > 0) {
      page = req.query.page * req.query.limit;
    }
    if (req.query.limit && req.query.limit > 0) {
      limit = req.query.limit;
    }
    findObj.isActive = true;
    const allVersionList = await Form.find(findObj)
    .limit(limit)
    .skip(page)
    .lean();
    const totalForms = await Form.countDocuments(findObj);    
    res.status(200).json({
      forms: allVersionList,
      status: 1,
      total: totalForms,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllQuestionsForMonitoring = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );
    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const allQuestions = await Version.aggregate([
      {
        $match: {
          formId: mongoose.Types.ObjectId(req.params.formId),
          isActive: true,
        },
      },
      {
        $project: {
          _id: 1,
          questions: {
            $filter: {
              input: "$questions",
              as: "questions",
              cond: {
                $and: [
                  {
                    $or: [
                      {
                        $regexMatch: {
                          input: "$$questions.title",
                          regex: new RegExp(req.query.s),
                        },
                      },
                      {
                        $regexMatch: {
                          input: "$$questions.keyword",
                          regex: new RegExp(req.query.s),
                        },
                      },
                    ],
                  },
                  {
                    $eq: ["$$questions.isGroupChild", false],
                  },
                ],
              },
            },
          },
        },
      },
      { $sort: { _id: -1, displayOrder: 1 } },
      { $limit: 1 },
    ]);

    if (!allQuestions) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    let getAllQuestions = [];
    let questionNumber = 0;
    if (Array.isArray(allQuestions) && allQuestions.length) {
      getAllQuestions = allQuestions[0].questions;
      getAllQuestions = getAllQuestions.map((question) => {
        questionNumber++;
        return { ...question, questionNumber };
      });
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      questions: getAllQuestions,
      last: allQuestions[0]._id,
    });
  } catch (err) {
    next(err);
  }
};
exports.addAttributesForMonitoring = async(req,res)=>{
  try{
const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );
    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.questionIdd || req.body.questionIdd == "") {
      const err = new Error(error_code.QUESTION_ID_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    const attributesFormMonitoring = {
      formId: req.body.newFormId,
      attribute: req.body.attribute
    }; 
   
    const verId = await Version.findOne({
      formId:req.body.formId,
      isActive:true
    }).sort({_id:-1}).limit(1)
    
    const question = verId.questions.find(q => q._id.equals(req.body.questionIdd));
   
    question.attributes = attributesFormMonitoring;
    const result = await verId.save();

    const modifyForm = await Form.findByIdAndUpdate(req.body.formId, {
      updatedAt: Date.now(),
    });
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      message: "updated successfully",
      message: result,
    });
  } catch (error){
    console.log(error);
  }
}
exports.getAllAttributes = async (req, res) => {
  try {
    const formId = req.params.formId;
    const questionId = req.params.questionId;

    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );
    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const verId = await Version.findOne({
      formId: formId,
      isActive: true
    }).sort({ _id: -1 }).limit(1)
    // console.log(verId)
    const question = verId.questions.find((q) => q._id.equals(req.params.questionId));
    const data = question.attributes;
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      message: "Attributes retrieved successfully",
      attributes: data,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getAllAttributesForMobile = async (req, res) => {
  try {
    const formId = req.params.formId;
    const questionId = req.params.questionId;

    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const attributes = await Form
      .findOne({
        _id: req.params.formId,
        isActive: true,
      })
      .sort({ _id: -1 })
      .limit(1);
    const question = attributes.questions.find((q) => q._id.equals(req.params.questionId));
    const data = question.attributes;
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      message: "Attributes retrieved successfully",
      attributes: data,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.deleteAttribute = async (req, res) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );
    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.params.formId || req.params.formId === '' || !req.params.questionId || req.params.questionId === '' || !req.params.attributeId) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const verId = await version.findOne({
      formId: req.params.formId,
      isActive: true,
    }).sort({ _id: -1 }).limit(1);

    if (!verId) {
      res.json({
        status: 404,
        success: false,
        message: 'Form not found',
      });
      return;
    }
    const question = verId.questions.find((q) => q._id.equals(req.params.questionId));
    if (!question) {
      return res.status(404).json({
        status: 0,
        error_code: 'QUESTION_NOT_FOUND',
        message: 'No question found with the specified questionId.',
      });
    }
    const attributeObjectId = mongoose.Types.ObjectId(req.params.attributeId);
    let attributeIndex = -1;
    for (const questionAttribute of question.attributes) {
      const foundIndex = questionAttribute.attribute.findIndex(
        (attr) => attr._id.equals(attributeObjectId)
      );
      if (foundIndex !== -1) {
        attributeIndex = foundIndex;
        break;
      }
    }
    if (attributeIndex === -1) {
      return res.status(404).json({
        status: 0,
        error_code: 'ATTRIBUTE_NOT_FOUND',
        message: 'No attribute found with the specified attributeId.',
      });
    }
    question.attributes.forEach((questionAttribute) => {
      const foundIndex = questionAttribute.attribute.findIndex(
        (attr) => attr._id.equals(attributeObjectId)
      );
      if (foundIndex !== -1) {
        questionAttribute.attribute.splice(foundIndex, 1);
      }
    });
    await verId.save();
    res.status(200).json({
      status: 1,
      error_code: 'NONE',
      message: 'Attribute deleted successfully',
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      success: false,
      message: 'Internal Server Error',
    });
  }
};

exports.searchAttribute = async (req,res)=>{
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
  

    if (!req.params.formId || req.params.formId === '' || !req.params.questionId || req.params.questionId === '') {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    const verId = await version.findOne({
      formId: req.params.formId,
      isActive: true,
    }).sort({ _id: -1 }).limit(1);

    if (!verId) {
      res.json({
        status: 404,
        success: false,
        message: 'Form not found',
      });
      return;
    }
    const question = verId.questions.find((q) => q._id.equals(req.params.questionId));
    if (!question) {
      return res.status(404).json({
        status: 0,
        error_code: 'QUESTION_NOT_FOUND',
        message: 'No question found with the specified questionId.',
      });
    }
    const filteredAttributes = question.attributes[0].attribute.filter((attr) => {
      const searchTerm = req.params.key.toLowerCase(); 
      const questionName = attr.questionName.toLowerCase();
      const questionText = attr.questionText.toLowerCase();
      return questionName.includes(searchTerm) &&
             questionText.includes(searchTerm) &&
             attr.checkboxStatus === true;
    });
      if(filteredAttributes.length>0){
        res.json({
          status:200,
          success:true,
          filteredAttributes
        })
      }
      else{
        res.json({
          status:200,
          message:"no result found"
        })
      }
     
  } catch (error) {
    console.log(error);
  }
}

// ======================monitoring Question=================================