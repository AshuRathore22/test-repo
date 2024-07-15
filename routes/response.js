const express = require("express");
const authMiddleware = require("../middleware/auth");
const responseController = require("../controllers/response");
var upload = require("../middleware/multer");
var uploadShareForm = require("../middleware/multer");

const multer = require("multer");
const audioUpload = multer({ dest: "../public/audios" });
const router = express.Router();

router.post(
  "/upload-file",
  authMiddleware.auth,
  upload.fields([
    {
      name: "uploadingFile",
      maxCount: 1,
    },
  ]),
  responseController.uploadFile
);

router.post(
  "/add-response",
  authMiddleware.auth,
  responseController.addResponse
);
router.post(
  "/add-response-forShareForm",
  authMiddleware.auth,
  responseController.addResponseForShareForm
);

router.get(
  "/get-response/:responseId",
  authMiddleware.auth,
  responseController.getMobileResponseById
);

//Admin
router.put(
  "/admin/update-response-tag/:responseId/:parentResponseId",
  authMiddleware.auth,
  responseController.updateResponseTag
);
router.put(
  "/admin/accepted-rejected-resurvey/:responseId/:parentResponseId",
  authMiddleware.auth,
  responseController.acceptRejectedResurvey
);
router.put(
  "/admin/update-resurvey-tag/:responseId/",
  authMiddleware.auth,
  responseController.updateResurveyTag
);
router.get(
  "/admin/get-all-responses/:formId",
  authMiddleware.auth,
  responseController.getAllResponsesByFormId
);
// 
router.get(
  "/admin/get-all-group-responses/:formId",
  authMiddleware.auth,
  responseController.getAllGroupResponsesByFormId
);
// 
router.get(
  "/admin/get-response/:responseId",
  authMiddleware.auth,
  responseController.getResponseById
);
router.put(
  "/admin/update-questions-flag/:responseId",
  authMiddleware.auth,
  responseController.updateFlagsQuestionResponse
);
router.get(
  "/mob/get-response-form-count/:formId",
  authMiddleware.auth,
  responseController.getResponseFormCount
);
router.get(
  "/mob/get-response-answer-count/:formId/:status",
  authMiddleware.auth,
  responseController.getResponseAnswerCount
);
router.get(
  "/mob/get-question-flagged-count/:formId/:status",
  authMiddleware.auth,
  responseController.getQuestionFlaggedCount
);
router.post(
  "/mob/add-flagged-response",
  authMiddleware.auth,
  responseController.addFlaggedResponse
);
router.get(
  "/admin/get-pending-response-resurvey/:responseId",
  authMiddleware.auth,
  responseController.getPendingCompareResponse
);
router.get(
  "/admin/get-all-resurvey/:formId",
  authMiddleware.auth,
  responseController.getAllResurveyData
);
router.get(
  "/admin/get-group-responses/:resId/:groupId",
  authMiddleware.auth,
  responseController.getGroupResponses
);
router.get(
  "/mob/check-parent-response-id/:responseId",
  authMiddleware.auth,
  responseController.checkParentResponseId
);

//////////////////////
// router.post('/admin/get-all-table-data', authMiddleware.auth, responseController.getAllTableData);
router.get(
  "/admin/get-all-table-data/:formId",
  authMiddleware.auth,
  responseController.getAllTableData
);
router.get(
  "/admin/get-all-map-points/:formId",
  authMiddleware.auth,
  responseController.getAllMapPoints
);
router.get(
  "/admin/get-all-medias/:formId",
  authMiddleware.auth,
  responseController.getAllMedias
);
//////////////////////
router.post(
  "/admin/convert-media-data",
  authMiddleware.auth,
  responseController.mediaToArraybuffer
);

//////////////////////
router.post(
  "/admin/add-downloaded-response",
  authMiddleware.auth,
  responseController.addDownloadedResponse
);
router.get(
  "/admin/get-downloaded-responses/:formId",
  authMiddleware.auth,
  responseController.getAllDownloadedResponse
);
// -------------------------------------
router.get(
  "/admin/get-response-response-count/:formId",
  authMiddleware.auth,
  responseController.getResponseResponsesCount
);

router.get(
  "/admin/get-response-jsonData/:formId",
  authMiddleware.auth,
  responseController.getResponseJsonData
);
// ------------------------------------------
router.post(
  "/audioAudit",
  audioUpload.array("audioAudit", 10),
  responseController.audioAudit
);

module.exports = router;
