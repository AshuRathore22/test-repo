var request = require('request');
const config = require("../config/config");

exports.auth = (req, res, next) => {
    const token = req.get('Authorization')?.split(' ')[1]; // Bearer YOUR_TOKEN
   console.log(token);
    if (!token) {
        req.isAuth = false;
        next();
    }
   
    try {      
        let decodedAccountId = jwt.verify(token, config.ACCOUNT_ID);
        let decodedAuthToken = jwt.verify(token, config.ACCOUNT_ID);
        if (!decodedAccountId && !decodedAuthToken) {
            req.smsAuth = false;
        } else {
            req.sessionUserData = decodedAccountId;
            req.sessionUserData += decodedAuthToken;
            req.smsAuth = true;
        }
        if (!req.smsAuth) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }
        next();
    } catch (err) {
        req.smsAuth = false;
        next();
    }
}

