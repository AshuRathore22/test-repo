const Organization = require('../models/organization');
const User = require('../models/users'); 
const error_code = require('../config/error-code');

exports.checkOrganizationStatus = async (req, res, next) => {
  try {
    var userId = req.sessionUserData?.userid; 
    var userEmail = req.body.email;
    if (userId) {
      const userDetails = await User.findOne({_id: userId});
      if (userDetails.isSuperAdmin === true) {
        next();
      }
      else {
        const orgDetails = userDetails.permissions[0];
        const org_id = orgDetails.organizationId;
        const organization = await Organization.findOne({_id: org_id});
        if (!organization) {
          const err = new Error (error_code.ORG_NAME_NOT_FOUND.CODE);
          err.statusCode = 0;
          throw err;
        }
        if (organization.status === 'inactive') {
          const err = new Error (error_code.ORG_INACTIVE.CODE);
          err.statusCode = 0;
          throw err
        }
        next();
      }
    }
    else { 
      const userDetails = await User.findOne({email: userEmail});
      if (userDetails.isSuperAdmin === true) {
        next();
      }
      else {
        const orgDetails = userDetails.permissions[0];
        const org_id = orgDetails.organizationId;
        const organization = await Organization.findOne({_id: org_id});
        if (!organization) {
          const err = new Error (error_code.ORG_NAME_NOT_FOUND.CODE);
          err.statusCode = 0;
          throw err;
        }
        if (organization.status === 'inactive') {
          const err = new Error (error_code.ORG_INACTIVE.CODE);
          err.statusCode = 0;
          throw err
        }
        next();
      }
    }
  } catch (error) {
    next(error);
  }
};

// const Organization = require('../models/organization');
// const User = require('../models/users'); 
// const error_code = require('../config/error-code');

// exports.checkOrganizationStatus = async (req, res, next) => {
//     try {
//         var userId = req.sessionUserData.userid; 
//         var userEmail = req.body.email;
//         if (userId) {
//             const userDetails = await User.findOne({_id: userId});
//             if (userDetails.isSuperAdmin === true) {
//                 next();
//             }
//             else {
//                 const orgDetails = userDetails.permissions[0];
//                 const org_id = orgDetails.organizationId;
//                 const organization = await Organization.findOne({_id: org_id});
//                 if (!organization) {
//                     const err = new Error (error_code.ORG_NAME_NOT_FOUND.CODE);
//                     err.statusCode = 0;
//                     throw err;
//                 }
//                 if (organization.status === 'inactive') {
//                     const err = new Error (error_code.ORG_INACTIVE.CODE);
//                     err.statusCode = 0;
//                     throw err
//                 }
//                 next();
//             }
//         }
//         else { 
//             const userDetails = await User.findOne({email: userEmail});
//             if (userDetails.isSuperAdmin === true) {
//                 next();
//             }
//             else {
//                 const orgDetails = userDetails.permissions[0];
//                 const org_id = orgDetails.organizationId;
//                 const organization = await Organization.findOne({_id: org_id});
//                 if (!organization) {
//                     const err = new Error (error_code.ORG_NAME_NOT_FOUND.CODE);
//                     err.statusCode = 0;
//                     throw err;
//                 }
//                 if (organization.status === 'inactive') {
//                     const err = new Error (error_code.ORG_INACTIVE.CODE);
//                     err.statusCode = 0;
//                     throw err
//                 }
//                 next();
//             }
//         }
//     } catch (error) {
//         next(error);
//     }
// };
