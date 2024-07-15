const express = require('express');

const authMiddleware = require('../middleware/auth');
const userController = require('../controllers/users');
const upload = require('../middleware/multer')
const router = express.Router();

//################################ Mobile User APIs ################################//
router.post('/login', userController.setUser);
router.post('/set-user-password', authMiddleware.auth, userController.setUserPassword)
router.post('/verify-otp', authMiddleware.auth, userController.checkOTP);
router.post('/login-by-password', authMiddleware.auth, userController.loginByPassword);
router.get('/forget-password-send-otp', authMiddleware.auth, userController.forgetPasswordSendOTP);
router.post('/forget-password-verify-otp', authMiddleware.auth, userController.verifyForgetPasswordOTP);
router.put('/update-new-password', authMiddleware.auth, userController.updateNewPassword);

router.patch('/set-profile', authMiddleware.auth, userController.setUserProfile);
router.get('/get-profile', authMiddleware.auth, userController.getUserProfile);
router.put('/update-profile', authMiddleware.auth,upload.single('profilePic'),userController.updateUserProfile);

// updating user's team
router.put('/update-teams', authMiddleware.auth, userController.updateUsersForTeams);
// router.put('/delete-User', authMiddleware.auth, userController.deleteUser)
//all devices//
router.get('/get-user/:id', authMiddleware.auth, userController.getUser);
router.put('/delete-User', authMiddleware.auth, userController.deleteUser)
router.delete('/delete-user-permanent', authMiddleware.auth, userController.deletePermanentUser)

router.put('/change-password', authMiddleware.auth, userController.changeUserPassword);
router.post('/send-otp-forget-password', userController.checkMobileForForgetPassword);
router.post('/check-otp-forget-password', authMiddleware.auth, userController.checkOTPForForgetPassword);
router.post('/update-password', authMiddleware.auth, userController.updateUserForgetPassword);
router.get('/admin/users-autocomplete', authMiddleware.auth, userController.usersAutocomplete);
router.get('/renew-access-token', userController.renewToken);

//################################ Admin User APIs ################################//
router.post('/login-admin', userController.adminLogin);
router.post('/forgot-password-check-user', userController.adminForgotPasswordCheckUser);
router.post('/forgot-password-check-otp', userController.adminForgotPasswordCheckOtp);
router.put('/forgot-password-reset', userController.adminResetPassword);

// router.get('/accountactivity', userController.get);


module.exports = router;