const error_code = require("../config/error-code");
const reportMaster = require("../models/reportMaster");
const formReport = require("../models/formReport");
const Form = require("../models/form");
const Users = require("../models/users");
const Organization = require("../models/organization");
const fs = require("fs");
const axios = require("axios");
const Response = require("../models/response");
const { response } = require("express");
const path = require("path");

exports.createReport = async (req, res) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.orgId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const org = await Organization.findById(req.body.orgId);
    if (!org) {
      const err = new Error(error_code.ORG_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const newReport = new reportMaster({
      reportTitle: req.body.reportTitle,
      templateReport: req.body.templateReport,
      organizationId: req.body.orgId,
      created_by: checkValidUser._id,
      updated_by: checkValidUser._id,
    });
    const savedReport = await newReport.save();
    return res.status(201).json({
      success: true,
      message: "Report created successfully.",
      report: savedReport,
      error_code: error_code.NONE.CODE,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getReportById = async (req, res) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.params.report_id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const reportData = await reportMaster.findById(req.params.report_id);
    if (!reportData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    return res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: reportData,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getAllActiveReport = async (req, res) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const reportData = await reportMaster
      .find({ status: "active" })
      .sort({ createdAt: -1 });
    if (!reportData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    return res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: reportData,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.updateReport = async (req, res) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.params.report_id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const dataToUpdate = {
      templateReport: req.body.report,
      updated_by: checkValidUser._id,
      updated_at: Date.now(),
    };
    const updatedReported = await reportMaster.findByIdAndUpdate(
      req.params.report_id,
      dataToUpdate,
      { new: true }
    );
    if (!updatedReported) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    return res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      data: updatedReported,
    });
  } catch (error) {
    console.log(error);
  }
};
exports.reportForPDF = async (req, res) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.formId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const form = await Form.findById(req.body.formId);
    if (!form) {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.pdfReport) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    const report = await reportMaster.findById(req.body.reportId);
    if (!report) {
      const err = new Error(error_code.REPORT_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const check = await formReport.findOne({
      formId: req.body.formId,
      reportId: req.body.reportId,
    });
    const dataToUpdate = {
      pdfReport: req.body.pdfReport,
      updated_by: checkValidUser._id,
      updated_at: Date.now(),
    };
    if (check) {
      const updatedPdfReport = await formReport.findByIdAndUpdate(
        check._id,
        dataToUpdate,
        { new: true }
      );
      if (!updatedPdfReport) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }
      return res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        data: updatedPdfReport,
      });
    } else {
      const newPdfReport = new formReport({
        reportId: req.body.reportId,
        formId: req.body.formId,
        pdfReport: req.body.pdfReport,
        created_by: checkValidUser._id,
        updated_by: checkValidUser._id,
      });
      const savedReport = await newPdfReport.save();
      return res.status(201).json({
        success: true,
        message: "Report created successfully.",
        report: savedReport,
        error_code: error_code.NONE.CODE,
      });
    }
  } catch (error) {
    console.log(error);
  }
};

exports.deleteReport = async (req, res) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.params.report_id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const report = await reportMaster.findById(req.params.report_id);
    if (!report) {
      const err = new Error(error_code.REPORT_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    report.status = "inactive";
    const updatedReport = await reportMaster.findByIdAndUpdate(
      req.params.report_id,
      report
    );
    if (!updatedReport) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    return res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (error) {
    console.log(error);
  }
};
exports.getPdfReportByBothId = async (req, res) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.params.formId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.params.reportId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const reportData = await formReport.find({
      formId: req.params.formId,
      reportId: req.params.reportId,
    });
    if (!reportData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    return res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: reportData,
    });
  } catch (error) {
    console.log(error);
  }
};

// exports.replaceQuestion = async (req, res) => {
//   try {
//     if (!req.isAuth) {
//       throw new Error(error_code.NOT_AUTHERIZED.CODE);
//     }
//     const checkValidUser = await Users.findById(req.sessionUserData.userid);
//     if (!checkValidUser) {
//       throw new Error(error_code.NOT_AUTHERIZED.CODE);
//     }
//     if (!req.params.formId) {
//       throw new Error(error_code.ID_NOT_FOUND.CODE);
//     }
//     const form = await Form.findById(req.params.formId);
//     if (!form) {
//       throw new Error(error_code.FORM_NOT_FOUND.CODE);
//     }
//     if (!req.params.respId) {
//       throw new Error(error_code.ID_NOT_FOUND.CODE);
//     }
//     const resp = await Response.findById(req.params.respId);
//     if (!resp) {
//       throw new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
//     }
//     const reportId = form.reportId;
//     const reportData = await formReport.find({
//       formId: req.params.formId,
//       reportId: reportId,
//     });
//     if (!reportData || reportData.length === 0) {
//       throw new Error(error_code.UNKNOWN_ERROR.CODE);
//     }
//     if (!reportData[0].pdfReport) {
//       throw new Error("PDF report data is empty");
//     }
//     let pdfReport = reportData[0].pdfReport;
//     if (typeof pdfReport === "string") {
//       pdfReport = JSON.parse(pdfReport);
//     }
//     const formQue = form.questions;
//     const respAns = resp.responses;
//     // console.log(respAns); return
//     const replaceTextValue = (obj, queType, queAns) => {
//       if (
//         obj.hasOwnProperty("text") &&
//         typeof obj.text === "string" &&
//         obj.text.toLowerCase() === queType.toLowerCase()
//       ) {
//         obj.text = queAns;
//       }

//     };
//     pdfReport.objects.forEach((obj) => {
//       for (let i = 0; i < formQue.length; i++) {
//         const queType = formQue[i].questionType;
//         const queAns = respAns[i] ? respAns[i].answer.value : "";
//         replaceTextValue(obj, queType, queAns);
//       }
//     });
//     pdfReport = JSON.stringify(pdfReport);
//     console.log(pdfReport,"fkldnfkjdndkfj");
//     return res.status(200).json({
//       success: true,
//       pdfReport: pdfReport,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// exports.replaceQuestion = async (req, res) => {
//   try {
//     if (!req.isAuth) {
//       throw new Error(error_code.NOT_AUTHERIZED.CODE);
//     }
//     const checkValidUser = await Users.findById(req.sessionUserData.userid);
//     if (!checkValidUser) {
//       throw new Error(error_code.NOT_AUTHERIZED.CODE);
//     }
//     if (!req.params.formId) {
//       throw new Error(error_code.ID_NOT_FOUND.CODE);
//     }
//     const form = await Form.findById(req.params.formId);
//     if (!form) {
//       throw new Error(error_code.FORM_NOT_FOUND.CODE);
//     }
//     if (!req.params.respId) {
//       throw new Error(error_code.ID_NOT_FOUND.CODE);
//     }
//     const resp = await Response.findById(req.params.respId);
//     if (!resp) {
//       throw new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
//     }
//     const reportId = form.reportId;
//     const reportData = await formReport.find({
//       formId: req.params.formId,
//       reportId: reportId,
//     });
//     if (!reportData || reportData.length === 0) {
//       throw new Error(error_code.UNKNOWN_ERROR.CODE);
//     }
//     if (!reportData[0].pdfReport) {
//       throw new Error("PDF report data is empty");
//     }
//     let pdfReport = reportData[0].pdfReport;
//     if (typeof pdfReport === "string") {
//       pdfReport = JSON.parse(pdfReport);
//     }
//     const formQue = form.questions;
//     const respAns = resp.responses;
//     const replaceValue = async (obj, queType, queAns) => {
//       if (
//         obj.hasOwnProperty("text") &&
//         typeof obj.text === "string" &&
//         obj.text.toLowerCase() === queType.toLowerCase()
//       ) {
//         obj.text = queAns;
//       } else if (
//         obj.hasOwnProperty("image") &&
//         typeof obj.image === "string" &&
//         obj.image.toLowerCase() === queType.toLowerCase()
//       ) {
//         const imageData = Buffer.from(queAns, 'base64');
//         const imagePath = 'api/public/uploads/';
//         fs.writeFileSync(imagePath, imageData);
//         obj.image = imagePath;
//       }
//     };
//     pdfReport.objects.forEach((obj) => {
//       for (let i = 0; i < formQue.length; i++) {
//         const queType = formQue[i].questionType;
//         const queAns = respAns[i] ? respAns[i].answer.value : "";
//         replaceValue(obj, queType, queAns);
//       }
//     });
//     pdfReport = JSON.stringify(pdfReport);
//     console.log(pdfReport, '...................................................');
//     return res.status(200).json({
//       success: true,
//       pdfReport: pdfReport,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// const fs = require('fs');
// const path = require('path');

// exports.replaceQuestion = async (req, res) => {
//   try {
//     if (!req.isAuth) {
//       throw new Error(error_code.NOT_AUTHERIZED.CODE);
//     }
//     const checkValidUser = await Users.findById(req.sessionUserData.userid);
//     if (!checkValidUser) {
//       throw new Error(error_code.NOT_AUTHERIZED.CODE);
//     }
//     if (!req.params.formId) {
//       throw new Error(error_code.ID_NOT_FOUND.CODE);
//     }
//     const form = await Form.findById(req.params.formId);
//     if (!form) {
//       throw new Error(error_code.FORM_NOT_FOUND.CODE);
//     }
//     if (!req.params.respId) {
//       throw new Error(error_code.ID_NOT_FOUND.CODE);
//     }
//     const resp = await Response.findById(req.params.respId);
//     if (!resp) {
//       throw new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
//     }
//     const reportId = form.reportId;
//     const reportData = await formReport.find({
//       formId: req.params.formId,
//       reportId: reportId,
//     });
//     if (!reportData || reportData.length === 0) {
//       throw new Error(error_code.UNKNOWN_ERROR.CODE);
//     }
//     if (!reportData[0].pdfReport) {
//       throw new Error("PDF report data is empty");
//     }
//     let pdfReport = reportData[0].pdfReport;
//     // console.log(pdfReport,"pdfReport"); return
//     if (typeof pdfReport === "string") {
//       pdfReport = JSON.parse(pdfReport);
//     }
//     const formQue = form.questions;
//     const respAns = resp.responses;
//     pdfReport.objects.forEach((obj) => {
//       for (let i = 0; i < formQue.length; i++) {
//         const queType = formQue[i].questionType;
//         const queAns = respAns[i] ? respAns[i].answer.value : "";

//         if (
//           obj.hasOwnProperty("text") &&
//           typeof obj.text === "string" &&
//           obj.text.toLowerCase() === queType.toLowerCase()
//         ) {
//           obj.text = queAns;
//         }
//         if (typeof obj.text === 'string' && /\.(jpg|jpeg|png|gif)$/i.test(obj.text)) {
//           const imagePath = path.join(__dirname, 'public', 'uploads', obj.text);
//           const imageData = fs.readFileSync(imagePath);
//           const base64Data = Buffer.from(imageData).toString('base64');

//           obj.text = { base64Data }; ``
//         }
//       }
//     });

//     pdfReport = JSON.stringify(pdfReport);
//     return res.status(200).json({
//       success: true,
//       pdfReport: pdfReport,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// const fs = require('fs'); // Importing file system module

// exports.replaceQuestion = async (req, res) => {
//   try {
//     if (!req.isAuth) {
//       throw new Error(error_code.NOT_AUTHERIZED.CODE);
//     }
//     const checkValidUser = await Users.findById(req.sessionUserData.userid);
//     if (!checkValidUser) {
//       throw new Error(error_code.NOT_AUTHERIZED.CODE);
//     }
//     if (!req.params.formId) {
//       throw new Error(error_code.ID_NOT_FOUND.CODE);
//     }
//     const form = await Form.findById(req.params.formId);
//     if (!form) {
//       throw new Error(error_code.FORM_NOT_FOUND.CODE);
//     }
//     if (!req.params.respId) {
//       throw new Error(error_code.ID_NOT_FOUND.CODE);
//     }
//     const resp = await Response.findById(req.params.respId);
//     if (!resp) {
//       throw new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
//     }
//     const reportId = form.reportId;
//     const reportData = await formReport.find({
//       formId: req.params.formId,
//       reportId: reportId,
//     });
//     if (!reportData || reportData.length === 0) {
//       throw new Error(error_code.UNKNOWN_ERROR.CODE);
//     }
//     if (!reportData[0].pdfReport) {
//       throw new Error("PDF report data is empty");
//     }
//     let pdfReport = reportData[0].pdfReport;
//     if (typeof pdfReport === "string") {
//       pdfReport = JSON.parse(pdfReport);
//     }
//     const formQue = form.questions;
//     const respAns = resp.responses;

//     const replaceTextValue = (obj, queType, queAns) => {
//       if (
//         obj.hasOwnProperty("text") &&
//         typeof obj.text === "string" &&
//         obj.text.toLowerCase() === queType.toLowerCase()
//       ) {
//         obj.text = queAns;
//       } else if (
//         obj.hasOwnProperty("image") &&
//         typeof obj.image === "string" &&
//         obj.image.startsWith("public/uploads/")
//       ) {
//         const imageData = fs.readFileSync(obj.image);
//         const base64Image = Buffer.from(imageData).toString('base64');
//         obj.image = base64Image;
//       }
//     };

//     pdfReport.objects.forEach((obj) => {
//       for (let i = 0; i < formQue.length; i++) {
//         const queType = formQue[i].questionType;
//         const queAns = respAns[i] ? respAns[i].answer.value : "";
//         replaceTextValue(obj, queType, queAns);
//       }
//     });

//     pdfReport = JSON.stringify(pdfReport);
//     console.log(pdfReport);
//     return res.status(200).json({
//       success: true,
//       pdfReport: pdfReport,
//     });
//   } catch (error) {
//     console.log(error);
//     return res.status(500).json({ success: false, error: error.message });
//   }
// };

const convertImageToBase64 = async (imageUrl) => {
  try {
    console.log("hello");
    const response = await axios.get(imageUrl, { responseType: "arraybuffer" });
    console.log(response, "response");
    const base64Image = Buffer.from(response.data, "binary").toString("base64");
    return base64Image;
  } catch (error) {
    console.error("Error fetching image:", error);
    throw new Error("Error fetching image: Image not found or inaccessible");
  }
};

exports.replaceQuestionsasas = async (req, res) => {
  try {
    if (!req.isAuth) {
      throw new Error(error_code.NOT_AUTHERIZED.CODE);
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      throw new Error(error_code.NOT_AUTHERIZED.CODE);
    }
    if (!req.params.formId) {
      throw new Error(error_code.ID_NOT_FOUND.CODE);
    }
    const form = await Form.findById(req.params.formId);
    if (!form) {
      throw new Error(error_code.FORM_NOT_FOUND.CODE);
    }
    if (!req.params.respId) {
      throw new Error(error_code.ID_NOT_FOUND.CODE);
    }
    const resp = await Response.findById(req.params.respId);
    if (!resp) {
      throw new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
    }
    const reportId = form.reportId;
    const reportData = await formReport.find({
      formId: req.params.formId,
      reportId: reportId,
    });

    if (!reportData || reportData.length === 0) {
      throw new Error(error_code.UNKNOWN_ERROR.CODE);
    }
    if (!reportData[0].pdfReport) {
      throw new Error("PDF report data is empty");
    }
    let pdfReport = reportData[0].pdfReport;
    if (typeof pdfReport === "string") {
      pdfReport = JSON.parse(pdfReport);
    }
    const formQue = form.questions;
    const respAns = resp.responses;

    const replaceTextValue = (obj, queType, queAns) => {
      if (
        obj.hasOwnProperty("text") &&
        typeof obj.text === "string" &&
        obj.text.toLowerCase() === queType.toLowerCase()
      ) {
        obj.text = queAns;
      }
    };
    console.log(__dirname, "__dirname__dirname__dirname__dirname");
    const replaceImageValue = async (obj) => {
      if (
        obj.hasOwnProperty("text") &&
        typeof obj.text === "object" &&
        obj.text.mimeType === "image/jpeg" &&
        obj.text.url
      ) {
        try {
          const imageUrl = `http://localhost:3036/${obj.text.url}`;
          console.log("imageUrl", imageUrl);
          const base64Image = await convertImageToBase64(imageUrl);
          console.log(
            base64Image,
            "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
          );
          obj.text = base64Image;
        } catch (error) {
          if (error.response && error.response.status === 404) {
            console.error("Image not found:", error.response.statusText);
          } else {
            console.error("Error replacing image:", error);
          }
        }
      }
    };

    pdfReport.objects.forEach(async (obj) => {
      for (let i = 0; i < formQue.length; i++) {
        const queType = formQue[i].questionType;
        const queAns = respAns[i] ? respAns[i].answer.value : "";
        replaceTextValue(obj, queType, queAns);
      }

      await replaceImageValue(obj);
    });

    pdfReport = JSON.stringify(pdfReport);
    console.log(pdfReport);

    return res.status(200).json({
      success: true,
      pdfReport: pdfReport,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.replaceQuestiondsddsdsd = async (req, res) => {
  try {
    if (!req.isAuth) {
      throw new Error(error_code.NOT_AUTHERIZED.CODE);
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      throw new Error(error_code.NOT_AUTHERIZED.CODE);
    }
    if (!req.params.formId) {
      throw new Error(error_code.ID_NOT_FOUND.CODE);
    }
    const form = await Form.findById(req.params.formId);
    if (!form) {
      throw new Error(error_code.FORM_NOT_FOUND.CODE);
    }
    if (!req.params.respId) {
      throw new Error(error_code.ID_NOT_FOUND.CODE);
    }
    const resp = await Response.findById(req.params.respId);
    if (!resp) {
      throw new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
    }
    const reportId = form.reportId;
    const reportData = await formReport.find({
      formId: req.params.formId,
      reportId: reportId,
    });

    if (!reportData || reportData.length === 0) {
      throw new Error(error_code.UNKNOWN_ERROR.CODE);
    }
    if (!reportData[0].pdfReport) {
      throw new Error("PDF report data is empty");
    }
    let pdfReport = reportData[0].pdfReport;
    if (typeof pdfReport === "string") {
      pdfReport = JSON.parse(pdfReport);
    }
    const formQue = form.questions;
    const respAns = resp.responses;

    const replaceTextValue = (obj, queType, queAns) => {
      if (
        obj.hasOwnProperty("text") &&
        typeof obj.text === "string" &&
        obj.text.toLowerCase() === queType.toLowerCase()
      ) {
        obj.text = queAns;
      }
    };
    const replaceImageValue = async (obj) => {
      if (
        obj.hasOwnProperty("text") &&
        typeof obj.text === "object" &&
        obj.text.mimeType === "image/jpeg" &&
        obj.text.url
      ) {
        try {
          // var invoicePath = path.join(__dirname, `../${filename}`);

          // const imageUrl = `http://localhost:3036/${obj.text.url}`;
          var imageUrl = path.join(__dirname, `uploads/1715066782121.jpeg`);
          const base64Image = await convertImageToBase64(imageUrl);
          console.log(
            base64Image,
            "<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<"
          );
          obj.text = base64Image;
        } catch (error) {
          if (error.response && error.response.status === 404) {
            console.error("Image not found:", error.response.statusText);
          } else {
            console.error("Error replacing image:", error);
          }
        }
      }
    };

    pdfReport.objects.forEach(async (obj) => {
      for (let i = 0; i < formQue.length; i++) {
        const queType = formQue[i].questionType;
        const queAns = respAns[i] ? respAns[i].answer.value : "";
        replaceTextValue(obj, queType, queAns);
      }

      await replaceImageValue(obj);
    });

    pdfReport = JSON.stringify(pdfReport);
    console.log(pdfReport);

    return res.status(200).json({
      success: true,
      pdfReport: pdfReport,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

exports.replaceQuestion = async (req, res) => {
  try {
    if (!req.isAuth) {
      throw new Error(error_code.NOT_AUTHERIZED.CODE);
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      throw new Error(error_code.NOT_AUTHERIZED.CODE);
    }
    if (!req.params.formId) {
      throw new Error(error_code.ID_NOT_FOUND.CODE);
    }
    const form = await Form.findById(req.params.formId);
    if (!form) {
      throw new Error(error_code.FORM_NOT_FOUND.CODE);
    }
    if (!req.params.respId) {
      throw new Error(error_code.ID_NOT_FOUND.CODE);
    }
    const resp = await Response.findById(req.params.respId);
    if (!resp) {
      throw new Error(error_code.RESPONSE_ID_NOT_FOUND.CODE);
    }
    const reportId = form.reportId;
    const reportData = await formReport.find({
      formId: req.params.formId,
      reportId: reportId,
    });
    if (!reportData || reportData.length === 0) {
      throw new Error(error_code.UNKNOWN_ERROR.CODE);
    }
    if (!reportData[0].pdfReport) {
      throw new Error("PDF report data is empty");
    }
    let pdfReport = reportData[0].pdfReport;
    if (typeof pdfReport === "string") {
      pdfReport = JSON.parse(pdfReport);
    }
    const formQue = form.questions;
    const respAns = resp.responses;
    // console.log(respAns); return
    const replaceTextValue = (obj, queType, queAns) => {
      if (
        obj.hasOwnProperty("text") &&
        typeof obj.text === "string" &&
        obj.text.toLowerCase() === queType.toLowerCase()
      ) {
        obj.text = queAns;
      }
    };
    pdfReport.objects.forEach((obj) => {
      for (let i = 0; i < formQue.length; i++) {
        const queType = formQue[i].questionType;
        const queAns = respAns[i] ? respAns[i].answer.value : "";
        replaceTextValue(obj, queType, queAns);
      }
    });

    async function convertImagesToBase64(pdfReport) {
      for (const obj of pdfReport.objects) {
        if (obj.type === "text" && obj.text && obj.text.url) {
          try {
            const imageURL = ` http://localhost:3036/${obj.text.url}`;
            const response = await axios.get(imageURL, {
              responseType: "arraybuffer",
            });
            const base64Image = Buffer.from(response.data, "binary").toString(
              "base64"
            );
            obj.text.url = `data:${response.headers["content-type"]};base64,${base64Image}`;
          } catch (error) {
            console.error(
              "Error fetching or converting image for URL:",
              obj.text.url,
              error
            );
          }
        }
      }
      return pdfReport;
    }
    pdfReport = await convertImagesToBase64(pdfReport);
    pdfReport = JSON.stringify(pdfReport);
    console.log(pdfReport,"fkldnfkjdndkfj");

    return res.status(200).json({
      success: true,
      pdfReport: pdfReport,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
