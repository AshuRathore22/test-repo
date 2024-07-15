const express = require('express');

const authMiddleware = require('../middleware/auth');
const organizationStatus = require('../middleware/organizationStatus');
const subscriptionEnd = require('../middleware/subscriptionEnd');
const userController = require('../controllers/users');
const upload = require('../middleware/multer')
const router = express.Router();

//################################ Mobile User APIs ################################//
router.post('/login', 
    // subscriptionEnd.checkSubscription, 
    // organizationStatus.checkOrganizationStatus, 
    userController.setUser
);
router.post('/set-user-password', 
    authMiddleware.auth, 
    // subscriptionEnd.checkSubscription, 
    // organizationStatus.checkOrganizationStatus, 
    userController.setUserPassword
)
router.post('/verify-otp', 
    authMiddleware.auth, 
    // subscriptionEnd.checkSubscription, 
    // organizationStatus.checkOrganizationStatus, 
    userController.checkOTP
);
router.post('/login-by-password', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.loginByPassword
);
router.get('/forget-password-send-otp', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.forgetPasswordSendOTP
);
router.post('/forget-password-verify-otp', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.verifyForgetPasswordOTP
);
router.put('/update-new-password', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.updateNewPassword
);
router.patch('/set-profile', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.setUserProfile
);
router.get('/get-profile', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.getUserProfile
);
router.put('/update-profile', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    upload.single('profilePic'), 
    userController.updateUserProfile
);
// updating user's team
router.put('/update-teams', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.updateUsersForTeams
);
// router.put('/delete-User', authMiddleware.auth, userController.deleteUser)
//all devices//
router.get('/get-user/:id', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.getUser
);
router.put('/delete-User', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.deleteUser
)
router.put('/change-password', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.changeUserPassword
);
router.post('/send-otp-forget-password',
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.checkMobileForForgetPassword
);
router.post('/check-otp-forget-password', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.checkOTPForForgetPassword
);
router.post('/update-password', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus, 
    userController.updateUserForgetPassword
);
router.get('/admin/users-autocomplete', 
    authMiddleware.auth, 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    userController.usersAutocomplete
);
router.get('/renew-access-token', 
    userController.renewToken
);

//################################ Admin User APIs ################################//
router.post('/login-admin', 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    userController.adminLogin
);
router.post('/forgot-password-check-user', 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    userController.adminForgotPasswordCheckUser
);
router.post('/forgot-password-check-otp', 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    userController.adminForgotPasswordCheckOtp
);
router.put('/forgot-password-reset', 
    subscriptionEnd.checkSubscription, 
    organizationStatus.checkOrganizationStatus,
    userController.adminResetPassword
);

// router.get('/accountactivity', userController.get);


module.exports = router;
