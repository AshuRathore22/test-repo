const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/config");
const error_code = require("../config/error-code");
const nodemailer = require("../config/email.config");
const mailContent = require("../middleware/emailcontent");
const mongoose = require("mongoose");
//var request = require('request');
const User = require("../models/users");
var request = require("request");
const organization = require("../models/organization");

//################################ Mobile User APIs ################################//

// Set user and send otp ////////////////////////////////////////////////////////////
// exports.setUser = async (req, res, next) => {
//   const response = {
//     status: 0,
//     error_code: 0,
//     body: {
//       is_new_user: 1,
//       login_token: ""
//     }
//   }
//   try {
//     if (!req.body.countryCode || req.body.countryCode == "") {
//       const err = new Error("Please select country code");
//       err.statusCode = 400;
//       throw err;
//     }
//     if (!req.body.mobile || req.body.mobile == "") {
//       const err = new Error("Please enter mobile number");
//       err.statusCode = 400;
//       throw err;
//     }
//     if (req.body.mobile.length > 16 || req.body.mobile.length < 7) {
//       const err = new Error("Invalid mobile number");
//       err.statusCode = 400;
//       throw err;
//     }

//     const mobileCheck = await User.findOne({
//       mobile: req.body.mobile,
//       countryCode: req.body.countryCode
//     });
//     if (mobileCheck) {
//       if (req.body.password && req.body.password?.trim() !== "") {
//         if (!mobileCheck.password) {
//           const error = new Error('Password not set, please try login with OTP');
//           error.statusCode = 401;
//           throw error;
//         }
//         const isEqual = await bcrypt.compare(req.body.password, mobileCheck.password);
//         if (!isEqual) {
//           const error = new Error('Wrong password!');
//           error.statusCode = 401;
//           throw error;
//         }
//         const dataToEncode = {
//           userId: mobileCheck._id.toString(),
//           // mobile: mobileCheck.mobile,
//           role: mobileCheck.role,
//           is_new_user: false
//         };

//         res.status(200).json({
//           message: "Login successfully",
//           accessToken: generateToken(dataToEncode, 'access'),
//           refreshToken: generateToken(dataToEncode, 'refresh')
//         });

//       } else {
//         if (req.body.password?.trim() === "") {
//           const error = new Error('Password not set, please try login with OTP');
//           error.statusCode = 401;
//           throw error;
//         }
//
//         const dataToEncode = {
//           mobile: mobileCheck.mobile,
//           countryCode: mobileCheck.countryCode,
//           role: mobileCheck.role,
//           is_new_user: false
//         };
//         dataToEncode.otp = "1234";
//         dataToEncode.isVerified = true;

//         res.status(200).json({
//           message: "OTP sent successfully",
//           token: generateToken(dataToEncode, 'access'),
//         });
//       }

//     } else {
//       if (req.body.password) {
//         const error = new Error('Password not set, please try login with OTP');
//         error.statusCode = 401;
//         throw error;
//       }
//       if (req.body.password?.trim() === "") {
//         const error = new Error('Password not set, please try login with OTP');
//         error.statusCode = 401;
//         throw error;
//       }
//       req.body.role = "1";
//       const userData = await new User(req.body).save();
//       if (!userData) {
//         const err = new Error("Unable to add user");
//         err.statusCode = 500;
//         throw err;
//       }
//
//       const dataToEncode = {
//         // userId: userData._id.toString(),
//         mobile: userData.mobile,
//         countryCode: userData.countryCode,
//         role: userData.role,
//         is_new_user: true
//       };
//       dataToEncode.otp = "1234";
//       dataToEncode.isVerified = true;

//       res.status(200).json({
//         message: "OTP sent successfully",
//         token: generateToken(dataToEncode, 'access'),
//       });
//     }
//   } catch (err) {
//     console.error(err);
//     response.error_code = 1;
//     delete response.body;
//     next(response);
//   }
// };

exports.setUser = async (req, res, next) => {
  try {
    if (!req.body.countryCode || req.body.countryCode == "") {
      const err = new Error(error_code.COUNTRY_CODE_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.mobile || req.body.mobile == "") {
      const err = new Error(error_code.PHONE_NOT_fOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (req.body.mobile.length > 16 || req.body.mobile.length < 7) {
      const err = new Error(error_code.INVALID_PHONE.CODE);
      err.statusCode = 0;
      throw err;
    }

    const mobileCheck = await User.findOne({
      mobile: req.body.mobile,
      countryCode: req.body.countryCode,
    });

    if (mobileCheck) {
      const deviceData = getDataFromHeader(mobileCheck.deviceData, req);
      const updateUser = await User.updateOne(
        { _id: mobileCheck._id },
        {
          deviceData: deviceData,
          // isPhoneVerified: false,
          updatedAt: Date.now(),
        }
      );
      if (!updateUser) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }

      const dataToEncode = {
        userid: mobileCheck._id,
        appbuildversion: "1.0.0",
        ipaddress: deviceData.ip,
        lastlogintime: Date.now(),
      };

      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        body: {
          is_new_user: mobileCheck.isPhoneVerified ? 0 : 1,
          login_token: generateToken(dataToEncode, "access"),
        },
      });
    } else {
      const deviceData = getDataFromHeader({}, req);

      const setNewUser = await new User({
        mobile: req.body.mobile,
        countryCode: req.body.countryCode,
        isPhoneVerified: false,
        deviceData: deviceData,
      }).save();
      if (!setNewUser) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }

      const dataToEncode = {
        userid: setNewUser._id,
        appbuildversion: "1.0.0",
        ipaddress: deviceData.ip,
        lastlogintime: Date.now(),
      };

      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        body: {
          is_new_user: setNewUser.isPhoneVerified ? 0 : 1,
          login_token: generateToken(dataToEncode, "access"),
        },
      });
    }
  } catch (err) {
    console.error(err);
    next(err);
  }
};

// Set password API /////////////////////////////////////////////////////////////////
exports.setUserPassword = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.name || req.body.name?.trim() == "") {
      const err = new Error(error_code.NAME_NOT_fOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.password || req.body.password == "") {
      const err = new Error(error_code.PASSWORD_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (req.body.password.length < 6) {
      const err = new Error(error_code.SHORT_PASSWORD.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await User.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    const deviceData = getDataFromHeader(checkValidUser.deviceData, req);
    const updateUser = await User.updateOne(
      { _id: checkValidUser._id },
      {
        name: req.body.name,
        password: hashedPassword,
        deviceData: deviceData,
        updatedAt: Date.now(),
      }
    );
    if (!updateUser) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    // let OTPMobile = Math.floor(1000 + Math.random() * 9000).toString();
    // let authUsername = config.ACCOUNT_ID;
    // let authPassword = config.AUTH_TOKEN;
    // var auth = 'Basic ' + Buffer.from(authUsername + ':' + authPassword).toString('base64');
    // var options = {
    //   'method': 'POST',
    //   'url': config.TWILLIO_URL,
    //   'headers': {
    //     'Authorization': auth,
    //     'Content-Type': 'application/x-www-form-urlencoded'
    //   },
    //   form: {
    //     'From': '+15673721184',
    //     'To': '+919479555899',
    //     'Body': 'OTP for Zccrue is: ' + OTPMobile
    //   }
    // };

    // request(options, function (error, response) {
    //   if (error) throw new Error(error);
    // });

    const dataToEncode = {
      userid: checkValidUser._id,
      appbuildversion: req.sessionUserData.appbuildversion,
      ipaddress: deviceData.ip,
      lastlogintime: req.sessionUserData.lastlogintime,
      otp: "1234",
      //otp: OTPMobile
    };
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: {
        login_token: generateToken(dataToEncode, "access"),
      },
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

// Verify otp API ///////////////////////////////////////////////////////////////////
exports.checkOTP = async (req, res, next) => {
  try {
    console.log(req.sessionUserData.otp, req.body.otp);
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.otp || req.body.otp == "") {
      const err = new Error(error_code.OTP_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await User.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (req.sessionUserData.otp !== req.body.otp) {
      const err = new Error(error_code.OTP_NOT_MATCH.CODE);
      err.statusCode = 0;
      throw err;
    }
    const deviceData = getDataFromHeader(checkValidUser.deviceData, req);
    const updateUser = await User.updateOne(
      { _id: checkValidUser._id },
      {
        deviceData: deviceData,
        isPhoneVerified: true,
        updatedAt: Date.now(),
        "permissions.$[].invitationStatus": "Accepted",
      }
    );
    if (!updateUser) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const dataToEncodeAuth = {
      userid: checkValidUser._id,
      appbuildversion: req.sessionUserData.appbuildversion,
      ipaddress: deviceData.ip,
      lastlogintime: req.sessionUserData.lastlogintime,
      name: checkValidUser.name,
      mobile: checkValidUser.mobile,
      email: checkValidUser.email ? checkValidUser.email : "",
    };

    const dataToEncodeRefresh = {
      userid: req.sessionUserData.userid,
    };

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: {
        auth_token: generateToken(dataToEncodeAuth, "access"),
        refresh_token: generateToken(dataToEncodeRefresh, "refresh"),
        name: checkValidUser.name,
        mobile: checkValidUser.mobile,
        email: checkValidUser.email ? checkValidUser.email : "",
      },
    });
  } catch (err) {
    // if (!err.statusCode) {
    //   err.statusCode = 500;
    // }
    next(err);
  }
};

// Login user by password ///////////////////////////////////////////////////////////////////
exports.loginByPassword = async (req, res, next) => {
  try {
    if (!req.body.password || req.body.password == "") {
      const err = new Error(error_code.PASSWORD_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await User.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!checkValidUser.isPhoneVerified) {
      const err = new Error(error_code.MOBILE_NOT_VARIFIED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isEqual = await bcrypt.compare(
      req.body.password,
      checkValidUser.password
    );

    if (!isEqual) {
      const error = new Error(error_code.WRONG_PASSWORD.CODE);
      error.statusCode = 0;
      throw error;
    }

    const deviceData = getDataFromHeader(checkValidUser.deviceData, req);
    const updateUser = await User.updateOne(
      { _id: checkValidUser._id },
      { deviceData: deviceData }
    );
    if (!updateUser) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const dataToEncodeAuth = {
      userid: checkValidUser._id,
      appbuildversion: req.sessionUserData.appbuildversion,
      ipaddress: deviceData.ip,
      lastlogintime: req.sessionUserData.lastlogintime,
      name: checkValidUser.name,
      mobile: checkValidUser.mobile,
      email: checkValidUser.email ? checkValidUser.email : "",
    };
    const dataToEncodeRefresh = {
      userid: req.sessionUserData.userid,
    };
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: {
        auth_token: generateToken(dataToEncodeAuth, "access"),
        refresh_token: generateToken(dataToEncodeRefresh, "refresh"),
        name: checkValidUser.name,
        mobile: checkValidUser.mobile,
        email: checkValidUser.email ? checkValidUser.email : "",
      },
    });
  } catch (err) {
    next(err);
  }
};

// Forget password send otp ///////////////////////////////////////////////////////////////////
exports.forgetPasswordSendOTP = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await User.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!checkValidUser.isPhoneVerified) {
      const err = new Error(error_code.MOBILE_NOT_VARIFIED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const deviceData = getDataFromHeader(checkValidUser.deviceData, req);
    const updateUser = await User.updateOne(
      { _id: checkValidUser._id },
      {
        deviceData: deviceData,
        updatedAt: Date.now(),
      }
    );
    if (!updateUser) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const dataToEncodeAuth = {
      userid: checkValidUser._id,
      appbuildversion: req.sessionUserData.appbuildversion,
      ipaddress: deviceData.ip,
      lastlogintime: req.sessionUserData.lastlogintime,
      forgetPasswordOtp: "1234",
    };
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: {
        forgetPasswordToken: generateToken(dataToEncodeAuth, "access"),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Verify forget password otp ///////////////////////////////////////////////////////////////////
exports.verifyForgetPasswordOTP = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await User.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!checkValidUser.isPhoneVerified) {
      const err = new Error(error_code.MOBILE_NOT_VARIFIED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.otp || req.body.otp?.trim() == "") {
      const err = new Error(error_code.OTP_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (req.body.otp !== req.sessionUserData.forgetPasswordOtp) {
      const err = new Error(error_code.OTP_NOT_MATCH.CODE);
      err.statusCode = 0;
      throw err;
    }

    const deviceData = getDataFromHeader(checkValidUser.deviceData, req);
    const updateUser = await User.updateOne(
      { _id: checkValidUser._id },
      {
        deviceData: deviceData,
        updatedAt: Date.now(),
      }
    );
    if (!updateUser) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const dataToEncodeAuth = {
      userid: checkValidUser._id,
      appbuildversion: req.sessionUserData.appbuildversion,
      ipaddress: deviceData.ip,
      lastlogintime: req.sessionUserData.lastlogintime,
      isVerified: 1,
    };
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: {
        forgetPasswordToken: generateToken(dataToEncodeAuth, "access"),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Add new password ///////////////////////////////////////////////////////////////////
exports.updateNewPassword = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.sessionUserData.isVerified) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await User.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!checkValidUser.isPhoneVerified) {
      const err = new Error(error_code.MOBILE_NOT_VARIFIED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.newPassword || req.body.newPassword == "") {
      const err = new Error(error_code.PASSWORD_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (req.body.newPassword.length < 6) {
      const err = new Error(error_code.SHORT_PASSWORD.CODE);
      err.statusCode = 0;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 12);
    const deviceData = getDataFromHeader(checkValidUser.deviceData, req);
    const updateUser = await User.updateOne(
      { _id: checkValidUser._id },
      {
        deviceData: deviceData,
        password: hashedPassword,
        updatedAt: Date.now(),
      }
    );
    if (!updateUser) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    // const dataToEncodeAuth = {
    //   userid: checkValidUser._id,
    //   appbuildversion: req.sessionUserData.appbuildversion,
    //   ipaddress: deviceData.ip,
    //   lastlogintime: req.sessionUserData.lastlogintime
    // };
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      // body: {
      //   forgetPasswordToken: generateToken(dataToEncodeAuth, 'access')
      // }
    });
  } catch (err) {
    next(err);
  }
};

// Set user profile //////////////////////////////////////////////////////////////////
exports.setUserProfile = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error("Not Authenticated");
      err.statusCode = 401;
      throw err;
    }

    if (!req.body.firstname?.trim() || req.body.firstname?.trim() == "") {
      const err = new Error("Please enter firstname");
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.lastname?.trim() || req.body.lastname?.trim() == "") {
      const err = new Error("Please enter lastname");
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.email?.trim() || req.body.email?.trim() == "") {
      const err = new Error("Please enter email address");
      err.statusCode = 400;
      throw err;
    }
    req.body.email = req.body.email.toLowerCase();
    if (!config.EMAIL_REGEXP.test(req.body.email)) {
      const err = new Error("Invalid email address");
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.password || req.body.password == "") {
      const err = new Error("Please enter password");
      err.statusCode = 400;
      throw err;
    }
    req.body.updatedAt = Date.now();
    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const updateUserData = await User.updateOne(
      { _id: req.sessionUserData.userid },
      {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        password: hashedPassword,
      }
    );
    // console.log(updateUserData);
    if (!updateUserData) {
      const err = new Error("Unable to set profile");
      err.statusCode = 500;
      throw err;
    }
    res.status(200).json({
      message: "Profile set successfully",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Get user profile data /////////////////////////////////////////////////////////
exports.getUserProfile = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error("Not Authenticated");
      err.statusCode = 401;
      throw err;
    }

    const getUserData = await User.findById(req.sessionUserData.userid).select(
      "name email mobile role countryCode deviceData profilePic"
    );
    //hello
    if (!getUserData) {
      const err = new Error("Unable to get profile");
      err.statusCode = 500;
      throw err;
    }
    res.status(200).json({
      message: "Profile fetched successfully",
      data: getUserData,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

//// assign to team///
exports.getUser = async (req, res, next) => {
  console.log(req.body, req.params);

  const result = await User.find({ _id: req.params.id }).populate({
    path: "permissions",
    populate: { path: "teamId" },
  });

  console.log(result);
  res.send({ data: result });
};

exports.deleteUser = async (req, res, next) => {
  console.log(req.body, "thiss");

  console.log("NOT TEAMID");

  const UpdateUser = [];
  for (let i = 0; i < req.body.userId.length; i++) {
    UpdateUser.push(
      await User.update(
        {
          _id: mongoose.Types.ObjectId(req.body.userId[i]),
          permissions: {
            $elemMatch: {
              teamId: mongoose.Types.ObjectId(req.body.teamId),
            },
          },
        },
        {
          $pull: {
            permissions: {
              teamId: mongoose.Types.ObjectId(req.body.teamId),
            },
          },
        }
      )
    );
  }
  const isUpdated = await Promise.all(UpdateUser);

  if (!isUpdated) {
    const err = new Error(error_code.UNKNOWN_ERROR.CODE);
    err.statusCode = 0;
    throw err;
  }
  res.status(200).json({
    status: 1,
    error_code: error_code.NONE.CODE,
    data: UpdateUser,
  });
};

// Update user profile ///////////////////////////////////////////////////////////
exports.updateUserProfile = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const userAllData = await User.findById(req.sessionUserData.userid);
    if (!userAllData) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!userAllData.isPhoneVerified) {
      const err = new Error(error_code.MOBILE_NOT_VARIFIED.CODE);
      err.statusCode = 0;
      throw err;
    }
    // console.log(userAllData);
    const userDataToUpdate = {};
    const deviceData = userAllData ? userAllData.deviceData : {};
    // let isUpdate = false;
    // console.log(deviceData);

    if (!req.body.name || req.body.name?.trim() == "") {
      const err = new Error(error_code.NAME_NOT_fOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    userDataToUpdate.name = req.body.name;

    // update profilepic
    if (req.file) {
      let profilePic = req.file.path;
      userDataToUpdate.profilePic = profilePic;
    }

    if (req.body.email && req.body.email?.trim() !== "") {
      req.body.email = req.body.email.toLowerCase();
      if (!config.EMAIL_REGEXP.test(req.body.email)) {
        const err = new Error(error_code.INVALID_EMAIL.CODE);
        err.statusCode = 0;
        throw err;
      }
      userDataToUpdate.email = req.body.email;
    }

    // if (!isUpdate) {
    //   const err = new Error("Nothing to update");
    //   err.statusCode = 400;
    //   throw err;
    // }

    userDataToUpdate.deviceData = getDataFromHeader(
      userAllData.deviceData,
      req
    );
    userDataToUpdate.updatedAt = Date.now();

    const updateUserData = await User.updateOne(
      { _id: req.sessionUserData.userid },
      userDataToUpdate,
      { runValidators: true }
    );
    // console.log(updateUserData);
    if (!updateUserData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    const userUpdatedData = await User.findById(req.sessionUserData.userid);
    if (!userUpdatedData) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (req.file) {
      dataToEncodeAuth = {
        userid: userUpdatedData._id,
        appbuildversion: req.sessionUserData.appbuildversion,
        ipaddress: deviceData.ip,
        lastlogintime: req.sessionUserData.lastlogintime,
        name: userUpdatedData.name,
        mobile: userUpdatedData.mobile,
        email: userUpdatedData.email ? userUpdatedData.email : "",
        profilepic: userUpdatedData.profilepic,
      };
    } else {
      dataToEncodeAuth = {
        userid: userUpdatedData._id,
        appbuildversion: req.sessionUserData.appbuildversion,
        ipaddress: deviceData.ip,
        lastlogintime: req.sessionUserData.lastlogintime,
        name: userUpdatedData.name,
        mobile: userUpdatedData.mobile,
        email: userUpdatedData.email ? userUpdatedData.email : "",
      };
    }

    const dataToEncodeRefresh = {
      userid: userUpdatedData._id,
    };
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: {
        auth_token: generateToken(dataToEncodeAuth, "access"),
        refresh_token: generateToken(dataToEncodeRefresh, "refresh"),
        name: userUpdatedData.name,
        mobile: userUpdatedData.mobile,
        email: userUpdatedData.email ? userUpdatedData.email : "",
      },
    });
  } catch (err) {
    // if (!err.statusCode) {
    //   err.statusCode = 500;
    // }
    next(err);
  }
};

///////////Teams Managers///////////
exports.updateUsersForTeams = async (req, res, next) => {
  try {
    if (!req.body.orgId || !req.body.teamId || !req.body.userId) {
    return res.send({ err: "error", status: 0 });
    }
    let resultArr = [];
    if (req.body.userId.length) {
      // for (let user of req.body.userId) {
        const query = {
          _id: req.body.userId,
          "permissions.teamId": {
            $ne: mongoose.Types.ObjectId("643d3fe3fb8827dfbda05e6a"),
          },
        };
        const toInsert = {
          invitationStatus: "Pending",
          organizationId: req.body.orgId,
          teamId: req.body.teamId,
          type: req.body.type,
          // teamsID
        };
  
        const updateDoc = {
          $push: { permissions: toInsert },
        };
        resultArr.push(await User.updateOne(query, updateDoc));
      // }
    }
    const promiseResolved = await Promise.all(resultArr);
    if (promiseResolved) {
      return res.status(200).json({
        status: 1,
        message: "Inserted successfully.",
      });
    } else {
      return res.status(500).json({
        status: 0,
        error: "something went wrong",
      });
    }
  } catch (error) {
    console.log(error)
  }
 
};


// exports.updateUserProfile = async (req, res, next) => {
//   try {
//     if (!req.isAuth) {
//       const err = new Error("Not Authenticated");
//       err.statusCode = 401;
//       throw err;
//     }

//     const allUserData = await User.findById(req.sessionUserData.userId);
//     if (!allUserData) {
//       const err = new Error("User not found");
//       err.statusCode = 404;
//       throw err;
//     }
//     console.log(allUserData);
//     const userDataToUpdate = {};
//     const deviceData = allUserData ? allUserData.deviceData : {};
//     let isUpdate = false;
//     // console.log(deviceData);

//     if (req.body.firstname && req.body.firstname?.trim() !== "") {
//       userDataToUpdate.firstname = req.body.firstname;
//       isUpdate = true;
//     }

//     if (req.body.lastname && req.body.lastname?.trim() !== "") {
//       userDataToUpdate.lastname = req.body.lastname;
//       isUpdate = true;
//     }

//     if (req.body.email && req.body.email?.trim() !== "") {
//       req.body.email = req.body.email.toLowerCase();
//       if (!config.EMAIL_REGEXP.test(req.body.email)) {
//         const err = new Error("Invalid email address");
//         err.statusCode = 400;
//         throw err;
//       }
//       userDataToUpdate.email = req.body.email;
//       isUpdate = true;
//     }

//     if (req.get("ip") && req.get("ip")?.trim() !== "") {
//       deviceData.ip = req.get("ip");
//       isUpdate = true;
//     }
//     if (req.get("androidVersion") && req.get("androidVersion")?.trim() !== "") {
//       deviceData.androidVersion = req.get("androidVersion");
//       isUpdate = true;
//     }
//     if (req.get("appVersion") && req.get("appVersion")?.trim() !== "") {
//       deviceData.appVersion = req.get("appVersion");
//       isUpdate = true;
//     }
//     if (req.get("batteryLevel") && req.get("batteryLevel")?.trim() !== "") {
//       deviceData.batteryLevel = req.get("batteryLevel");
//       isUpdate = true;
//     }
//     if (req.get("brand") && req.get("brand")?.trim() !== "") {
//       deviceData.brand = req.get("brand");
//       isUpdate = true;
//     }
//     if (req.get("carrierAvailable") && req.get("carrierAvailable")?.trim() !== "") {
//       deviceData.carrierAvailable = req.get("carrierAvailable");
//       isUpdate = true;
//     }
//     if (req.get("hardware") && req.get("hardware")?.trim() !== "") {
//       deviceData.hardware = req.get("hardware");
//       isUpdate = true;
//     }
//     if (req.get("isRooted") && req.get("isRooted")?.trim() !== "") {
//       deviceData.isRooted = req.get("isRooted");
//       isUpdate = true;
//     }
//     if (req.get("lastFormDiffUpdatedAt") && req.get("lastFormDiffUpdatedAt")?.trim() !== "") {
//       deviceData.lastFormDiffUpdatedAt = req.get("lastFormDiffUpdatedAt");
//       isUpdate = true;
//     }
//     if (req.get("lastVersionCode") && req.get("lastVersionCode")?.trim() !== "") {
//       deviceData.lastVersionCode = req.get("lastVersionCode");
//       isUpdate = true;
//     }
//     if (req.get("model") && req.get("model")?.trim() !== "") {
//       deviceData.model = req.get("model");
//       isUpdate = true;
//     }
//     if (req.get("networkConnected") && req.get("networkConnected")?.trim() !== "") {
//       deviceData.networkConnected = req.get("networkConnected");
//       isUpdate = true;
//     }
//     if (req.get("product") && req.get("product")?.trim() !== "") {
//       deviceData.product = req.get("product");
//       isUpdate = true;
//     }
//     if (req.get("sdkVersion") && req.get("sdkVersion")?.trim() !== "") {
//       deviceData.sdkVersion = req.get("sdkVersion");
//       isUpdate = true;
//     }
//     if (req.get("totalRam") && req.get("totalRam")?.trim() !== "") {
//       deviceData.totalRam = req.get("totalRam");
//       isUpdate = true;
//     }

//     if (!isUpdate) {
//       const err = new Error("Nothing to update");
//       err.statusCode = 400;
//       throw err;
//     }

//     userDataToUpdate.deviceData = deviceData;
//     userDataToUpdate.updatedAt = Date.now();
//     // console.log(userDataToUpdate, "here");

//     const updateUserData = await User.updateOne({_id: req.sessionUserData.userId}, userDataToUpdate, { runValidators: true });
//     // console.log(updateUserData);
//     if (!updateUserData) {
//       const err = new Error("Unable to update profile");
//       err.statusCode = 500;
//       throw err;
//     }
//     res.status(200).json({
//       message: "Profile updated successfully"
//     });
//   } catch (err) {
//     if (!err.statusCode) {
//       err.statusCode = 500;
//     }
//     next(err);
//   }
// };

// Change user password ///////////////////////////////////////////////////////////////

exports.changeUserPassword = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error("Not Authenticated");
      err.statusCode = 401;
      throw err;
    }

    if (!req.body.oldPassword || req.body.oldPassword == "") {
      const err = new Error("Please enter old password");
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.newPassword || req.body.newPassword == "") {
      const err = new Error("Please enter new password");
      err.statusCode = 400;
      throw err;
    }

    const getUserData = await User.findById(req.sessionUserData.userid);
    if (!getUserData) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    const isEqual = await bcrypt.compare(
      req.body.oldPassword,
      getUserData.password
    );
    if (!isEqual) {
      const error = new Error("Wrong password!");
      error.statusCode = 401;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 12);
    const updateUserData = await User.updateOne(
      { _id: req.sessionUserData.userid },
      {
        password: hashedPassword,
        updatedAt: Date.now(),
      }
    );
    // console.log(updateUserData);
    res.status(200).json({
      status: 1,
      message: "Password changed successfully",
      // data: updateUserData
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Check mobile number exists for forget password /////////////////////////////////////////
exports.checkMobileForForgetPassword = async (req, res, next) => {
  try {
    if (!req.body.countryCode || req.body.countryCode == "") {
      const err = new Error("Please enter country code");
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.mobile || req.body.mobile == "") {
      const err = new Error("Please enter mobile number");
      err.statusCode = 400;
      throw err;
    }
    if (req.body.mobile.length > 16 || req.body.mobile.length < 7) {
      const err = new Error("Invalid mobile number");
      err.statusCode = 400;
      throw err;
    }

    const mobileCheck = await User.findOne({
      mobile: req.body.mobile,
      countryCode: req.body.countryCode,
    });
    if (!mobileCheck) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    // let OTPMobile = Math.floor(1000 + Math.random() * 9000);
    const dataToEncode = {
      // userId: mobileCheck._id.toString(),
      mobile: mobileCheck.mobile,
      countryCode: mobileCheck.countryCode,
      role: mobileCheck.role,
    };

    dataToEncode.otp = "1234";
    dataToEncode.isVerified = true;
    dataToEncode.otpMatched = false;
    res.status(200).json({
      message: "OTP sent successfully",
      token: generateToken(dataToEncode, "access"),
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Check otp for forget password ////////////////////////////////////////////////////////
exports.checkOTPForForgetPassword = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error("Not Authenticated");
      err.statusCode = 401;
      throw err;
    }

    if (
      !req.sessionUserData.countryCode ||
      req.sessionUserData.countryCode == ""
    ) {
      const err = new Error("Please enter country code");
      err.statusCode = 400;
      throw err;
    }
    if (!req.sessionUserData.mobile || req.sessionUserData.mobile == "") {
      const err = new Error("Please enter mobile number");
      err.statusCode = 400;
      throw err;
    }
    if (req.body.mobile.length > 16 || req.body.mobile.length < 7) {
      const err = new Error("Invalid mobile number");
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.otp || req.body.otp == "") {
      const err = new Error("Please enter OTP");
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await User.findOne({
      mobile: req.sessionUserData.mobile,
      countryCode: req.sessionUserData.countryCode,
    });
    if (!checkValidUser) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    if (req.sessionUserData.otp !== req.body.otp) {
      const err = new Error("OTP not matched");
      err.statusCode = 401;
      throw err;
    }
    const dataToEncode = {
      // userId: checkValidUser._id.toString(),
      mobile: checkValidUser.mobile,
      countryCode: checkValidUser.countryCode,
      role: checkValidUser.role,
    };
    dataToEncode.otpMatched = true;
    res.status(200).json({
      message: "OTP matched successfully",
      token: generateToken(dataToEncode, "access"),
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Update forget password ////////////////////////////////////////////////////////////////
exports.updateUserForgetPassword = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error("Not Authenticated");
      err.statusCode = 401;
      throw err;
    }

    if (!req.sessionUserData.otpMatched) {
      const err = new Error("Not Authenticated");
      err.statusCode = 401;
      throw err;
    }
    if (
      !req.sessionUserData.countryCode ||
      req.sessionUserData.countryCode == ""
    ) {
      const err = new Error("Please enter country code");
      err.statusCode = 400;
      throw err;
    }
    if (!req.sessionUserData.mobile || req.sessionUserData.mobile == "") {
      const err = new Error("Please enter mobile number");
      err.statusCode = 400;
      throw err;
    }
    if (req.body.mobile.length > 16 || req.body.mobile.length < 7) {
      const err = new Error("Invalid mobile number");
      err.statusCode = 400;
      throw err;
    }
    if (!req.body.newPassword || req.body.newPassword == "") {
      const err = new Error("Please enter new password");
      err.statusCode = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(req.body.newPassword, 12);
    const updateUserPassword = await User.findOneAndUpdate(
      {
        mobile: req.sessionUserData.mobile,
        countryCode: req.sessionUserData.countryCode,
      },
      {
        password: hashedPassword,
        updatedAt: Date.now(),
      }
    );
    if (!updateUserPassword) {
      const err = new Error("Unable to update password");
      err.statusCode = 500;
      throw err;
    }

    res.status(200).json({
      status: 1,
      message: "Password updated successfully",
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

// Renew token by refresh token ///////////////////////////////////////////////////////////
exports.renewToken = async (req, res, next) => {
  try {
    if (!req.header("x-auth-token")) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const decodedToken = jwt.verify(
      req.header("x-auth-token"),
      config.JWT_REFRESH_SECRET
    );
    if (!decodedToken) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await User.findById(decodedToken.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const dataToEncodeAuth = {
      userid: decodedToken.userid,
      appbuildversion: "1.0.0",
      ipaddress:
        req.headers["x-forwarded-for"] || req.socket.remoteAddress || null,
      lastlogintime: Date.now(),
      name: checkValidUser.name,
      mobile: checkValidUser.mobile,
      email: checkValidUser.email ? checkValidUser.email : "",
    };
    const dataToEncodeRefresh = {
      userid: decodedToken.userid,
    };
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: {
        auth_token: generateToken(dataToEncodeAuth, "access"),
      },
    });
  } catch (err) {
    console.log(err);
    // if (!err.statusCode) {
    //   err.statusCode = 500;
    // }
    next(err);
  }
};

//################################ Admin User APIs ################################//

// Login admin user ///////////////////////////////////////////////////////////////
exports.adminLogin = async (req, res, next) => {
  try {
    if (!req.body.email || req.body.email?.trim() == "") {
      const err = new Error(error_code.EMAIL_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    // req.body.email = req.body.email.toLowerCase();
    if (!config.EMAIL_REGEXP.test(req.body.email)) {
      const err = new Error(error_code.INVALID_EMAIL.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.password || req.body.password == "") {
      const err = new Error(error_code.PASSWORD_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    req.body.email = req.body.email.toLowerCase();
    const getUserData = await User.findOne({
      email: req.body.email,
      $or: [
        {
          isSuperAdmin: true,
        },
        {
          "permissions.status": 1,
        },
      ],
    })
    if (!getUserData) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isEqual = await bcrypt.compare(
      req.body.password,
      getUserData.password
    );
    if (!isEqual) {
      const error = new Error(error_code.WRONG_PASSWORD.CODE);
      error.statusCode = 0;
      throw error;
    }
    const resBody = {};
    const dataToEncodeAuth = {
      userid: getUserData._id,
      // appbuildversion: '1.0.0',
      // ipaddress: (req.headers['x-forwarded-for'] || '').split(',')[0] || req.connection.remoteAddress,
      lastlogintime: Date.now(),
      name: getUserData.name,
      mobile: getUserData.mobile,
      email: getUserData.email,
    };
    const userOrganizations = await organization.find({ created_by: getUserData._id }).select(["_id", "features"]);
    resBody.permissions = userOrganizations.map(org => ({
      organizationId: org._id,
      features: Object.fromEntries(Object.entries(org.features).filter(([key, value]) => value === true))
    }));

    if (getUserData.isSuperAdmin == true) {
      dataToEncodeAuth.role = "superadmin";
      resBody.role = "superadmin";
    } else {
      for (let role of getUserData.permissions) {
        if (role.type == "owner" && role.status == 1) {
          dataToEncodeAuth.role = "owner";
          resBody.role = "owner";
          resBody.orgId = role.organizationId;
          break;
        }
        if (role.type == "administrator" && role.status == 1) {
          dataToEncodeAuth.role = "administrator";
          resBody.role = "administrator";
          resBody.orgId = role.organizationId;
          break;
        }
        if (role.type == "manager" && role.status == 1) {
          dataToEncodeAuth.role = "manager";
          resBody.role = "manager";
          resBody.orgId = role.organizationId;
          break;
        }
        if (role.type == "member" && role.status == 1) {
          dataToEncodeAuth.role = "member";
          resBody.role = "member";
          resBody.orgId = role.organizationId;
          break;
        }
      }
    }

    const dataToEncodeRefresh = {
      userid: getUserData.userid,
    };

    (resBody.auth_token = generateToken(dataToEncodeAuth, "access")),
      (resBody.refresh_token = generateToken(dataToEncodeRefresh, "refresh")),
      (resBody.name = getUserData.name),
      (resBody.mobile = getUserData.mobile),
      (resBody.email = getUserData.email);
    resBody._id = getUserData._id;

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: resBody,
    });
  } catch (err) {
    next(err);
  }
};

exports.adminForgotPasswordCheckUser = async (req, res, next) => {
  try {
    if (!req.body.email || req.body.email?.trim() == "") {
      const err = new Error(error_code.EMAIL_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    req.body.email = req.body.email.toLowerCase();
    if (!config.EMAIL_REGEXP.test(req.body.email)) {
      const err = new Error(error_code.INVALID_EMAIL.CODE);
      err.statusCode = 0;
      throw err;
    }

    const getUserData = await User.findOne({
      email: req.body.email,
      $or: [{ isSuperAdmin: true }, { "permissions.status": 1 }],
    });
    if (!getUserData) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const tempCode = Math.floor(Math.random() * 1000000);
    const updateCode = await User.updateOne(
      { email: req.body.email },
      { $set: { tempCode: tempCode } }
    );
    if (!updateCode) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    // nodemailer.sendEMail(req.body.email, "Forgot Password",  "Your OTP to reset password is "+tempCode);
    nodemailer.sendEMail(
      req.body.email,
      "Forgot Password",
      mailContent.mail_content(
        "",
        "Your OTP to reset password is " + tempCode,
        "Forgot Password"
      )
    );

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.adminForgotPasswordCheckOtp = async (req, res, next) => {
  try {
    if (!req.body.email || req.body.email?.trim() == "") {
      const err = new Error(error_code.EMAIL_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    req.body.email = req.body.email.toLowerCase();
    if (!config.EMAIL_REGEXP.test(req.body.email)) {
      const err = new Error(error_code.INVALID_EMAIL.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.otp || req.body.otp == "") {
      const err = new Error(error_code.OTP_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const getUserData = await User.findOne({
      email: req.body.email,
      $or: [{ isSuperAdmin: true }, { "permissions.status": 1 }],
    });
    if (!getUserData) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (getUserData.tempCode !== Number(req.body.otp)) {
      const err = new Error(error_code.OTP_NOT_MATCH.CODE);
      err.statusCode = 0;
      throw err;
    }

    const token = jwt.sign(
      { userid: getUserData._id },
      config.JWT_FORGOT_SECRET,
      {
        expiresIn: "15m",
      }
    );

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      token: token,
    });
  } catch (err) {
    next(err);
  }
};

exports.adminResetPassword = async (req, res, next) => {
  try {
    if (!req.body.password || req.body.password == "") {
      const err = new Error(error_code.PASSWORD_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (req.body.password.length < 6) {
      const err = new Error(error_code.SHORT_PASSWORD.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.header("x-auth-token")) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const decodedToken = jwt.verify(
      req.header("x-auth-token"),
      config.JWT_FORGOT_SECRET
    );
    if (!decodedToken) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 12);
    const updateUser = await User.updateOne(
      { _id: decodedToken.userid },
      {
        password: hashedPassword,
        updatedAt: Date.now(),
      }
    );
    if (!updateUser) {
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

exports.deletePermission = async (req, res, next) => {
  try {
    if (!req.params.formId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.title) {
      const err = new Error("Form title is required");
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await User.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwner = checkValidUser.permissions.some((i) =>
      i.type.includes("owner")
    );

    if (!isOwner && !checkValidUser.isSuperAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
  } catch (e) {
    next(e);
  }
};

exports.usersAutocomplete = async (req, res, next) => {
  try {
    const checkValidUser = await User.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwner = checkValidUser.permissions.some((i) =>
      i.type.includes("owner")
    );

    if (!isOwner && !checkValidUser.isSuperAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    findObj = {
      isPhoneVerified: true,
    };
    if (req.query.search) {
      let regex = new RegExp(req.query.search, "i");
      findObj["$or"] = [
        {
          name: regex,
        },
        {
          mobile: regex,
        },
      ];
    }
    const getUsers = await User.find(findObj, {
      _id: 1,
      countryCode: 1,
      mobile: 1,
      name: 1,
    });

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: getUsers,
    });
  } catch (e) {
    next(e);
  }
};
// Token generation /////////////////////////////////////////////////////////////////
const generateToken = (data, type) => {
  const tokenReqInfo = {
    secretKey:
      type === "access" ? config.JWT_SECRET : config.JWT_REFRESH_SECRET,
    expireTime: type === "access" ? "365d" : "365d",
  };
  return (token = jwt.sign(data, tokenReqInfo.secretKey, {
    expiresIn: tokenReqInfo.expireTime,
  }));
};
