const express = require("express");
const multer = require("multer");

const authMiddleware = require("../middleware/auth");
const organizationStatus = require('../middleware/organizationStatus');
const subscriptionEnd = require('../middleware/subscriptionEnd');
const checkMaxUser = require('../middleware/checkMaxUser');
const orgController = require("../controllers/organization");

const router = express.Router();

// Helper methods ///////////////////////////////////////////////////////////////////
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, +new Date() + "-" + file.originalname);
  },
});

const filterType = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

// All routes here /////////////////////////////////////////////////////////////
router.post(
  "/add-organization",
  authMiddleware.auth,
  // subscriptionEnd.checkSubscription, 
  // organizationStatus.checkOrganizationStatus,
  multer({
    storage: fileStorage,
    fileFilter: filterType,
  }).single("logo_image"),
  orgController.createNewOrganization
);
router.get(
  "/get-organization/:org_id", 
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, 
  orgController.fetchOrganizationById
);
router.get(
  "/get-all-organizations", 
authMiddleware.auth, 
orgController.fetchAllOrganization);
router.put(
  "/update-organization/:org_id",
  authMiddleware.auth, organizationStatus.checkOrganizationStatus, 
  multer({
    storage: fileStorage,
    fileFilter: filterType,
  }).single("logo_image"),
  orgController.updateOrganizationById
);
router.put(
  "/change-status-organization/:org_id", 
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, 
  orgController.changeStatusOrganizationById);
router.post(
  "/add-owner", 
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, 
  checkMaxUser.checkUserLimit, 
  orgController.addOwnersToOrganization);
router.put("/update-owner/:id", authMiddleware.auth, orgController.updateOwnerToOrganisation);
router.get("/get-owner/:id", authMiddleware.auth, organizationStatus.checkOrganizationStatus, orgController.getOwnerById);
router.get(
  "/get-all-owner/:org_id", 
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, 
  orgController.getAllOwner
);
router.put(
  "/admin/delete-owner/:orgId", 
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, 
  orgController.deleteOwner
);
router.put(
  "/admin/delete-auditor/:orgId", 
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, 
  orgController.deleteAuditor
);
router.post(
  "/invite-collaborator",
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, 
  orgController.inviteCollaborator
);
router.get(
  '/admin/get-audience/:orgId', 
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, 
  orgController.getAudience
);
router.post(
  '/admin/add-device-in-team',
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, checkMaxUser.checkUserLimit, 
  orgController.addDeviceInTeam
);
router.get(
  '/admin/team-invitations/:orgId',
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, 
  orgController.getInvitations
);
router.put(
  '/admin/delete-team-invitations/:orgId',
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, 
  orgController.deleteInvitations
);
//Org Userwise
router.get(
  "/admin/get-all-org-user", 
  authMiddleware.auth, 
  organizationStatus.checkOrganizationStatus, 
  orgController.getAllOrganizationUserWise
);
router.put(
  "/admin/update/featureByOrg_id/:org_id", 
  authMiddleware.auth, 
  subscriptionEnd.checkSubscription, 
  organizationStatus.checkOrganizationStatus, 
  orgController.updateFeaturesByOrg_id
);

module.exports = router;



// const option = {
//   method : 'GET', 
//   url : 'https://e5e4-60-254-111-142.ngrok-free.app/organization/get-all-organizations', 
//   headers : {
//     'Content-Type': 'application/json',
//     "ngrok-skip-browser-warning": "69420",
//   }
// }
// const response = await axios(option);
// // console.log(response.data); return

// const allOrgData = response.data