const fs = require("fs");
const path = require("path");
const error_code = require("../config/error-code");
const AdmZip = require("adm-zip");
const jwt = require("jsonwebtoken");
const JWT_SECRET = require("../config/config");
const Form = require("../models/form");
const Response = require("../models/response");
const UploadFile = require("../models/file_upload");
const Users = require("../models/users");
const DownloadedResponse = require("../models/downloaded_response");
const mongoose = require("mongoose");
const { generateTokenForForm } = require("../controllers/form");
const audioAuditSchema = require("../models/audioAudit");
const { version } = require("os");
const { versions, config } = require("process");
const Versions = require("../models/version");
const userDetails = require("../models/userDetails");
const response = require("../models/response");
// var redis = require("redis");
// var JWTR = require("jwt-redis").default;
// var redisClient = redis.createClient();
// var jwtr = new JWTR(redisClient);

//################################ Mobile Response APIs ################################//

exports.uploadFile = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    let uploadingFile;
    if (
      Array.isArray(req.files.uploadingFile) &&
      req.files.uploadingFile.length > 0
    ) {
      uploadingFile = req.files.uploadingFile[0];
      delete uploadingFile.fieldname;
      delete uploadingFile.encoding;
      delete uploadingFile.destination;
      delete uploadingFile.filename;
      delete uploadingFile.originalname;
      delete uploadingFile.size;
    } else {
      const err = new Error(error_code.FILE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    // const dataToSave = {
    //   questionId: req.body.questionId,
    //   fileData: uploadingFile,
    //   createdBy: req.sessionUserData.userid,
    //   updatedBy: req.sessionUserData.userid,
    // };

    // const saveUploadData = await new UploadFile(dataToSave).save();

    // if (!saveUploadData) {
    //   const err = new Error(error_code.UNKNOWN_ERROR.CODE);
    //   err.statusCode = 0;
    //   throw err;
    // }

    const uploadedFileData = {
      mimetype: uploadingFile.mimetype,
      path: uploadingFile.path.replaceAll("\\", "/"),
    };

    res.status(200).json({
      file_data: uploadedFileData,
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};


exports.addResponse = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.formId) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const formData = await Form.findById(req.body.formId);
    if (!formData) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const total_minutes = new Date().getTimezoneOffset() / -1;
    const hours = total_minutes / 60;
    const totalHour =
      ("" + hours).split(".")[0].length === 2
        ? ("" + hours).split(".")[0]
        : ("0" + hours).split(".")[0];
    const minutes = total_minutes % 60;
    const finalOffset = `GMT${
      Math.sign(+totalHour) === 1 ? "+" : "-"
    }${Math.abs(totalHour)}:${Math.abs(minutes)}`;
    req.body.timeZone = {};
    req.body.timeZone["offset"] = finalOffset;
    req.body.timeZone["name"] = new Date()
      .toLocaleDateString("en-US", {
        day: "2-digit",
        timeZoneName: "long",
      })
      .slice(4);

    req.body.formRevision = [{}];
    req.body.formRevision[0]["createdIn"] = "v" + req.body.versionNumber;
    req.body.formRevision[0]["submittedIn"] = "v" + req.body.versionNumber;
    req.body.formRevision[0]["lastModifiedIn"] = "v" + req.body.versionNumber;
    req.body.submittedBy = {};
    req.body.submittedBy["userId"] = req.sessionUserData.userid;
    const deviceData = getDataFromHeader(checkValidUser.deviceData, req);
    req.body.submittedBy["deviceData"] = deviceData;
    req.body.organizationId = formData.organizationId;
    if (req.body.responses?.length > 0) {
      req.body.responses.forEach((element) => {
        const questionData = formData.questions.find(
          (obj) => String(obj._id) === element.questionId
        );
        if (
          !questionData ||
          questionData.questionType !== element.questionType
        ) {
          const err = new Error(error_code.QUESTION_ID_TYPE_NOT_MATCH.CODE);
          err.statusCode = 0;
          throw err;
        }
        element.createdBy = req.sessionUserData.userid;
        element.isParent = [
          "grp_no_repeat",
          "grp_number",
          "grp_choice",
          "grp_custom",
        ].includes(element.questionType)
          ? false
          : true;
      });
    }

    const saveFormResponses = await new Response(req.body).save();
    if (!saveFormResponses) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};

exports.addResponseForShareFormOriginal = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    const token = req.query.token;
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.formId) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    jwt.verify(token, JWT_SECRET.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: "Unauthorized token",
        });
      }
      const is_copy = decodedToken.is_copy;
      const userid = decodedToken.userid;
      // console.log(userid); return
      if (is_copy) {
        const findVersionNumber = await Versions.find({
          formId: req.body.formId,
        })
          .sort({ versionNumber: -1 })
          .limit(1);
        const lastVersion = findVersionNumber[0];
        const versionNumber = lastVersion.versionNumber;
        const formData = await Form.findById(req.body.formId);
        console.log(formData, "<<<formData ");
        if (!formData) {
          const err = new Error(error_code.FORM_NOT_FOUND.CODE);
          err.statusCode = 0;
          throw err;
        }
        const total_minutes = new Date().getTimezoneOffset() / -1;
        const hours = total_minutes / 60;
        const totalHour =
          ("" + hours).split(".")[0].length === 2
            ? ("" + hours).split(".")[0]
            : ("0" + hours).split(".")[0];
        const minutes = total_minutes % 60;
        const finalOffset = `GMT${
          Math.sign(+totalHour) === 1 ? "+" : "-"
        }${Math.abs(totalHour)}:${Math.abs(minutes)}`;
        req.body.timeZone = {};
        req.body.timeZone["offset"] = finalOffset;
        req.body.timeZone["name"] = new Date()
          .toLocaleDateString("en-US", {
            day: "2-digit",
            timeZoneName: "long",
          })
          .slice(4);

        req.body.formRevision = [{}];
        req.body.formRevision[0]["createdIn"] = "v" + versionNumber;
        req.body.formRevision[0]["submittedIn"] = "v" + versionNumber;
        req.body.formRevision[0]["lastModifiedIn"] = "v" + versionNumber;
        req.body.submittedBy = {};
        req.body.submittedBy["userId"] = req.sessionUserData.userid;
        req.body.organizationId = formData.organizationId;
        if (req.body.responses?.length > 0) {
          req.body.responses.forEach((element) => {
            const questionData = formData.questions.find(
              (obj) => String(obj._id) === element.questionId
            );
            if (
              !questionData ||
              questionData.questionType !== element.questionType
            ) {
              const err = new Error(error_code.QUESTION_ID_TYPE_NOT_MATCH.CODE);
              err.statusCode = 0;
              throw err;
            }
            element.createdBy = req.sessionUserData.userid;
            element.isParent = [
              "grp_no_repeat",
              "grp_number",
              "grp_choice",
              "grp_custom",
            ].includes(element.questionType)
              ? false
              : true;
          });
        }
        const saveFormResponses = await new Response(req.body).save();
        const responseId = saveFormResponses._id;
        if (!saveFormResponses) {
          const err = new Error(error_code.UNKNOWN_ERROR.CODE);
          err.statusCode = 0;
          throw err;
        }
        const newUser = new userDetails({
          userId: userid,

          responseId: responseId,
          name: req.body.name ? req.body.name : "null",
          email: req.body.email ? req.body.email : "null",
          email: req.body.mobile ? req.body.mobile : 0,
          countryCode: req.body.countryCode ? req.body.countryCode : 91,
        });
        const saveData = await newUser.save();
        return res.json({
          status: 1,
          success: true,
        });
        res.json({
          status: 1,
          success: true,
        });
      } else {
        const userWithToken = await userDetails.findOne({ token: token });

        if (userWithToken) {
          return res.json({
            status: 0,
            success: false,
            message: "You have submitted response already.",
          });
        }

        const findVersionNumber = await Versions.find({
          formId: req.body.formId,
        })
          .sort({ versionNumber: -1 })
          .limit(1);
        const lastVersion = findVersionNumber[0];
        const versionNumber = lastVersion.versionNumber;
        const formData = await Form.findById(req.body.formId);
        if (!formData) {
          const err = new Error(error_code.FORM_NOT_FOUND.CODE);
          err.statusCode = 0;
          throw err;
        }
        const total_minutes = new Date().getTimezoneOffset() / -1;
        const hours = total_minutes / 60;
        const totalHour =
          ("" + hours).split(".")[0].length === 2
            ? ("" + hours).split(".")[0]
            : ("0" + hours).split(".")[0];
        const minutes = total_minutes % 60;
        const finalOffset = `GMT${
          Math.sign(+totalHour) === 1 ? "+" : "-"
        }${Math.abs(totalHour)}:${Math.abs(minutes)}`;
        req.body.timeZone = {};
        req.body.timeZone["offset"] = finalOffset;
        req.body.timeZone["name"] = new Date()
          .toLocaleDateString("en-US", {
            day: "2-digit",
            timeZoneName: "long",
          })
          .slice(4);

        req.body.formRevision = [{}];
        req.body.formRevision[0]["createdIn"] = "v" + versionNumber;
        req.body.formRevision[0]["submittedIn"] = "v" + versionNumber;
        req.body.formRevision[0]["lastModifiedIn"] = "v" + versionNumber;
        req.body.submittedBy = {};
        req.body.submittedBy["userId"] = req.sessionUserData.userid;
        req.body.organizationId = formData.organizationId;
        if (req.body.responses?.length > 0) {
          req.body.responses.forEach((element) => {
            const questionData = formData.questions.find(
              (obj) => String(obj._id) === element.questionId
            );
            if (
              !questionData ||
              questionData.questionType !== element.questionType
            ) {
              const err = new Error(error_code.QUESTION_ID_TYPE_NOT_MATCH.CODE);
              err.statusCode = 0;
              throw err;
            }
            element.createdBy = req.sessionUserData.userid;
            element.isParent = [
              "grp_no_repeat",
              "grp_number",
              "grp_choice",
              "grp_custom",
            ].includes(element.questionType)
              ? false
              : true;
          });
        }
        const saveFormResponses = await new Response(req.body).save();
        // console.log(saveFormResponses,"saveFormResponses")
        const responseId = saveFormResponses._id;
        // console.log(responseId);

        if (!saveFormResponses) {
          const err = new Error(error_code.UNKNOWN_ERROR.CODE);
          err.statusCode = 0;
          throw err;
        }
        const newUser = new userDetails({
          userId: userid,
          responseId: responseId,
          token: token,
          name: req.body.name ? req.body.name : "guest user",
          email: req.body.email ? req.body.email : "null",
          mobile: req.body.mobile ? req.body.mobile : 0,
          countryCode: req.body.countryCode ? req.body.countryCode : 91,
        });

        const savedUser = await newUser.save();
        return res.json({
          status: 1,
          success: true,
          savedUser: savedUser,
        });
      }
    });
  } catch (e) {
    next(e);
  }
};
exports.addResponseForShareForm = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    const token = req.query.token;
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.formId) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    jwt.verify(token, JWT_SECRET.JWT_SECRET, async (err, decodedToken) => {
      if (err) {
        return res.status(400).json({
          status: 400,
          success: false,
          message: "Unauthorized token",
        });
      }
      const is_copy = decodedToken.is_copy;
      const userid = decodedToken.userid;
      // console.log(userid); return
      if (is_copy) {
        const findVersionNumber = await Versions.find({
          formId: req.body.formId,
        })
          .sort({ versionNumber: -1 })
          .limit(1);
        const lastVersion = findVersionNumber[0];
        const versionNumber = lastVersion.versionNumber;
        const formData = await Form.findById(req.body.formId);
        console.log(formData, "<<<formData ");
        if (!formData) {
          const err = new Error(error_code.FORM_NOT_FOUND.CODE);
          err.statusCode = 0;
          throw err;
        }
        const total_minutes = new Date().getTimezoneOffset() / -1;
        const hours = total_minutes / 60;
        const totalHour =
          ("" + hours).split(".")[0].length === 2
            ? ("" + hours).split(".")[0]
            : ("0" + hours).split(".")[0];
        const minutes = total_minutes % 60;
        const finalOffset = `GMT${
          Math.sign(+totalHour) === 1 ? "+" : "-"
        }${Math.abs(totalHour)}:${Math.abs(minutes)}`;
        req.body.timeZone = {};
        req.body.timeZone["offset"] = finalOffset;
        req.body.timeZone["name"] = new Date()
          .toLocaleDateString("en-US", {
            day: "2-digit",
            timeZoneName: "long",
          })
          .slice(4);

        req.body.formRevision = [{}];
        req.body.formRevision[0]["createdIn"] = "v" + versionNumber;
        req.body.formRevision[0]["submittedIn"] = "v" + versionNumber;
        req.body.formRevision[0]["lastModifiedIn"] = "v" + versionNumber;
        req.body.submittedBy = {};
        req.body.submittedBy["userId"] = req.sessionUserData.userid;
        req.body.organizationId = formData.organizationId;
        req.body.name = req.body.name || "null";
        req.body.email = req.body.email || "null";
        req.body.mobile = req.body.mobile || "0";

        if (req.body.responses?.length > 0) {
          req.body.responses.forEach((element) => {
            const questionData = formData.questions.find(
              (obj) => String(obj._id) === element.questionId
            );
            if (
              !questionData ||
              questionData.questionType !== element.questionType
            ) {
              const err = new Error(error_code.QUESTION_ID_TYPE_NOT_MATCH.CODE);
              err.statusCode = 0;
              throw err;
            }
            element.createdBy = req.sessionUserData.userid;
            element.isParent = [
              "grp_no_repeat",
              "grp_number",
              "grp_choice",
              "grp_custom",
            ].includes(element.questionType)
              ? false
              : true;
          });
        }
        const saveFormResponses = await new Response(req.body).save();
        const responseId = saveFormResponses._id;
        if (!saveFormResponses) {
          const err = new Error(error_code.UNKNOWN_ERROR.CODE);
          err.statusCode = 0;
          throw err;
        }
        const newUser = new userDetails({
          userId: userid,

          responseId: responseId,
          name: req.body.name ? req.body.name : "null",
          email: req.body.email ? req.body.email : "null",
          mobile: req.body.mobile ? req.body.mobile : 0,
          countryCode: req.body.countryCode ? req.body.countryCode : 91,
        });
        const saveData = await newUser.save();
        return res.json({
          status: 1,
          success: true,
          userData: saveData, 
          response: saveFormResponses
        });
        res.json({
          status: 1,
          success: true,
        });
      } else {
        const userWithToken = await userDetails.findOne({ token: token });

        if (userWithToken) {
          return res.json({
            status: 0,
            success: false,
            message: "You have submitted response already.",
          });
        }

        const findVersionNumber = await Versions.find({
          formId: req.body.formId,
        })
          .sort({ versionNumber: -1 })
          .limit(1);
        const lastVersion = findVersionNumber[0];
        const versionNumber = lastVersion.versionNumber;
        const formData = await Form.findById(req.body.formId);
        if (!formData) {
          const err = new Error(error_code.FORM_NOT_FOUND.CODE);
          err.statusCode = 0;
          throw err;
        }
        const total_minutes = new Date().getTimezoneOffset() / -1;
        const hours = total_minutes / 60;
        const totalHour =
          ("" + hours).split(".")[0].length === 2
            ? ("" + hours).split(".")[0]
            : ("0" + hours).split(".")[0];
        const minutes = total_minutes % 60;
        const finalOffset = `GMT${
          Math.sign(+totalHour) === 1 ? "+" : "-"
        }${Math.abs(totalHour)}:${Math.abs(minutes)}`;
        req.body.timeZone = {};
        req.body.timeZone["offset"] = finalOffset;
        req.body.timeZone["name"] = new Date()
          .toLocaleDateString("en-US", {
            day: "2-digit",
            timeZoneName: "long",
          })
          .slice(4);

        req.body.formRevision = [{}];
        req.body.formRevision[0]["createdIn"] = "v" + versionNumber;
        req.body.formRevision[0]["submittedIn"] = "v" + versionNumber;
        req.body.formRevision[0]["lastModifiedIn"] = "v" + versionNumber;
        req.body.submittedBy = {};
        req.body.submittedBy["userId"] = req.sessionUserData.userid;
        req.body.organizationId = formData.organizationId;
        req.body.name = req.body.name ;
        req.body.email = req.body.email ;
        req.body.mobile = req.body.mobile ;
        if (req.body.responses?.length > 0) {
          req.body.responses.forEach((element) => {
            const questionData = formData.questions.find(
              (obj) => String(obj._id) === element.questionId
            );
            if (
              !questionData ||
              questionData.questionType !== element.questionType
            ) {
              const err = new Error(error_code.QUESTION_ID_TYPE_NOT_MATCH.CODE);
              err.statusCode = 0;
              throw err;
            }
            element.createdBy = req.sessionUserData.userid;
            element.isParent = [
              "grp_no_repeat",
              "grp_number",
              "grp_choice",
              "grp_custom",
            ].includes(element.questionType)
              ? false
              : true;
          });
        }
        console.log(req.body);
        const saveFormResponses = await new Response(req.body).save();
        // console.log(saveFormResponses,"saveFormResponses")
        const responseId = saveFormResponses._id;
        // console.log(responseId);

        if (!saveFormResponses) {
          const err = new Error(error_code.UNKNOWN_ERROR.CODE);
          err.statusCode = 0;
          throw err;
        }
        const newUser = new userDetails({
          userId: userid,
          responseId: saveFormResponses._id,
          token: token,
          name: req.body.name ,
          email: req.body.email ,
          mobile: req.body.mobile ,
          countryCode: req.body.countryCode ,
        });

        const savedUser = await newUser.save();
        return res.json({
          status: 1,
          success: true,
          savedUser: savedUser,
        });
      }
    });
  } catch (e) {
    next(e);
  }
};
// ------------------------------------

//################################ Admin Response APIs ################################//

exports.updateResponseTag = async (req, res, next) => {
  try {
    if (!req.params.responseId || req.params.responseId == "") {
      const err = new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.params.parentResponseId || req.params.parentResponseId == "") {
      const err = new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.tag) {
      const err = new Error(error_code.TAG_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (req.body.tag == "rejected") {
      //MainResurvey
      const checkResponse = await Response.findById(
        req.params.parentResponseId
      ).select("tag parentResurveyId");
      updateTagValue = await Response.findByIdAndUpdate(
        req.params.responseId,
        {
          tag: req.body.tag,
          revisionStatus: "online",
          updatedOn: Date.now(),
          flaggedOn: Date.now(),
        },
        { runValidators: true }
      );

      //ParentResurvey
      if (checkResponse.tag == "resurveyed") {
      } else {
        updateParentTagValue = await Response.findByIdAndUpdate(
          req.params.parentResponseId,
          {
            tag: "flagged",
            revisionStatus: "flagged",
            //"responses.isFlagged" : false,
            updatedOn: Date.now(),
            flaggedOn: Date.now(),
          },
          { runValidators: true }
        );
      }
    } else {
      //FindResurvey Id
      const getParentResurveyId = await Response.find({
        parentResurveyId: req.params.parentResponseId,
      }).select("parentResurveyId");
      let submittedByArr = [];
      if (getParentResurveyId.length > 0) {
        for (let i = 0; i < getParentResurveyId.length; i++) {
          const element = getParentResurveyId[i];
          submittedByArr = await Response.findByIdAndUpdate(
            element._id,
            {
              tag: "rejected",
              revisionStatus: "online",
              updatedOn: Date.now(),
            },
            { runValidators: true }
          );
        }
      }
      //MainResurvey
      updateTagValue = await Response.findByIdAndUpdate(
        req.params.responseId,
        {
          tag: req.body.tag,
          revisionStatus: "online",
          updatedOn: Date.now(),
        },
        { runValidators: true }
      );
      //ParentResurvey
      updateParentTagValue = await Response.findByIdAndUpdate(
        req.params.parentResponseId,
        {
          tag: "resurveyed",
          revisionStatus: "online",
          //"responses.isFlagged" : false,
          updatedOn: Date.now(),
        },
        { runValidators: true }
      );
    }

    if (!updateTagValue) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};

exports.acceptRejectedResurvey = async (req, res, next) => {
  try {
    if (!req.params.responseId || req.params.responseId == "") {
      const err = new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.params.parentResponseId || req.params.parentResponseId == "") {
      const err = new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.tag) {
      const err = new Error(error_code.TAG_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (req.body.tag == "verified") {
      //FindResurvey Id
      const getParentResurveyId = await Response.find({
        parentResurveyId: req.params.parentResponseId,
      }).select("parentResurveyId");
      let submittedByArr = [];
      if (getParentResurveyId.length > 0) {
        for (let i = 0; i < getParentResurveyId.length; i++) {
          const element = getParentResurveyId[i];
          submittedByArr = await Response.findByIdAndUpdate(
            element._id,
            {
              tag: "rejected",
              revisionStatus: "online",
              updatedOn: Date.now(),
            },
            { runValidators: true }
          );
        }
      }
      //console.log(getParentResurveyId,"getParentResurveyId");
      //MainResurvey
      updateTagValue = await Response.findByIdAndUpdate(
        req.params.responseId,
        {
          tag: req.body.tag,
          revisionStatus: "online",
          updatedOn: Date.now(),
        },
        { runValidators: true }
      );
      //ParentResurvey
      updateParentTagValue = await Response.findByIdAndUpdate(
        req.params.parentResponseId,
        {
          tag: "resurveyed",
          revisionStatus: "online",
          updatedOn: Date.now(),
        },
        { runValidators: true }
      );
    }

    if (!updateTagValue) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!updateParentTagValue) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};

exports.updateResurveyTag = async (req, res, next) => {
  try {
    if (!req.params.responseId || req.params.responseId == "") {
      const err = new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.tag) {
      const err = new Error(error_code.TAG_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const responseData = await Response.findById(req.params.responseId).select(
      "tag parentResurveyId"
    );
    //console.log(responseData,"responseData");return;
    if (responseData.tag == "rejected") {
      const rejectedParId = await Response.find({
        parentResurveyId: responseData.parentResurveyId,
      }).select("_id");
      // console.log(rejectedParId[0]._id,mongoose.Types.ObjectId(req.params.responseId));
      // console.log(rejectedParId[1]._id,mongoose.Types.ObjectId(req.params.responseId));return;
      if (
        rejectedParId[0]._id == mongoose.Types.ObjectId(req.params.responseId)
      ) {
        const updateRejectTag = await Response.updateOne(
          {
            _id: mongoose.Types.ObjectId(req.params.responseId),
          },
          {
            tag: "verified",
            updatedOn: Date.now(),
          }
        );
      } else {
        updateRejectTag = await Response.updateOne(
          {
            _id: rejectedParId[0]._id,
          },
          {
            tag: "rejected",
            updatedOn: Date.now(),
          }
        );
      }
      if (
        rejectedParId[1]?._id == mongoose.Types.ObjectId(req.params.responseId)
      ) {
        updateRejectTag = await Response.updateOne(
          {
            _id: mongoose.Types.ObjectId(req.params.responseId),
          },
          {
            tag: "verified",
            updatedOn: Date.now(),
          }
        );
      }
    }
    const updateTagValue = await Response.findByIdAndUpdate(
      req.params.responseId,
      {
        tag: req.body.tag,
        revisionStatus: "online",
        updatedOn: Date.now(),
      },
      { runValidators: true }
    );

    //Check Is Parent Flagged Condition
    const checkIsParentResurvey = await Response.find({
      parentResurveyId: req.params.responseId,
    }).select("_id");
    if (checkIsParentResurvey.length > 0) {
      if (checkIsParentResurvey[0]?._id) {
        const updateValue = await Response.findByIdAndUpdate(
          checkIsParentResurvey[0]._id,
          {
            tag: "rejected",
            revisionStatus: "online",
            updatedOn: Date.now(),
          },
          { runValidators: true }
        );
      }
      if (checkIsParentResurvey[1]?._id) {
        const updateValue = await Response.findByIdAndUpdate(
          checkIsParentResurvey[1]._id,
          {
            tag: "rejected",
            revisionStatus: "online",
            updatedOn: Date.now(),
          },
          { runValidators: true }
        );
      }
    }
    if (!updateTagValue) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};

exports.getAllResponsesByFormIdOriginal = async (req, res, next) => {
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

    let limit = 0;

    let pageNo = 0;

    if (req.query.limit && req.query.limit > 0) {
      limit = req.query.limit;
    }

    if (req.query.page && req.query.page > 0) {
      pageNo = req.query.page * limit;
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
      .sort({ submittedAt: -1 })
      .limit(limit)
      .skip(pageNo);
      
    const allResponsesWithoutLimit = await Response.find({
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
    if (!allResponsesWithoutLimit) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isResponseFromDatabase = totalResponse > 0 ? true : false;
    const allResponsesData = allResponses.map((data) => rearrangeAllData(data));
    const allResponsesDataWithoutLimit = allResponsesWithoutLimit.map((data) =>
      rearrangeAllData(data)
    );
    res.status(200).json({
      isResponseFromDatabase: isResponseFromDatabase,
      data: allResponsesData,
      total: totalResponse,
      allData: allResponsesDataWithoutLimit,
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

exports.getAllResponsesByFormId = async (req, res, next) => {
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

    const allData = await Response.find({
      formId: req.params.formId,
      status: "active",
    })
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

    const isResponseFromDatabase = totalResponse > 0;
    const allResponsesData = allResponses.map((data) => rearrangeAllData(data));

    res.status(200).json({
      isResponseFromDatabase: isResponseFromDatabase,
      data: allResponsesData,
      total: totalResponse,
      filterData: {
        firstResponseDate: firstResponseDate[0]?.submittedAt,
        allResponseSubmittedUsers: submittedUsersDetails,
      },
      allData: allData, 
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};



// 
exports.getAllGroupResponsesByFormId = async (req, res, next) => {
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
    let limit=0
    let pageNo=0
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
      .sort({ submittedAt: -1 })
      .limit(limit)
      .skip(pageNo);
    const allResponsesData = allResponses.map((data) => rearrangeAllDataForGroup(data));
    res.status(200).json({
      data: allResponsesData,
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};


// 


exports.getResponseById = async (req, res, next) => {
  try {
    if (!req.params.responseId) {
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

    const responseData = await Response.find({
      _id: req.params.responseId,
      status: "active",
    }).populate([
      {
        path: "formId",
        select:
          "title formStatus questions rules versionNumber publishedAt settings",
      },
      {
        path: "submittedBy.userId",
        select: "name mobile countryCode email category",
      },
      { path: "organizationId", select: "name logo created_at updated_at" },
    ]);

    //const responseData = await Response.findById(req.params.responseId);
    if (!responseData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      data: responseData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.getMobileResponseById = async (req, res, next) => {
  try {
    if (!req.params.responseId) {
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

    const responseData = await Response.findById(req.params.responseId);

    //const responseData = await Response.findById(req.params.responseId);
    if (!responseData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      data: responseData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};
exports.updateFlagsQuestionResponse = async (req, res, next) => {
  try {
    if (!req.params.responseId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    //console.log(req.body);
    promiseArr = [];
    if (
      Array.isArray(req.body.question_id) &&
      req.body.question_id.length > 0
    ) {
      Promise.all(
        req.body.question_id.map(
          (questionId) =>
            new Promise(async (resolve, reject) => {
              const checkResponseExist = await Response.countDocuments({
                "responses.questionId": questionId.quesId,
                _id: req.params.responseId,
              });
              //console.log(checkResponseExist,"checkResponseExist");
              if (checkResponseExist > 0) {
                updateResponseFlag = await Response.updateOne(
                  {
                    "responses.questionId": questionId.quesId,
                    _id: req.params.responseId,
                  },
                  {
                    "responses.$.isFlagged": questionId.isFlagged,
                    tag: "flagged",
                    revisionStatus: "flagged",
                    flaggedOn: Date.now(),
                    updatedOn: Date.now(),
                  }
                );
              } else {
                if (questionId.isFlagged == true) {
                  let obj = {
                    answer: {},
                    status: "active",
                    questionId: questionId.quesId,
                    createdBy: req.sessionUserData.userid,
                    questionType: questionId.quesType,
                    isFlagged: questionId.isFlagged,
                    isParent: true,
                    createdOnDeviceAt: Date.now(),
                    lastModifiedOnDeviceAt: Date.now(),
                  };
                  updateResponseFlag = await Response.updateOne(
                    {
                      _id: req.params.responseId,
                    },
                    {
                      $push: {
                        responses: obj,
                      },
                    }
                  );
                } else {
                  updateResponseFlag = "";
                }
              }
              resolve(updateResponseFlag);
            })
        )
      )
        .then((allResolveArr) => {
          res.status(200).json({
            status: 1,
            error_code: 0,
          });
        })
        .catch((err) => {
          console.log(err, "Promise");
          throw err;
        });
    } else {
      console.log("No question selected");
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.getResponseFormCount = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
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
    const flaggedCount = await Response.countDocuments({
      tag: "flagged",
      revisionStatus: "flagged",
      formId: req.params.formId,
      "submittedBy.userId": mongoose.Types.ObjectId(req.sessionUserData.userid),
    });
    const onlineCount = await Response.countDocuments({
      revisionStatus: "online",
      formId: req.params.formId,
      "submittedBy.userId": mongoose.Types.ObjectId(req.sessionUserData.userid),
      tag: { $ne: "flagged" },
    });
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      onlineCount: onlineCount ? onlineCount : 0,
      flaggedCount: flaggedCount ? flaggedCount : 0,
    });
  } catch (err) {
    next(err);
  }
};

exports.getResponseAnswerCount = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    let count = 0;
    let allResponseList = [];
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    if (!req.params.status || req.params.status == "") {
      const err = new Error(error_code.STATUS_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (req.params.status == "flagged") {
      allResponseList = await Response.aggregate([
        {
          $match: {
            formId: mongoose.Types.ObjectId(req.params.formId),
            revisionStatus: req.params.status,
            "submittedBy.userId": mongoose.Types.ObjectId(
              req.sessionUserData.userid
            ),
          },
        },
        {
          $project: {
            _id: 1,
            formId: 1,
            isResurveyResponse: 1,
            versionNumber: 1,
            formRevision: 1,
            responseNote: 1,
            revisionStatus: 1,
            questionCount: {
              $size: {
                $filter: {
                  input: "$responses",
                  as: "flaggedQuestions",
                  cond: {
                    $eq: ["$$flaggedQuestions.isFlagged", true],
                  },
                },
              },
            },
            flaggedOn: 1,
            submittedAt: 1,
          },
        },
      ]).sort({ submittedAt: -1 });
    } else {
      allResponseList = await Response.aggregate([
        {
          $match: {
            formId: mongoose.Types.ObjectId(req.params.formId),
            revisionStatus: req.params.status,
            "submittedBy.userId": mongoose.Types.ObjectId(
              req.sessionUserData.userid
            ),
          },
        },
        {
          $project: {
            _id: 1,
            formId: 1,
            isResurveyResponse: 1,
            versionNumber: 1,
            formRevision: 1,
            responseNote: 1,
            revisionStatus: 1,
            tag: 1,
            questionCount: {
              $size: "$responses",
            },
            submittedAt: 1,
          },
        },
      ]).sort({ submittedAt: -1 });
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      totalCount: allResponseList.length,
      data: allResponseList,
    });
  } catch (err) {
    next(err);
  }
};
exports.getQuestionFlaggedCount = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.params.status || req.params.status == "") {
      const err = new Error(error_code.STATUS_NOT_FOUND.CODE);
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
      revisionStatus: req.params.status,
      status: "active",
      //"responses.isFlagged": true
    })
      .populate([])
      .sort({ submittedAt: -1 });
    const onlineCount = await Response.countDocuments({
      formId: req.params.formId,
      revisionStatus: "online",
    });
    if (!allResponses) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const allResponsesData = allResponses.map((data) => {
      return {
        response_id: data._id,
        submitted: data.submittedAt,
        tag: data.tag,
        response_note: data.responseNote,
        flagged_count: data.responses.isFlagged,
        // answers: data.responses
      };
    });

    res.status(200).json({
      data: allResponsesData,
      status: 1,
      onlineCount: onlineCount,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};

exports.addFlaggedResponse = async (req, res, next) => {
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

    if (!req.body.formId) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.responseId) {
      const err = new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const formData = await Form.findById(req.body.formId);
    if (!formData) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const updateTagValue = await Response.findByIdAndUpdate(
      req.body.responseId,
      {
        revisionStatus: "online",
        updatedOn: Date.now(),
      },
      { runValidators: true }
    );

    const total_minutes = new Date().getTimezoneOffset() / -1;
    const hours = total_minutes / 60;
    const totalHour =
      ("" + hours).split(".")[0].length === 2
        ? ("" + hours).split(".")[0]
        : ("0" + hours).split(".")[0];
    const minutes = total_minutes % 60;
    const finalOffset = `GMT${
      Math.sign(+totalHour) === 1 ? "+" : "-"
    }${Math.abs(totalHour)}:${Math.abs(minutes)}`;
    req.body.timeZone = {};
    req.body.timeZone["offset"] = finalOffset;
    req.body.timeZone["name"] = new Date()
      .toLocaleDateString("en-US", {
        day: "2-digit",
        timeZoneName: "long",
      })
      .slice(4);
    req.body.formRevision = [{}];
    req.body.formRevision[0]["createdIn"] = "v1";
    req.body.formRevision[0]["submittedIn"] = "v1";
    req.body.formRevision[0]["lastModifiedIn"] = "v1";
    req.body.submittedBy = {};
    req.body.submittedBy["userId"] = req.sessionUserData.userid;
    const deviceData = getDataFromHeader(checkValidUser.deviceData, req);
    req.body.submittedBy["deviceData"] = deviceData;
    req.body.organizationId = formData.organizationId;
    //req.body.revisionId = req.body.responseId;
    req.body.parentResurveyId = req.body.responseId;
    req.body.tag = "pending";
    req.body.isResurveyResponse = "yes";
    if (req.body.responses?.length > 0) {
      req.body.responses.forEach((element) => {
        const questionData = formData.questions.find(
          (obj) => String(obj._id) === element.questionId
        );
        if (
          !questionData ||
          questionData.questionType !== element.questionType
        ) {
          const err = new Error(error_code.QUESTION_ID_TYPE_NOT_MATCH.CODE);
          err.statusCode = 0;
          throw err;
        }
        element.createdBy = req.sessionUserData.userid;
        element.isParent = [
          "grp_no_repeat",
          "grp_number",
          "grp_choice",
          "grp_custom",
        ].includes(element.questionType)
          ? false
          : true;
      });
    }

    const saveFormResponses = await new Response(req.body).save();
    if (!saveFormResponses) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};

exports.getPendingCompareResponse = async (req, res, next) => {
  try {
    if (!req.params.responseId) {
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

    // const revisionData = await Response.findById(
    //   {responseId:req.params.responseId,"responses.isFlagged": true}).select('responses');

    const originalResponseData = await Response.findById({
      _id: req.params.responseId,
      "responses.isFlagged": true,
      status: "active",
    })
      .populate([
        {
          path: "formId",
          select:
            "title formStatus questions rules versionNumber publishedAt settings",
        },
        {
          path: "submittedBy.userId",
          select: "name mobile countryCode email category",
        },
        { path: "organizationId", select: "name logo created_at updated_at" },
      ])
      .sort({ submittedAt: -1 });
    if (!originalResponseData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    const resurveyResponseData = await Response.find({
      parentResurveyId: req.params.responseId,
      //"responses.isFlagged": true,
    }).sort({ submittedAt: -1 });
    if (!resurveyResponseData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      data: originalResponseData,
      resurveyData: resurveyResponseData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllResurveyData = async (req, res, next) => {
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

    const resurveyData = await Response.find({
      formId: req.params.formId,
      //isResurveyResponse: "no",
      status: "active",
      $or: [
        {
          tag: "resurveyed",
        },
        {
          tag: "flagged",
        },
        {
          tag: "rejected",
        },
        // {
        //   "tag": "verified"
        // }
      ],
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

    if (!resurveyData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    let allResurveyData = resurveyData.map((data) => rearrangeAllData(data));

    res.status(200).json({
      status: 1,
      data: allResurveyData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.checkParentResponseId = async (req, res, next) => {
  try {
    if (!req.params.responseId) {
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

    const parentData = await Response.find({
      parentResurveyId: req.params.responseId,
    });

    if (!parentData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      data: parentData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.getGroupResponses = async (req, res, next) => {
  try {
    if (!req.params.resId || req.params.resId == "") {
      const err = new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.params.groupId || req.params.groupId == "") {
      const err = new Error(error_code.GROUP_ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    // const groupResponses = await Response.find({_id: req.params.resId}, {responses: {$elemMatch: {isParent: true, groupId: req.params.groupId}}});
    const groupResponses = await Response.aggregate([
      { $match: { _id: mongoose.Types.ObjectId(req.params.resId) } },
      {
        $project: {
          responses: {
            $filter: {
              input: "$responses",
              as: "responses",
              cond: {
                $and: [
                  { $eq: ["$$responses.isParent", true] },
                  {
                    $eq: [
                      "$$responses.groupId",
                      mongoose.Types.ObjectId(req.params.groupId),
                    ],
                  },
                ],
              },
            },
          },
          formId: true,
          versionNumber: true,
          tag: true,
          submittedBy: true,
          organizationId: true,
          responseNote: true,
          submittedAt: true,
          responseParantId: true,
          createdOn: true,
          updatedOn: true,
          flaggedOn: true,
        },
      },
    ]);
    await Response.populate(groupResponses, { path: "submittedBy.userId" });
    if (!groupResponses) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      data: groupResponses[0],
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllTableData = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.query.fromDate || req.query.fromDate == "") {
      const err = new Error(error_code.FROM_DATE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.query.toDate || req.query.toDate == "") {
      const err = new Error(error_code.TO_DATE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const andConditions = [];
    if (req.query.fromDate !== req.query.toDate)
      andConditions.push({
        submittedAt: {
          $gte: req.query.fromDate,
          $lte: req.query.toDate,
        },
      });

    req.query.submittedBy =
      req.query.submittedBy === "" ? [] : req.query.submittedBy.split(",");
    req.query.tag = req.query.tag === "" ? [] : req.query.tag.split(",");
    req.query.responseId =
      req.query.responseId === "" ? [] : req.query.responseId.split(",");

    if (
      Array.isArray(req.query.submittedBy) &&
      req.query.submittedBy.length > 0
    ) {
      const submittedByArr = [];
      for (let i = 0; i < req.query.submittedBy.length; i++) {
        submittedByArr.push({
          "submittedBy.userId": req.query.submittedBy[i],
        });
      }
      andConditions.push({
        $or: submittedByArr,
      });
    }

    if (Array.isArray(req.query.tag) && req.query.tag.length > 0) {
      const tagArr = [];
      for (let i = 0; i < req.query.tag.length; i++) {
        tagArr.push({
          tag: req.query.tag[i],
        });
      }
      andConditions.push({
        $or: tagArr,
      });
    }

    if (
      Array.isArray(req.query.responseId) &&
      req.query.responseId.length > 0
    ) {
      const responseIdArr = [];
      for (let i = 0; i < req.query.responseId.length; i++) {
        responseIdArr.push({
          _id: req.query.responseId[i],
        });
      }
      andConditions.push({
        $or: responseIdArr,
      });
    }

    let limit = 0;
    let pageNo = 0;

    if (req.query.limit && req.query.limit > 0) {
      limit = req.query.limit;
    }
    if (req.query.page && req.query.page > 0) {
      pageNo = req.query.page * limit;
    }

    const finalFilter = { formId: req.params.formId, status: "active" };
    if (andConditions.length) finalFilter["$and"] = andConditions;

    const responseData = await Response.find(finalFilter)
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
      .sort({ submittedAt: -1 })
      .limit(limit)
      .skip(pageNo);
    const allResponsesWithoutLimit = await Response.find(finalFilter)
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
    const totalResponseData = await Response.countDocuments(finalFilter);

    if (!responseData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!allResponsesWithoutLimit) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const allResponsesData = responseData.map((data) => rearrangeAllData(data));
    const allResponsesDataWithoutLimit = allResponsesWithoutLimit.map((data) =>
      rearrangeAllData(data)
    );

    res.status(200).json({
      status: 1,
      data: allResponsesData,
      total: totalResponseData,
      allData: allResponsesDataWithoutLimit,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllMapPoints = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.query.fromDate || req.query.fromDate == "") {
      const err = new Error(error_code.FROM_DATE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.query.toDate || req.query.toDate == "") {
      const err = new Error(error_code.TO_DATE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const andConditions = [];
    if (req.query.fromDate !== req.query.toDate)
      andConditions.push({
        submittedAt: {
          $gte: req.query.fromDate,
          $lte: req.query.toDate,
        },
      });

    andConditions.push({
      $or: [
        {
          "responses.questionType": "location",
        },
        {
          "responses.questionType": "image_geo_tag",
        },
        // ----------------------
        {
          "responses.questionType": "multiple_image_geo_tag",
        },
        // ----------------------
      ],
    });

    req.query.submittedBy =
      req.query.submittedBy === "" ? [] : req.query.submittedBy.split(",");
    req.query.tag = req.query.tag === "" ? [] : req.query.tag.split(",");
    req.query.responseId =
      req.query.responseId === "" ? [] : req.query.responseId.split(",");

    if (
      Array.isArray(req.query.submittedBy) &&
      req.query.submittedBy.length > 0
    ) {
      const submittedByArr = [];
      for (let i = 0; i < req.query.submittedBy.length; i++) {
        submittedByArr.push({
          "submittedBy.userId": req.query.submittedBy[i],
        });
      }
      andConditions.push({
        $or: submittedByArr,
      });
    }

    if (Array.isArray(req.query.tag) && req.query.tag.length > 0) {
      const tagArr = [];
      for (let i = 0; i < req.query.tag.length; i++) {
        tagArr.push({
          tag: req.query.tag[i],
        });
      }
      andConditions.push({
        $or: tagArr,
      });
    }

    if (
      Array.isArray(req.query.responseId) &&
      req.query.responseId.length > 0
    ) {
      const responseIdArr = [];
      for (let i = 0; i < req.query.responseId.length; i++) {
        responseIdArr.push({
          _id: req.query.responseId[i],
        });
      }
      andConditions.push({
        $or: responseIdArr,
      });
    }

    const responseData = await Response.find({
      formId: req.params.formId,
      status: "active",
      $and: andConditions,
    }).populate([
      {
        path: "formId",
        select: "title formStatus questions rules versionNumber publishedAt",
      },
      {
        path: "submittedBy.userId",
        select: "name mobile countryCode email category",
      },
      { path: "organizationId", select: "name logo created_at updated_at" },
    ]);

    if (!responseData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const allResponsesData = responseData.map((data) => rearrangeAllData(data));

    res.status(200).json({
      status: 1,
      data: allResponsesData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.getAllMedias = async (req, res, next) => {
  try {
    if (!req.params.formId || req.params.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.query.fromDate || req.query.fromDate == "") {
      const err = new Error(error_code.FROM_DATE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.query.toDate || req.query.toDate == "") {
      const err = new Error(error_code.TO_DATE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const andConditions = [];
    if (req.query.fromDate !== req.query.toDate)
      andConditions.push({
        submittedAt: {
          $gte: req.query.fromDate,
          $lte: req.query.toDate,
        },
      });

    andConditions.push({
      $or: [
        {
          "responses.questionType": "signature",
        },
        {
          "responses.questionType": "image_geo_tag",
        },
        {
          "responses.questionType": "image",
        },
        {
          "responses.questionType": "audio",
        },
        {
          "responses.questionType": "video",
        },
      ],
    });

    req.query.submittedBy =
      req.query.submittedBy === "" ? [] : req.query.submittedBy.split(",");
    req.query.tag = req.query.tag === "" ? [] : req.query.tag.split(",");
    req.query.responseId =
      req.query.responseId === "" ? [] : req.query.responseId.split(",");

    if (
      Array.isArray(req.query.submittedBy) &&
      req.query.submittedBy.length > 0
    ) {
      const submittedByArr = [];
      for (let i = 0; i < req.query.submittedBy.length; i++) {
        submittedByArr.push({
          "submittedBy.userId": req.query.submittedBy[i],
        });
      }
      andConditions.push({
        $or: submittedByArr,
      });
    }

    if (Array.isArray(req.query.tag) && req.query.tag.length > 0) {
      const tagArr = [];
      for (let i = 0; i < req.query.tag.length; i++) {
        tagArr.push({
          tag: req.query.tag[i],
        });
      }
      andConditions.push({
        $or: tagArr,
      });
    }

    if (
      Array.isArray(req.query.responseId) &&
      req.query.responseId.length > 0
    ) {
      const responseIdArr = [];
      for (let i = 0; i < req.query.responseId.length; i++) {
        responseIdArr.push({
          _id: req.query.responseId[i],
        });
      }
      andConditions.push({
        $or: responseIdArr,
      });
    }

    const responseData = await Response.find({
      formId: req.params.formId,
      status: "active",
      $and: andConditions,
    }).populate([
      {
        path: "formId",
        select: "title formStatus questions rules versionNumber publishedAt",
      },
      {
        path: "submittedBy.userId",
        select: "name mobile countryCode email category",
      },
      { path: "organizationId", select: "name logo created_at updated_at" },
    ]);

    if (!responseData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const allResponsesData = responseData.map((data) => rearrangeAllData(data));

    res.status(200).json({
      status: 1,
      data: allResponsesData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.mediaToArraybuffer = async (req, res, next) => {
  try {
    // console.log(req.body.allMediaLinks);
    if (
      !Array.isArray(req.body.allMediaLinks) &&
      req.body.allMediaLinks.length === 0
    ) {
      const err = new Error(error_code.MEDIA_URL_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const mediaArr = req.body.allMediaLinks;
    Promise.all(
      mediaArr.map(
        (mediaStr) =>
          new Promise((resolve, reject) => {
            const filePath = path.join(__dirname, "..", mediaStr);
            const bitmap = fs.readFileSync(filePath, "base64");
            resolve({ transformedMedia: bitmap, mediaUrl: mediaStr });
          })
      )
    )
      .then((resultData) => {
        res.status(200).json({
          status: 1,
          data: resultData,
        });
      })
      .catch((err) => {
        console.error(err);
        const error = new Error("Unable to transform");
        error.statusCode = 0;
        throw error;
      });
  } catch (err) {
    next(err);
  }
};

exports.addDownloadedResponse = async (req, res, next) => {
  // console.log(req.body, "download body");
  try {
    if (!req.body.formId || req.body.formId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.fromDate || req.body.fromDate == "") {
      const err = new Error(error_code.FROM_DATE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.toDate || req.body.toDate == "") {
      const err = new Error(error_code.TO_DATE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.responseType || req.body.responseType == "") {
      const err = new Error(error_code.RESPONSE_TYPE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!Array.isArray(req.body.submittedBy)) {
      const err = new Error(error_code.RESPONSE_SUBMITTED_BY_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!Array.isArray(req.body.tags)) {
      const err = new Error(error_code.RESPONSE_TAGS_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!Array.isArray(req.body.responseIds)) {
      const err = new Error(error_code.RESPONSE_IDS_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const dataCount = await DownloadedResponse.countDocuments({
      form_id: req.body.formId,
    });
    if (dataCount > 4) {
      const getLastData = await DownloadedResponse.find({
        form_id: req.body.formId,
        status: "active",
      })
        .sort({ created_at: 1 })
        .limit(1);
      //console.log(getLastData);
      if (!getLastData) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }
      const deleteLastRecord = await DownloadedResponse.deleteOne({
        _id: getLastData[0]._id,
      });
      //console.log(deleteLastRecord);
      if (!deleteLastRecord) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }
    }

    const dataToSave = {
      form_id: req.body.formId,
      response_type: req.body.responseType,
      from_date: req.body.fromDate,
      to_date: req.body.toDate,
      submitted_by: req.body.submittedBy,
      tags: req.body.tags,
      response_ids: req.body.responseIds,
      created_by: req.sessionUserData.userid,
    };
    const saveDownloadedResponse = await new DownloadedResponse(
      dataToSave
    ).save();
    if (!saveDownloadedResponse) {
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

exports.getAllDownloadedResponse = async (req, res, next) => {
  try {
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const getLatestData = await DownloadedResponse.find({
      form_id: req.params.formId,
      status: "active",
    })
      .sort({ created_at: -1 })
      .limit(5);
    let isDataFromDatabase = true;
    if (!getLatestData) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      isDataFromDatabase,
      data: getLatestData,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};
// ---------------------response response count---------------------------
exports.getResponseResponsesCount = async (req, res, next) => {
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

    const responseCount = await Response.aggregate([
      {
        $match: {
          formId: mongoose.Types.ObjectId(req.params.formId),
        },
      },
      {
        $project: {
          _id: 0,
          responsesCount: { $size: { $ifNull: ["$responses", []] } },
        },
      },
    ]);
    console.log(responseCount);
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      // count: responseCount ? responseCount[0].responsesCount : 0,
      count:
        responseCount && responseCount.length > 0
          ? responseCount[0].responsesCount
          : 0,
    });
  } catch (err) {
    next(err);
  }
};
// ---------------------response response count---------------------------

//################################ Common helper methods ################################//

// device data from header /////////////////////////////////////////////////////////////////
const getDataFromHeader = (previousData, req) => {
  if (req.headers["x-forwarded-for"] || req.socket.remoteAddress) {
    previousData.ip =
      (req.headers["x-forwarded-for"] || "").split(",")[0] ||
      req.connection.remoteAddress;
  }
  if (req.get("androidVersion") && req.get("androidVersion")?.trim() !== "") {
    previousData.androidVersion = req.get("androidVersion");
  }
  if (req.get("appVersion") && req.get("appVersion")?.trim() !== "") {
    previousData.appVersion = req.get("appVersion");
  }
  if (req.get("batteryLevel") && req.get("batteryLevel")?.trim() !== "") {
    previousData.batteryLevel = req.get("batteryLevel");
  }
  if (req.get("brand") && req.get("brand")?.trim() !== "") {
    previousData.brand = req.get("brand");
  }
  if (
    req.get("carrierAvailable") &&
    req.get("carrierAvailable")?.trim() !== ""
  ) {
    previousData.carrierAvailable = req.get("carrierAvailable");
  }
  if (req.get("hardware") && req.get("hardware")?.trim() !== "") {
    previousData.hardware = req.get("hardware");
  }
  if (req.get("isRooted") && req.get("isRooted")?.trim() !== "") {
    previousData.isRooted = req.get("isRooted");
  }
  if (
    req.get("lastFormDiffUpdatedAt") &&
    req.get("lastFormDiffUpdatedAt")?.trim() !== ""
  ) {
    previousData.lastFormDiffUpdatedAt = req.get("lastFormDiffUpdatedAt");
  }
  if (req.get("lastVersionCode") && req.get("lastVersionCode")?.trim() !== "") {
    previousData.lastVersionCode = req.get("lastVersionCode");
  }
  if (req.get("model") && req.get("model")?.trim() !== "") {
    previousData.model = req.get("model");
  }
  if (
    req.get("networkConnected") &&
    req.get("networkConnected")?.trim() !== ""
  ) {
    previousData.networkConnected = req.get("networkConnected");
  }
  if (req.get("product") && req.get("product")?.trim() !== "") {
    previousData.product = req.get("product");
  }
  if (req.get("sdkVersion") && req.get("sdkVersion")?.trim() !== "") {
    previousData.sdkVersion = req.get("sdkVersion");
  }
  if (req.get("totalRam") && req.get("totalRam")?.trim() !== "") {
    previousData.totalRam = req.get("totalRam");
  }

  return previousData;
};

// Delete image before update /////////////////////////////////////////////////////////////
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.error(err));
};

// Rearrange data ////////////////////////////////////////////////////////////////////////
const rearrangeAllData = (data) => {
  // console.log(data, "datadatadatadata");
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
    //submitted_through: data.submittedBy.deviceData.androidVersion ? 'android' : 'iOS',
    submitted_through: "android",
    //appVersion: data.submittedBy.deviceData.appVersion,
    appVersion: "3.0",
    answers: data.responses,
    flaggedOn: data.flaggedOn,
    responseParantId: data.parentResurveyId,
  };
};

// Rearrange data for group ////////////////////////////////////////////////////////////////////////

const rearrangeAllDataForGroup = (data) => {
  return {
    submitted_by: data.submittedBy.userId.name,
    submitted_by_phone: data.submittedBy.userId.mobile,
    response_id: data._id,
    submitted: data.submittedAt,
    time_spent: data.timeSpent,
    revision_submitted_in: data.formRevision[0].submittedIn,
    revision_created_in: data.formRevision[0].createdIn,
    tag: data.tag,
    response_note: data.responseNote,
    submitted_through: "android",
    appVersion: "3.0",
    answers: groupAnswers(data.responses),
    flaggedOn: data.flaggedOn,
    responseParantId: data.parentResurveyId,
  };
};
const groupAnswers = (responses) => {
  const groupedAnswers = [];
  responses.forEach((answer) => {
    if (answer.groupLabelId) {
      const answerData = {
        answer: answer.answer,
        status: answer.status,
        questionId: answer.questionId,
        createdBy: answer.createdBy,
        questionType: answer.questionType,
        isFlagged: answer.isFlagged,
        isParent: answer.isParent,
        groupLabelId: answer.groupLabelId,
        _id: answer._id,
        createdOnDeviceAt: answer.createdOnDeviceAt,
        lastModifiedOnDeviceAt: answer.lastModifiedOnDeviceAt,
      };
      groupedAnswers.push(answerData);
    }
  });

  return groupedAnswers;
};



// Geo Json Data

exports.getResponseJsonData = async (req, res, next) => {
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
      ])
      .sort({ submittedAt: -1 });

    const geoJsonData = [];

    allResponses.forEach(response => {
      response.responses.forEach(innerResponse => {
        if (innerResponse.questionType === 'distance_on_map') {
          const coordinateLength =  innerResponse.answer.value.coordinates.length
          // console.log(coordinateLength,"coordinateLength");
          const coordinates = innerResponse.answer.value.coordinates.map(coord => ({
            lat: coord.lat,
            lng: coord.lng
          }));
          const { shape, type } = getShapeAndType(coordinates.length);
          const geoJsonObject = {
            username:response.submittedBy.userId.name,
            _id: innerResponse.questionId,
            name: innerResponse.questionType,
            location: {
              lat: coordinates[0].lat, 
              lng: coordinates[0].lng,
            },
            geoBoundary: {
              type: shape,
              // type: 'Polygon',
              coordinates: coordinates.map(coord => [coord.lng, coord.lat]), // GeoJSON format requires [lng, lat] pairs
            }
          };

          geoJsonData.push(geoJsonObject);
        }
        else if (innerResponse.questionType === 'area_on_map') {
          const coordinateLength =  innerResponse.answer.value.coordinates.length
          const coordinates = innerResponse.answer.value.coordinates.map(coord => ({
            lat: coord.lat,
            lng: coord.lng
          }));
          const { shape, type } = getShapeAndType(coordinates.length);
          const geoJsonObject = {
            username:response.submittedBy.userId.name,
            _id: innerResponse.questionId,
            name: innerResponse.questionType,
            location: {
              lat: coordinates[0].lat, 
              lng: coordinates[0].lng, 
            },
            
            geoBoundary: {
              type: shape,
              // type: 'Polygon',
              coordinates: coordinates.map(coord => [coord.lng, coord.lat]), // GeoJSON format requires [lng, lat] pairs
            }
          };

          geoJsonData.push(geoJsonObject);
        }
         else if (innerResponse.questionType === 'image_geo_tag') {
          // Handle image_geo_tag question type
          const geoJsonObject = {
            username:response.submittedBy.userId.name,
            _id: innerResponse.questionId,
            name: innerResponse.questionType,
            location: {
              geoTag: innerResponse.answer.value.geoTag,
              // lng: innerResponse.answer.value.coordinates.lng
            }
          };

          geoJsonData.push(geoJsonObject);
        }
        else if (innerResponse.questionType === 'multiple-image-geo-tag') {
          // Handle image_geo_tag question type
          const geoTags = innerResponse.answer.value.map(value => value.geoTag);
          const geoJsonObject = {
            username:response.submittedBy.userId.name,
            _id:innerResponse.questionId,
            name: innerResponse.questionType,
            location: {
              geoTag: geoTags
            }
          };

          geoJsonData.push(geoJsonObject);
        }
         else if (innerResponse.questionType === 'tracking') {
          const geoJsonObject = {
            username:response.submittedBy.userId.name,
            _id: innerResponse.questionId,
            name: innerResponse.questionType,
            location: {
              lat: innerResponse.answer.value.location.features[0].geometry.coordinates[0],
              lng: innerResponse.answer.value.location.features[0].geometry.coordinates[1],
            }
          };

          geoJsonData.push(geoJsonObject);
        }
        else if (innerResponse.questionType === 'location') {
          const geoJsonObject = {
            username:response.submittedBy.userId.name,
            _id: innerResponse.questionId,
            name: innerResponse.questionType,
            location: {
              lat: innerResponse.answer.value.lat,
              lng: innerResponse.answer.value.lng,
            }
          };

          geoJsonData.push(geoJsonObject);
        }
      });
    });

    res.status(200).json({
      data: geoJsonData,
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (e) {
    next(e);
  }
};
function getShapeAndType(coordinatesLength) {
  let shape, type;
  if (coordinatesLength === 3) {
    shape = 'Triangle';
    type = 'Polygon';
  } else if (coordinatesLength === 4) {
    shape = 'quadrilateral';
    type = 'Polygon';
  } 
  else if (coordinatesLength === 5) {
    shape = 'pentagon';
    type = 'Polygon';
  }else if (coordinatesLength === 6) {
    shape = 'hexagon';
    type = 'Polygon';
  }
  else if (coordinatesLength === 7) {
    shape = 'hexagon';
    type = 'Polygon';
  }
  else if (coordinatesLength === 8) {
    shape = 'octagon';
    type = 'Polygon';
  }
  else if (coordinatesLength === 9) {
    shape = 'nonagon';
    type = 'Polygon';
  }
  else if (coordinatesLength === 10) {
    shape = 'decagon ';
    type = 'Polygon';
  } else {
    shape = 'Unknown';
    type = 'Unknown';
  }
  return { shape, type };
}
// Geo Json Data

exports.audioAudit = async (req, res) => {
  try {
    const audioFile = req.files;

    if (!audioFile) {
      return res.status(400).send("No audio file uploaded");
    }

    // Create a new zip file
    const zip = new AdmZip();

    for (let i = 0; i < audioFile.length; i++) {
      const filePath = audioFile[i].path;

      zip.addLocalFile(filePath);
    }

    const zipFilename = `${Date.now()}.zip`;

    const zipFilePath = path.join(__dirname, "../public/audios", zipFilename);
    zip.writeZip(zipFilePath);

    let saveData = await audioAuditSchema.create({
      audioAudit: req.files,
      audioAuditId: req.body.audioAuditId,
    });
    res.status(200).json({
      status: 1,
      data: saveData,
      error_code: error_code.NONE.CODE,
    });
  } catch (error) {
    console.error("Error saving audio:", error);
    res.status(500).send("Error saving audio").json();
  }
};


