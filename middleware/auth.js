const jwt = require("jsonwebtoken");
const config = require("../config/config");

exports.auth = (req, res, next) => {
    const token = req.get('Authorization')?.split(' ')[1]; // Bearer YOUR_TOKEN
   
    if (!token) {
        req.isAuth = false;
        next();
    }
   
    try {      
        let decodedToken;
        decodedToken = jwt.verify(token, config.JWT_SECRET);
        if (!decodedToken) {
            req.isAuth = false;
        } else {
            req.sessionUserData = decodedToken;
            req.isAuth = true;
        }
        if (!req.isAuth) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }
        next();
    } catch (err) {
        
        req.isAuth = false;
        next();
    }
}

