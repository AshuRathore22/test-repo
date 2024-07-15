const express = require("express");
const authMiddleware = require("../middleware/auth");
const formController = require("../controllers/form");
var upload = require("../middleware/multer");
const router = express.Router();

router.get(
  "/admin/get-rule-group/:formId/:parentId",
  authMiddleware.auth,
  formController.getRulesForGroup
);

// ----------monitoring-------------
router.get("/admin/get-all-form-monitoring", authMiddleware.auth,formController.getAllFormForMonitoring);
router.get("/admin/get-all-questions-monitoring/:formId", authMiddleware.auth,formController.getAllQuestionsForMonitoring);
router.put("/admin/update-attribute-monitoring", authMiddleware.auth,formController.addAttributesForMonitoring);
router.get("/admin/get-attributes/:formId/:questionId", authMiddleware.auth,formController.getAllAttributes);
router.get("/admin/get-attributes-mobile/:formId/:questionId", authMiddleware.auth,formController.getAllAttributesForMobile);
router.delete("/admin/delete-attribute/:formId/:questionId/:attributeId", authMiddleware.auth,formController.deleteAttribute);
router.get("/admin/search-attribute/:formId/:questionId/:key", authMiddleware.auth,formController.searchAttribute);
// ----------monitoring-------------
router.post(
  "/contact-form",
  authMiddleware.auth,
  upload.fields([
    {
      name: "uploadingFile",
      maxCount: 1,
    },
  ]),
  formController.contactForm
);

router.get(
  "/all-user-forms",
  authMiddleware.auth,
  formController.getAllFormsList
);

router.get("/:id", authMiddleware.auth, formController.getForm);

router.get("/admin/:id", authMiddleware.auth, formController.getFormAdmin);

router.get(
  "/questions/:formId",
  authMiddleware.auth,
  formController.getQuestions
);

router.get(
  "/admin/questions/:formId",
  authMiddleware.auth,
  formController.getAdminQuestions
);

router.post(
  "/admin/add-audience",
  authMiddleware.auth,
  formController.addAudience
);

router.get(
  "/admin/get-audience/:formId",
  authMiddleware.auth,
  formController.getAudience
);

router.put(
  "/admin/remove-audience",
  authMiddleware.auth,
  formController.removeAudience
);

router.post(
  "/admin/add-question",
  authMiddleware.auth,
  formController.addQuestion
);

router.put(
  "/admin/publish-form/:formId",
  authMiddleware.auth,
  formController.publishForm
);

router.get(
  "/admin/get-form-status/:formId",
  authMiddleware.auth,
  formController.getFormStatus
);

router.get(
  "/admin/get-form-responses-count/:formId",
  authMiddleware.auth,
  formController.getFormResponsesCount
);

router.get(
  "/admin/get-form-users-count/:formId",
  authMiddleware.auth,
  formController.getFormUsersCount
);
router.put(
  "/admin/update-question/:id",
  authMiddleware.auth,
  upload.fields([
    {
      name: "helpImageURL",
      maxCount: 1,
    },
    {
      name: "optionImages[]",
      maxCount: 30,
    },
  ]),
  formController.updateQuestion
);

router.delete(
  "/admin/delete-question/:formId/:questionId",
  authMiddleware.auth,
  formController.deleteQuestion
);
// deleteHelpImage
router.delete(
  "/admin/deleteHelpImage/:id",
  // authMiddleware.auth,
  formController.deleteHelpImage
);
// deleteHelpImage
router.post("/", authMiddleware.auth, formController.addNewForm);

router.get(
  "/all-admin-forms/:orgId",
  authMiddleware.auth,
  formController.getAdminFormsList
);

router.get(
  "/admin/get-rules-question/:formId",
  authMiddleware.auth,
  formController.getRulesQuestions
);

router.post("/admin/add-rule/", authMiddleware.auth, formController.addRule);
router.put(
  "/admin/update-rule/",
  authMiddleware.auth,
  formController.updateRule
);

router.post("/admin/copy-form/", authMiddleware.auth, formController.copyForm);

router.get(
  "/admin/get-rules/:formId",
  authMiddleware.auth,
  formController.getRules
);

router.get(
  "/admin/search-rules/:formId",
  authMiddleware.auth,
  formController.searchRules
);

router.post(
  "/admin/add-team-access",
  authMiddleware.auth,
  formController.addTeamAccess
);

router.get(
  "/admin/versions/:formId",
  authMiddleware.auth,
  formController.getFormVersionbyId
);

router.get(
  "/admin/export/:formId",
  authMiddleware.auth,
  formController.exportForm
);

router.get(
  "/admin/form-version/:id",
  authMiddleware.auth,
  formController.getVersionbyId
);

router.put(
  "/admin/remove-team-access",
  authMiddleware.auth,
  formController.removeTeamAccess
);

router.get(
  "/admin/get-form-teams/:formId",
  authMiddleware.auth,
  formController.getFormTeams
);

router.put(
  "/admin/delete-teams",
  authMiddleware.auth,
  formController.deleteTeamForForms
);

router.put(
  "/admin/update-form/:formId",
  authMiddleware.auth,
  formController.updateFormById
);

router.get(
  "/admin/get-question-count/:formId",
  authMiddleware.auth,
  formController.getQuestionsCount
);

router.delete(
  "/admin/delete-rule/:formId/:ruleId",
  authMiddleware.auth,
  formController.deleteRules
);

router.put(
  "/admin/publish-flagging/:formId",
  authMiddleware.auth,
  formController.publishFlagging
);

router.put(
  "/admin/form-settings/:formId",
  authMiddleware.auth,
  formController.changeFormSettings
);

router.put(
  "/admin/unpublish-form/:formId",
  authMiddleware.auth,
  formController.unpublishForm
);

router.put(
  "/admin/delete-form/:formId",
  authMiddleware.auth,
  formController.deleteForm
);

router.put(
  "/admin/addChildQues/:formId",
  authMiddleware.auth,
  formController.addChildQuestion
);

router.put(
  "/admin/removeChildQues/:formId",
  authMiddleware.auth,
  formController.removeChildQuestion
);

router.get(
  "/admin/getChildQues/:formId",
  authMiddleware.auth,
  formController.getChildQuestions
);

router.get(
  "/admin/getTypeSpecificQues/:formId",
  authMiddleware.auth,
  formController.getTypeSpecificQuestions
);

router.put(
  "/admin/updateTypeSpecificQuesInParent/:formId",
  authMiddleware.auth,
  formController.updateTypeSpecificQuestionsInParant
);

router.put(
  "/admin/updateQuesKeywordStatus/:formId",
  authMiddleware.auth,
  formController.updateQuestionKeywordStatus
);

router.get(
  "/getGroupQuestions/:formId",
  authMiddleware.auth,
  formController.getGroupQuestions
);

router.post(
  "/admin/add-response-api",
  authMiddleware.auth,
  formController.addResponseApiKey
);

router.get(
  "/admin/getResponseApiKey/:formId",
  authMiddleware.auth,
  formController.getResponseApiKey
);

router.delete(
  "/admin/delete-response-key/:formId/:keyId",
  authMiddleware.auth,
  formController.deleteApiKey
);

router.get(
  "/admin/get-all-response/:formId",
  formController.getAllResponseByFormId
);

router.get("/mob/clear-all-form/:userId", formController.clearFormMob);

router.post("/copyQuestion", authMiddleware.auth, formController.copyQuestion);
router.post("/moveQuestion", authMiddleware.auth, formController.moveQuestion);

router.put("/admin/upRule/", authMiddleware.auth, formController.upRule);
//  router.get('/admin/countResponses/',authMiddleware.auth,formController.dashboard)
router.get(
  "/admin/shubgetAdminFormsList",
  formController.shubgetAdminFormsList
);

router.get(
  "/user/dashboard/:orgId",
  authMiddleware.auth,
  formController.dashboard
);
router.post("/user/shareForm", authMiddleware.auth, formController.shareForm);
router.post(
  "/user/shareFormCopyLink",
  authMiddleware.auth,
  formController.shareFormCopyLink
);
router.get("/user/verifyShareToken/:token", formController.verifyShareToken);
// =========================rules for group question==============================

router.post(
  "/admin/add-rule-group/",
  authMiddleware.auth,
  formController.addRuleForGroup
);

router.put(
  "/admin/update-rule-Group",
  authMiddleware.auth,
  formController.updateRuleForGroup
);

router.delete(
  "/admin/delete-rule-group/:formId/:parentId/:ruleId",
  authMiddleware.auth,
  formController.deleteRuleForGroup
);

// =========================rules for group question==============================


module.exports = router;
