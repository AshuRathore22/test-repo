// const Organization = require("../models/organization");
// const user = require("../models/users");
// const error_code = require("../config/error-code");

// exports.checkSubscription = async (req, res, next) => {
//   try {
//     var userId = req.sessionUserData?.userid;
//     if (userId) {
//       const userDeatils = await user.findOne({_id: userId });
//       const allOrg = await Organization.find();
//       const countOrg = allOrg.length;
//       const organization = await Organization.findOne({
//         created_by: userDeatils._id,
//       });
//       if (!organization && countOrg === 0) {
//         next();
//       } else if (organization) {
//         if (!organization) {
//           const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
//           err.statusCode = 0;
//           throw err;
//         }
//         const currentDate = new Date();
//         const subscriptionEndDate = new Date(organization.end_date);
//         console.log(subscriptionEndDate); 
//         if (currentDate > subscriptionEndDate) {
//           const err = new Error(error_code.SUBSCRIPTION_END.CODE);
//           err.statusCode = 0;
//           throw err;
//         }
//         next();
//       } else {
//         const org_id = userDeatils.permissions[0].organizationId;
//         const organization = await Organization.findOne({ _id: org_id });
//         if (!organization) {
//           const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
//           err.statusCode = 0;
//           throw err;
//         }
//         const currentDate = new Date();
//         const subscriptionEndDate = new Date(organization.end_date);
//         if (currentDate > subscriptionEndDate) {
//           const err = new Error(error_code.SUBSCRIPTION_END.CODE);
//           err.statusCode = 0;
//           throw err;
//         }
//         next();
//       }
//     } else {
//       const userEmail = req.body.email;
//       const userDeatil = await user.findOne({email: userEmail });
//       const allOrg = await Organization.find();
//       const countOrg = allOrg.length;
//       const organization = await Organization.findOne({
//         created_by: userDeatil._id,
//       });
//       if (!organization && countOrg === 0) {
//         next();
//       } else if (organization) {
//         if (!organization) {
//           const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
//           err.statusCode = 0;
//           throw err;
//         }
//         const currentDate = new Date();
//         const subscriptionEndDate = new Date(organization.end_date);
//         if (currentDate > subscriptionEndDate) {
//           const err = new Error(error_code.SUBSCRIPTION_END.CODE);
//           err.statusCode = 0;
//           throw err;
//         }
//         next();
//       } else {
//         const org_id = userDeatil.permissions[0].organizationId;
//         const organization = await Organization.findOne({ _id: org_id });
//         if (!organization) {
//           const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
//           err.statusCode = 0;
//           throw err;
//         }
//         const currentDate = new Date();
//         const subscriptionEndDate = new Date(organization.end_date);
//         if (currentDate > subscriptionEndDate) {
//           const err = new Error(error_code.SUBSCRIPTION_END.CODE);
//           err.statusCode = 0;
//           throw err;
//         }
//         next();
//       }
//     }
//   } catch (error) {
//     next(error);
//   }
// };



const Organization = require('../models/organization');
const User = require('../models/users'); 
const error_code = require('../config/error-code');

exports.checkSubscription = async (req, res, next) => {
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
        const currentDate = new Date();
        const subscriptionEndDate = new Date(organization.end_date);
        if (currentDate > subscriptionEndDate) {
          const err = new Error(error_code.SUBSCRIPTION_END.CODE);
          err.statusCode = 0;
          throw err;
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
        const currentDate = new Date();
        const subscriptionEndDate = new Date(organization.end_date);
        if (currentDate > subscriptionEndDate) {
          const err = new Error(error_code.SUBSCRIPTION_END.CODE);
          err.statusCode = 0;
          throw err;
        }
        next();
      }
    }
  } catch (error) {
    next(error);
  }
}
