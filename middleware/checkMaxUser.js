const Organization = require('../models/organization');
const User = require('../models/users');
const error_code = require('../config/error-code');

exports.checkUserLimit = async (req, res, next) => {
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
        const org_id = req.params.org_id || req.query.org_id || req.body.org_id || req.body.orgId;
        if (!org_id) {
            const err = new Error(error_code.ID_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        const org = await Organization.findById(org_id);
        if (!org) {
            const err = new Error(error_code.ORG_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        const userCount = await User.countDocuments({'permissions.organizationId': org_id});
        if (userCount >= org.maxUserLimit) {
            const err = new Error(error_code.USER_LIMIT_REACHED.CODE);
            err.statusCode = 0;
            throw err;
        }
        next();
    } catch (error) {
        next(error);
    }
};
