const express = require("express");
const responseController = require("../controllers/response");
var upload = require("../middleware/multer");
const authMiddleware = require("../middleware/auth");
var uploadShareForm = require("../middleware/multer");
const organizationStatus = require('../middleware/organizationStatus');
const subscriptionEnd = require('../middleware/subscriptionEnd');

const multer = require("multer");
const audioUpload = multer({ dest: "../public/audios" });
const router = express.Router();

router.post(
  "/upload-file",
  authMiddleware.auth, 
  // subscriptionEnd.checkSubscription, 
  // organizationStatus.checkOrganizationStatus, 
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
  // subscriptionEnd.checkSubscription, 
  // organizationStatus.checkOrganizationStatus,  
  responseController.addResponse
);
router.post(
  "/add-response-forShareForm",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.addResponseForShareForm
);

router.get(
  "/get-response/:responseId",
  authMiddleware.auth, 
  // subscriptionEnd.checkSubscription, 
  // organizationStatus.checkOrganizationStatus, 
  responseController.getMobileResponseById
);

//Admin
router.put(
  "/admin/update-response-tag/:responseId/:parentResponseId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.updateResponseTag
);
router.put(
  "/admin/accepted-rejected-resurvey/:responseId/:parentResponseId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.acceptRejectedResurvey
);
router.put(
  "/admin/update-resurvey-tag/:responseId/",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.updateResurveyTag
);
router.get(
  "/admin/get-all-responses/:formId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.getAllResponsesByFormId
);
router.get(
  "/admin/get-response/:responseId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.getResponseById
);
router.put(
  "/admin/update-questions-flag/:responseId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.updateFlagsQuestionResponse
);
router.get(
  "/mob/get-response-form-count/:formId",
  authMiddleware.auth, 
  // subscriptionEnd.checkSubscription, 
  // organizationStatus.checkOrganizationStatus, 
  responseController.getResponseFormCount
);
router.get(
  "/mob/get-response-answer-count/:formId/:status",
  authMiddleware.auth, 
  // subscriptionEnd.checkSubscription, 
  // organizationStatus.checkOrganizationStatus, 
  responseController.getResponseAnswerCount
);
router.get(
  "/mob/get-question-flagged-count/:formId/:status",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.getQuestionFlaggedCount
);
router.post(
  "/mob/add-flagged-response",
  authMiddleware.auth, 
  // subscriptionEnd.checkSubscription, 
  // organizationStatus.checkOrganizationStatus, 
  responseController.addFlaggedResponse
);
router.get(
  "/admin/get-pending-response-resurvey/:responseId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.getPendingCompareResponse
);
router.get(
  "/admin/get-all-resurvey/:formId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.getAllResurveyData
);
router.get(
  "/admin/get-group-responses/:resId/:groupId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.getGroupResponses
);
router.get(
  "/mob/check-parent-response-id/:responseId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.checkParentResponseId
);

//////////////////////
// router.post('/admin/get-all-table-data', authMiddleware.auth, responseController.getAllTableData);
router.get(
  "/admin/get-all-table-data/:formId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.getAllTableData
);
router.get(
  "/admin/get-all-map-points/:formId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.getAllMapPoints
);
router.get(
  "/admin/get-all-medias/:formId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.getAllMedias
);
//////////////////////
router.post(
  "/admin/convert-media-data",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.mediaToArraybuffer
);

//////////////////////
router.post(
  "/admin/add-downloaded-response",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.addDownloadedResponse
);
router.get(
  "/admin/get-downloaded-responses/:formId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.getAllDownloadedResponse
);
// -------------------------------------
router.get(
  "/admin/get-response-response-count/:formId",
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  responseController.getResponseResponsesCount
);
// ------------------------------------------
router.post(
  "/audioAudit",
  audioUpload.array("audioAudit", 10),
  responseController.audioAudit
);

module.exports = router;
