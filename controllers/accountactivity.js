// const accountactivity = require('../models/accountactivity');
const Accountactivity = require("../models/accountactivity");
// const requestIP = require("request-ip");
// const geoip = require("geoip-lite");
const error_code = require("../config/error-code");
const { detect } = require("detect-browser");
const accountactivity = require("../models/accountactivity");

exports.getaccountactivity = async (req, res, next) => {
  try {
    console.log(req.query);
   
    let limit = 0;

    let pageNo = 0;

    if (req.query.limit && req.query.limit > 0) {
      limit = req.query.limit;
    }

    if (req.query.page && req.query.page > 0) {
      pageNo = req.query.page * limit;
    }
    let accountactivity = await Accountactivity.find({})
      .sort({ activitytime: -1 })
      .skip(pageNo)
      .limit(limit);
    let Total = await Accountactivity.countDocuments();

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      data: accountactivity,
      total: Total,
    });
  } catch (err) {
    next(err);
  }
};

exports.createAccountActivity = async (req, res, next) => {
  try {
    console.log(req.body);
    const ipAddress = req.header("x-forwarded-for") || req.socket.remoteAddress;
    const ipAddresses = req.header("x-forwarded-for");
    // const requestip = requestIP.getClientIp(req);
    // const geo = geoip.lookup(requestip);
    const getBrowser = detect(req.headers["user-agent"]);
    req.body.browser = getBrowser.name;
    req.body.os = getBrowser.os;
    req.body.activitytime = new Date();
   
    const account = await new Accountactivity(req.body).save();
    if (!account) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      data: account,
    });
  } catch (err) {
    next(err);
  }
};

exports.putactionAccountActivity = async (req, res, next) => {
  try {
    if (!req.body.id) {
      return res.send({
        success: false,
        message: "select id",
      });
    }
    // console.log(req.body.id);
    // req.body.is_new = false;

    const updateActionAccountActivityData =
      await ActionAccountActivity.findByIdAndUpdate(
        req.body.id,
        { activitytype: req.body.activitytype },
        { useFindAndModify: false }
      );
    // console.log(updateNotificationData);
    if (!updateActionAccountActivityData) {
      return res.send({
        success: false,
        message: "Error in update notification",
      });
    }
    return res.send({
      success: true,
      message: "You have successfully updated notification",
    });
  } catch (error) {
    return res.send({
      success: true,
      message: messages.ERROR,
    });
  }
};
