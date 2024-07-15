const express = require("express");
const authMiddleware = require("../middleware/auth");
const organizationStatus = require('../middleware/organizationStatus');
const subscriptionEnd = require('../middleware/subscriptionEnd');
const reportMaster = require("../controllers/reportMaster");

const router = express.Router();

router.post(
    '/createReport', 
    authMiddleware.auth,
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    reportMaster.createReport
);
router.get(
    '/getReportById/:report_id', 
    authMiddleware.auth,
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    reportMaster.getReportById
);
router.get(
    '/getAllActiveReport', 
    authMiddleware.auth,
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    reportMaster.getAllActiveReport
);
router.put(
    '/updateReport/:report_id', 
    authMiddleware.auth,
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    reportMaster.updateReport
);
router.post(
    '/pdfReport', 
    authMiddleware.auth,
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    reportMaster.reportForPDF
);
router.put(
    '/deleteReport/:report_id', 
    authMiddleware.auth,
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    reportMaster.deleteReport
);
router.get(
    '/getPdfReportByBothId/:formId/:reportId', 
    authMiddleware.auth,
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    reportMaster.getPdfReportByBothId
);
router.post(
    '/replaceQuestion/:respId/:formId', 
    authMiddleware.auth,
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    reportMaster.replaceQuestion
);

module.exports = router;
