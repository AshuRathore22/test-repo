const express = require("express");
const multer = require("multer");

const authMiddleware = require("../middleware/auth");
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
  multer({
    storage: fileStorage,
    fileFilter: filterType,
  }).single("logo_image"),
  orgController.createNewOrganization
);
router.get("/get-organization/:org_id", authMiddleware.auth, orgController.fetchOrganizationById);
router.get("/get-all-organizations", authMiddleware.auth, orgController.fetchAllOrganization);
router.put(
  "/update-organization/:org_id",
  authMiddleware.auth,
  multer({
    storage: fileStorage,
    fileFilter: filterType,
  }).single("logo_image"),
  orgController.updateOrganizationById
);
router.put("/change-status-organization/:org_id", authMiddleware.auth, orgController.changeStatusOrganizationById);
router.post("/add-owner", authMiddleware.auth, orgController.addOwnersToOrganization);
router.put("/update-owner/:id", authMiddleware.auth, orgController.updateOwnerToOrganisation);
router.get("/get-owner/:id", authMiddleware.auth, orgController.getOwnerById);
router.get("/get-all-owner/:org_id", authMiddleware.auth, orgController.getAllOwner);
router.put("/admin/delete-owner/:orgId", authMiddleware.auth, orgController.deleteOwner);
router.put("/admin/delete-auditor/:orgId", authMiddleware.auth, orgController.deleteAuditor);
router.post("/invite-collaborator",authMiddleware.auth, orgController.inviteCollaborator);
router.get('/admin/get-audience/:orgId', authMiddleware.auth, orgController.getAudience);
router.post('/admin/add-device-in-team',authMiddleware.auth, orgController.addDeviceInTeam);
router.get('/admin/team-invitations/:orgId',authMiddleware.auth, orgController.getInvitations);
router.put('/admin/delete-team-invitations/:orgId',authMiddleware.auth, orgController.deleteInvitations);
//Org Userwise
router.get("/admin/get-all-org-user", authMiddleware.auth, orgController.getAllOrganizationUserWise);
module.exports = router;
