const fs = require("fs");
const path = require("path");
const config = require("../config/config");
const error_code = require("../config/error-code");
const bcrypt = require("bcryptjs");
var mailer = require("../config/email.config");
const Users = require("../models/users");
const Organization = require("../models/organization");
const mongoose = require("mongoose");

//################################ Admin Organization APIs ################################//

// Add new organization API /////////////////////////////////////////////////////////////////
exports.createNewOrganization = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (checkValidUser.isSuperAdmin == false) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.name || req.body.name?.trim() == "") {
      const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    let imageUrl = "";
    if (req.file) {
      imageUrl = req.file.path.replaceAll("\\", "/");
    }
    const currentDate = new Date();
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 3, currentDate.getDate());
    const firstTenFeatures = {
      mcq_single: true,
      mcq_multiple: true,
      text: true,
      number: true,
      location: true,
      date: true,
      time: true,
      note: true,
      signature: true,
      sectionBreak: true,
    };
    const dataToSave = {
      name: req.body.name,
      logo: imageUrl,
      created_by: checkValidUser._id,
      updated_by: checkValidUser._id,
      created_at: Date.now(),
      updated_at: Date.now(),
      start_date: Date.now(), 
      end_date: endDate, 
      features: firstTenFeatures
    };
    const saveOrgData = await new Organization(dataToSave).save();
    if (!saveOrgData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    const responseObject = {
      status: 1,
      error_code: error_code.NONE.CODE,
      body: {
        org_id: saveOrgData._id,
        name: saveOrgData.name,
        logo: saveOrgData.logo,
        start_date: saveOrgData.start_date,
        end_date: saveOrgData.end_date, 
        maxUserLimit: saveOrgData.maxUserLimit, 
        subscriptionType: saveOrgData.subscriptionType,
        features: saveOrgData.features, 
      }
    };
    for (const [key, value] of Object.entries(saveOrgData.features)) {
      if (value === true) {
        responseObject.body.features[key] = value;
      }
    }
    return res.status(200).json({
      responseObject
    });
  } catch (err) {
    next(err);
  }
};

// Get organization by id API /////////////////////////////////////////////////////////////////
exports.fetchOrganizationById = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwner = checkValidUser.permissions.some((i) =>
      i.type.includes("owner")
    );

    if (checkValidUser.isSuperAdmin == false && !isOwner) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.params.org_id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const orgData = await Organization.findById(req.params.org_id);
    if (!orgData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: orgData,
    });
  } catch (err) {
    next(err);
  }
};

// Get all organization API /////////////////////////////////////////////////////////////////
exports.fetchAllOrganization = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (checkValidUser.isSuperAdmin == false) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const findObj = {};
    // console.log(req.query,req.query.sortBy,req.query.sortOrder);

    if (req.query.search) {
      let regex = new RegExp(req.query.search, "i");
      findObj.name = regex;
    }

    if (req.query.orgstatus && req.query.orgstatus !== "all") {
      findObj.status = req.query.orgstatus;
    }

    let limit = 0;
    let page = 0;

    if (req.query.page && req.query.page > 0) {
      page = req.query.page * req.query.limit;
    }

    if (req.query.limit && req.query.limit > 0) {
      limit = req.query.limit;
    }

    const allOrgData = await Organization.find(findObj)
      .sort({ updated_at: req.query.sort })
      .limit(limit)
      .skip(page);
    const totalOrgs = await Organization.countDocuments(findObj);
    if (!allOrgData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: allOrgData,
      total: totalOrgs,
    });
  } catch (err) {
    next(err);
  }
};

// Update organization by id API ///////////////////////////////////////////////`/////////////
// exports.updateOrganizationById = async (req, res, next) => {
//   try {
//     if (!req.isAuth) {
//       const err = new Error(error_code.NOT_AUTHERIZED.CODE);
//       err.statusCode = 0;
//       throw err;
//     }

//     const checkValidUser = await Users.findById(req.sessionUserData.userid);

//     if (!checkValidUser) {
//       const err = new Error(error_code.USER_NOT_FOUND.CODE);
//       err.statusCode = 0;
//       throw err;
//     }

//     const isOwner = checkValidUser.permissions.some((i) =>
//       i.type.includes("owner")
//     );

//     if (checkValidUser.isSuperAdmin == false && !isOwner) {
//       const err = new Error(error_code.NOT_AUTHERIZED.CODE);
//       err.statusCode = 0;
//       throw err;
//     }

//     if (!req.params.org_id) {
//       const err = new Error(error_code.ID_NOT_FOUND.CODE);
//       err.statusCode = 0;
//       throw err;
//     }
//     if (!req.body.name || req.body.name?.trim() == "") {
//       const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
//       err.statusCode = 0;
//       throw err;
//     }
//     let imageUrl = "";
//     if (req.file) {
//       imageUrl = req.file.path.replaceAll("\\", "/");
//     }
//     // if (!imageUrl) {
//     //     const error = new Error('Image not found!!!');
//     //     error.statusCode = 404;
//     //     throw error;
//     // }
//     const dataToUpdate = {
//       name: req.body.name,
//       updated_by: checkValidUser._id,
//       updated_at: Date.now(),
//     };
//     if (imageUrl) dataToUpdate.logo = imageUrl;

//     const updateOrg = await Organization.findByIdAndUpdate(
//       req.params.org_id,
//       dataToUpdate
//     );

//     if (!updateOrg) {
//       const err = new Error(error_code.UNKNOWN_ERROR.CODE);
//       err.statusCode = 0;
//       throw err;
//     }

//     if (imageUrl) {
//       clearImage(updateOrg.logo);
//     }

//     res.status(200).json({
//       status: 1,
//       error_code: error_code.NONE.CODE,
//     });
//   } catch (err) {
//     next(err);
//   }
// };

exports.updateOrganizationById = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwner = checkValidUser.permissions.some((i) =>
      i.type.includes("owner")
    );
    if (checkValidUser.isSuperAdmin == false && !isOwner) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.params.org_id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.name || req.body.name?.trim() == "") {
      const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    let imageUrl = "";
    if (req.file) {
      imageUrl = req.file.path.replaceAll("\\", "/");
    }
    // if (!imageUrl) {
    //     const error = new Error('Image not found!!!');
    //     error.statusCode = 404;
    //     throw error;
    // }
    const dataToUpdate = {
      name: req.body.name,
      updated_by: checkValidUser._id,
      updated_at: Date.now(),
    };
    if (req.body.start_date) {
      if (req.body.start_date > req.body.end_date) {
        return res.status(400).json({
          success: false, 
          message: 'Start date will smaller than end date'
        })
      }
      dataToUpdate.start_date = req.body.start_date;
    }
    if (req.body.end_date) {
      if (req.body.start_date > req.body.end_date) {
        return res.status(400).json({
          success: false, 
          message: 'End date will greater than start date'
        })
      }
      dataToUpdate.end_date = req.body.end_date;
    }
    if (imageUrl) dataToUpdate.logo = imageUrl;
    const organization = await Organization.findById(req.params.org_id);
    if (!organization) {
      const err = new Error(error_code.ORG_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (organization.maxUserLimit !== req.body.maxUserLimit) {
      dataToUpdate.maxUserLimit = req.body.maxUserLimit
    }
    if (organization.subscriptionType !== req.body.subscriptionType) {
      dataToUpdate.subscriptionType = req.body.subscriptionType;
      if (req.body.subscriptionType === 'premium') {
        dataToUpdate.features = { ...organization.features };
        for (const key in dataToUpdate.features) {
          dataToUpdate.features[key] = true;
        }
      } else if (req.body.subscriptionType === 'free') {
        dataToUpdate.features = { ...organization.features };
        let count = 0;
        for (const key in dataToUpdate.features) {
          if (count >= 10) dataToUpdate.features[key] = false;
          else dataToUpdate.features[key] = true;
          count++;
        }
      }
    }
    const updateOrg = await Organization.findByIdAndUpdate(
      req.params.org_id,
      dataToUpdate, 
      { new: true }
    );
    if (!updateOrg) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (imageUrl) {
      clearImage(updateOrg.logo);
    }
    return res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      data: updateOrg
    });
  } catch (err) {
    next(err);
  }
};


// Active/Deactivate organization by id API ///////////////////////////////////////////////////////
exports.changeStatusOrganizationById = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwner = checkValidUser.permissions.some((i) =>
      i.type.includes("owner")
    );

    if (checkValidUser.isSuperAdmin == false && !isOwner) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.params.org_id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.status) {
      const err = new Error(error_code.STATUS_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const changeOrgStatus = await Organization.findByIdAndUpdate(
      req.params.org_id,
      {
        status: req.body.status,
        updated_by: checkValidUser._id,
        updated_at: Date.now(),
      }
    );

    if (!changeOrgStatus) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (req.body.status == "inactive") {
      const updatePermission = await Users.update(
        {
          "permissions.organizationId": mongoose.Types.ObjectId(
            req.params.org_id
          ),
          "permissions.status": 1,
        },
        {
          $set: {
            "permissions.$[elem].status": 0,
          },
        },
        {
          arrayFilters: [
            {
              "elem.status": 1,
              "elem.organizationId": mongoose.Types.ObjectId(req.params.org_id),
            },
          ],
          multi: true,
        }
      );
      console.log(updatePermission);
    }

    if (req.body.status == "active") {
      const updatePermission = await Users.update(
        {
          "permissions.organizationId": mongoose.Types.ObjectId(
            req.params.org_id
          ),
          "permissions.status": 0,
        },
        {
          $set: {
            "permissions.$[elem].status": 1,
          },
        },
        {
          arrayFilters: [
            {
              "elem.status": 0,
              "elem.organizationId": mongoose.Types.ObjectId(req.params.org_id),
            },
          ],
          multi: true,
        }
      );
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

// Add user with role in organization API ///////////////////////////////////////////////////////
exports.addOwnersToOrganization = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwner = checkValidUser.permissions.some((i) =>
      i.type.includes("owner")
    );

    if (checkValidUser.isSuperAdmin == false && !isOwner) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.org_id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.body.name || req.body.name?.trim() == "") {
      const err = new Error(error_code.NAME_NOT_fOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.body.email) {
      const err = new Error(error_code.EMAIL_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!config.EMAIL_REGEXP.test(req.body.email)) {
      const err = new Error(error_code.INVALID_EMAIL.CODE);
      err.statusCode = 0;
      throw err;
    }
    req.body.email = req.body.email.toLowerCase();
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
    const hashedPassword = await bcrypt.hash(req.body.password, 12);

    const isUserExists = await Users.countDocuments({ email: req.body.email });
    let organizationStatus = await Organization.findById(
      req.body.org_id
    ).select("status");

    organizationStatus = organizationStatus.status == "active" ? 1 : 0;

    if (!isUserExists) {
      const addUser = new Users({
        name: req.body.name,
        email: req.body.email,
        permissions: {
          organizationId: req.body.org_id,
          type: "owner",
          status: organizationStatus,
        },
        password: hashedPassword,
        category: "web",
      }).save();

      if (!addUser) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }
    } else {
      const isOwnerExists = await Users.countDocuments({
        email: req.body.email,
        permissions: {
          $elemMatch: {
            type: { $in: ["owner", "administrator", "member"] },
            organizationId: req.body.org_id,
          },
        },
      });
      if (isOwnerExists) {
        const err = new Error(error_code.OWNER_ALREADY_EXISTS.CODE);
        err.statusCode = 0;
        throw err;
      } else {
        const updatedPermission = await Users.updateOne(
          { email: req.body.email },
          {
            $push: {
              permissions: {
                organizationId: req.body.org_id,
                type: "owner",
                status: organizationStatus,
              },
            },
          }
        );
      }
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

// update owner with id ////////////////////////////////////////////////
exports.updateOwnerToOrganisation = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isOwner = checkValidUser.permissions.some((i) =>
      i.type.includes("owner")
    );
    if (!req.params.id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const updateUser = {
      name: req.body.name,
      birthDate: req.body.birthDate,
      mobile: req.body.mobile,
      gender: req.body.gender,
      countryCode: req.body.countryCode,
      pinCode: req.body.pinCode,
      address: req.body.address,
      city: req.body.city,
      state: req.body.state,
    };
    const update = await Users.findByIdAndUpdate(req.params.id, updateUser);
    if (!update) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    // console.log(update);
    res.json({
      status: 200,
      success: true,
      message: "updated successfully",
      data: update,
    });
  } catch (error) {
    console.log(error);
  }
};
// get owner with id ////////////////////////////////////////////////
exports.getOwnerById = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      if (!checkValidUser) {
        const err = new Error(error_code.USER_NOT_FOUND.CODE);
        err.statusCode = 0;
        throw err;
      }
    }
    if (!req.params.id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const data = await Users.findById(req.params.id);
    if (!data) {
      const err = new Error("User Not found");
      err.statusCode = 500;
      throw err;
    }
    res.json({
      status: 200,
      success: true,
      message: data,
    });
  } catch (error) {
    console.log(error);
  }
};

exports.getAllOwner = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwner = checkValidUser.permissions.some((i) =>
      i.type.includes("owner")
    );

    if (checkValidUser.isSuperAdmin == false && !isOwner) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.params.org_id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    let findObj = {
      permissions: {
        $elemMatch: { type: "owner", organizationId: req.params.org_id },
      },
    };
    if (req.query.search) {
      // let regex = new RegExp(req.query.search,'i');
      findObj["$or"] = [
        {
          name: { $regex: req.query.search, $options: "i" },
        },
        {
          email: { $regex: req.query.search, $options: "i" },
        },
      ];
    }

    const getAllOwnerData = await Users.find(findObj).select(
      "name email status createdAt"
    );

    if (!getAllOwnerData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: getAllOwnerData,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteOwner = async (req, res, next) => {
  try {
    if (!req.params.orgId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwner = checkValidUser.permissions.some((i) =>
      i.type.includes("owner")
    );

    if (checkValidUser.isSuperAdmin == false && !isOwner) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const removeAccess = await Users.update(
      { _id: { $in: req.body.owners } },
      {
        $pull: {
          permissions: {
            organizationId: req.params.orgId,
            type: "owner",
          },
        },
      },
      { multi: true }
    );

    if (!removeAccess) {
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

exports.deleteAuditor = async (req, res, next) => {
  try {
    if (!req.params.orgId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwner = checkValidUser.permissions.some((i) =>
      i.type.includes("owner")
    );

    if (checkValidUser.isSuperAdmin == false && !isOwner) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const removeAccess = await Users.update(
      { _id: { $in: req.body.auditors } },
      {
        $pull: {
          permissions: {
            organizationId: req.params.orgId,
            type: "member",
          },
        },
      },
      { multi: true }
    );

    if (!removeAccess) {
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

exports.inviteCollaborator = async (req, res, next) => {
  try {
    if (!req.body.email) {
      const err = new Error(error_code.EMAIL_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!config.EMAIL_REGEXP.test(req.body.email)) {
      const err = new Error(error_code.INVALID_EMAIL.CODE);
      err.statusCode = 0;
      throw err;
    }

    mailer.sendEMail(
      req.body.email,
      "Organization Invite",
      "You have been invited to the organization in Zccrue."
    );
  } catch (err) {
    next(err);
  }
};

exports.getAudience = async (req, res, next) => {
  try {
    if (!req.params.orgId || req.params.orgId == "") {
      const err = new Error(error_code.FORM_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
    
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const isSuperAdmin = checkValidUser.isSuperAdmin;
    if (isSuperAdmin) {
      let findObj = {
        "permissions.type": { $in: ["member", "manager"] },
        "permissions.organizationId": req.params.orgId,
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
      
      let limit = 0;
      
      let pageNo = 0;
      
      if (req.query.limit && req.query.limit > 0) {
        limit = req.query.limit;
      }
      if (req.query.page && req.query.page > 0) {
        pageNo = req.query.page * limit;
      }
      let getAudience = await Users.find(findObj)
      .lean()
      .sort({ updatedAt: -1 })
      .skip(pageNo)
      .limit(limit);
      let audienceTotal = await Users.countDocuments(findObj);
      // console.log(getAudience, 'iiiiiiiiiiiiiiii');
      // console.log(audienceTotal,"audienceTotal");return
      if (!getAudience) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }
  
      const audienceArray = getAudience.map((obj) => {
        let memberTeamCount = 0;
        let managerTeamCount = 0;
  
        obj.permissions.find((i) => {
          if (i.teamId && i.type == "member") {
            memberTeamCount++;
          }
          if (i.teamId && i.type == "manager") {
            managerTeamCount++;
          }
        });
  
        let countObj = {
          memberTeamCount: memberTeamCount,
          managerTeamCount: managerTeamCount,
        };
        //console.log(obj);
        delete obj.permissions;
        return { ...obj, ...countObj };
      });
  
      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        audience: audienceArray,
        total: audienceTotal,
      });
    }
    else {
      const isOwnerOrAdmin = checkValidUser.permissions.some(
        (i) => i.type.includes("owner") || i.type.includes("administrator")
      );
      
      if (!isOwnerOrAdmin) {
        const err = new Error(error_code.NOT_AUTHERIZED.CODE);
        err.statusCode = 0;
        throw err;
      }
      
      let findObj = {
        "permissions.type": { $in: ["member", "manager"] },
        "permissions.organizationId": req.params.orgId,
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
      
      let limit = 0;
      
      let pageNo = 0;
      
      if (req.query.limit && req.query.limit > 0) {
        limit = req.query.limit;
      }
      if (req.query.page && req.query.page > 0) {
        pageNo = req.query.page * limit;
      }
      let getAudience = await Users.find(findObj)
      .lean()
      .sort({ updatedAt: -1 })
      .skip(pageNo)
      .limit(limit);
      let audienceTotal = await Users.countDocuments(findObj);
      // console.log(getAudience, 'iiiiiiiiiiiiiiii');
      // console.log(audienceTotal,"audienceTotal");return
      if (!getAudience) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }
  
      const audienceArray = getAudience.map((obj) => {
        let memberTeamCount = 0;
        let managerTeamCount = 0;
  
        obj.permissions.find((i) => {
          if (i.teamId && i.type == "member") {
            memberTeamCount++;
          }
          if (i.teamId && i.type == "manager") {
            managerTeamCount++;
          }
        });
  
        let countObj = {
          memberTeamCount: memberTeamCount,
          managerTeamCount: managerTeamCount,
        };
        //console.log(obj);
        delete obj.permissions;
        return { ...obj, ...countObj };
      });
  
      res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE,
        audience: audienceArray,
        total: audienceTotal,
      });
    }
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.addDeviceInTeam = async (req, res, next) => {
  try {
    if (!req.body.org_id || req.body.org_id == "") {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    for (let data of req.body.audience) {
      const checkObj = {
        mobile: data.mobile,
        countryCode: data.countryCode,
      };

      const mobileCheck = await Users.findOne(checkObj);
      let role = "";
      if (req.body.isManager == true) {
        role = "manager";
      } else {
        role = "member";
      }

      if (mobileCheck) {
        const permissionCheck = await Users.find(
          {
            mobile: data.mobile,
            countryCode: data.countryCode,
            permissions: {
              $elemMatch: {
                type: role,
                teamId: mongoose.Types.ObjectId(req.body.teamId),
              },
            },
          },
          {
            permissions: 1,
          }
        );
        const verificationCheck = await Users.find(
          { mobile: data.mobile, countryCode: data.countryCode },
          { isPhoneVerified: 1 }
        );
        let invitationStatus;
        if (Array.isArray(verificationCheck) && verificationCheck.length > 0) {
          invitationStatus =
            verificationCheck[0].isPhoneVerified == true
              ? "Accepted"
              : "Pending";
        }
        if (!permissionCheck || permissionCheck.length == 0) {
          const updatedPermission = await Users.updateOne(checkObj, {
            $push: {
              permissions: {
                teamId: req.body.teamId,
                type: role,
                invitationStatus: invitationStatus,
                organizationId: req.body.orgId,
                createdBy: req.sessionUserData.userid,
                updatedBy: req.sessionUserData.userid,
              },
            },
          });

          if (!updatedPermission) {
            const err = new Error(error_code.UNKNOWN_ERROR.CODE);
            err.statusCode = 0;
            throw err;
          }
        }
      } else {
        const setNewUser = await new Users({
          mobile: data.mobile,
          countryCode: data.countryCode,
          isPhoneVerified: false,
          category: "web",
          role: "user",
          permissions: [
            {
              teamId: req.body.teamId,
              type: role,
              organizationId: req.body.orgId,
              invitationStatus: "Pending",
              createdBy: req.sessionUserData.userid,
              updatedBy: req.sessionUserData.userid,
            },
          ],
        }).save();
      }
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

exports.getInvitations = async (req, res, next) => {
  try {
    if (!req.params.orgId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }
console.log(req.params.orgId);
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    let findObj = {
      "permissions.organizationId": mongoose.Types.ObjectId(req.params.orgId),
    };

    if (req.query.status) {
      findObj["permissions.invitationStatus"] = req.query.status;
    } else {
      findObj["permissions.invitationStatus"] = "Pending";
    }

    
    if (req.query.search) {
      let regex = new RegExp(req.query.search, "i");
      findObj.mobile = regex;
    }

    let limit = 0;

    let pageNo = 0;

    if (req.query.limit && req.query.limit > 0) {
        limit = req.query.limit;
    }

    if (req.query.page && req.query.page > 0) {
        pageNo = (req.query.page) * limit
    }

    const invitations = await Users.find(findObj, {
      permissions: 1,
      mobile: 1,
      countryCode: 1,
      name: 1,
      updatedAt: 1,
    })
      .populate({
        path: "permissions.teamId",
        model: "Teams",
        select: "name",
      })
      .populate({
        path: "permissions.createdBy",
        model: "Users",
        select: "name",
      })
      .skip(pageNo)
      .limit(limit)
    let data = [];
    for (let i = 0; i < invitations.length; i++) {
      for (let j = 0; j < invitations[i].permissions.length; j++) {
        data.push({
          _id: invitations[i]._id,
          mobile: invitations[i].mobile,
          countryCode: invitations[i].countryCode,
          teamId: invitations[i].permissions[j].teamId._id,
          teamName: invitations[i].permissions[j].teamId.name,
          invitationStatus: invitations[i].permissions[j].invitationStatus,
          sentTime: invitations[i].permissions[j].createdAt,
          sentBy: invitations[i].permissions[j].createdBy.name,
          acceptedBy: invitations[i].name,
          acceptedTime: invitations[i].updatedAt,
        });
      }
    }

    res.status(200).json({
      status: 1,
      data: data,
      error_code: error_code.NONE.CODE,
    });
  } catch (err) {
    next(err);
  }
};

exports.deleteInvitations = async (req, res, next) => {
  try {
    if (!req.params.orgId) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 400;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwnerOrAdmin = checkValidUser.permissions.some(
      (i) => i.type.includes("owner") || i.type.includes("administrator")
    );

    if (!isOwnerOrAdmin) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    let promiseArr = [];
    for (let i = 0; i < req.body.userId.length; i++) {
      promiseArr.push(
        await Users.update(
          {
            _id: req.body.userId[i],
            "permissions.teamId": req.body.teamId[i],
            "permissions.organizationID": req.params.orgId,
          },
          {
            $set: {
              "permissions.$.invitationStatus": "Deleted",
            },
          }
        )
      );
    }

    Promise.all(promiseArr).then((result) => {
      res.status(200).json({
        status: 1,
        error_code: 0,
      });
    });
  } catch (err) {
    next(err);
  }
};

exports.getUserOrgInfo = async (req, res, next) => {
  try {
    if (!req.parmas.userId) {
    }
  } catch (err) {
    console.log(err);
    next(err);
  }
};
//################################ Common helper methods ################################//

// Delete image before update /////////////////////////////////////////////////////////////
const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.error(err));
};

//Get ALl Organization User wise
exports.getAllOrganizationUserWise = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    const isOwner = checkValidUser.permissions.some((i) =>
      i.type.includes("owner")
    );

    if (checkValidUser.isSuperAdmin == false && !isOwner) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }

    if (!req.sessionUserData.userid) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }

    //const orgData = await Organization.find({userId:req.sessionUserData.userid});
    const orgData = await Users.find({ _id: req.sessionUserData.userid })
      .populate({ path: "permissions.organizationId", select: "name _id" })
      .sort("createdAt");
    if (!orgData) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }

    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      body: orgData,
    });
  } catch (err) {
    next(err);
  }
};

// update organization's features
// exports.updateFeaturesByOrg_id = async (req, res, next) => {
//   try {
//     // console.log(req.isAuth); return
//     if (!req.isAuth) {
//       const err = new Error(error_code.NOT_AUTHERIZED.CODE)
//       err.statusCode = 0;
//       throw err
//     }
//     const checkValidUser = await Users.findById(req.sessionUserData.userid);
//     if (!checkValidUser) {
//       const err = new Error(error_code.USER_NOT_FOUND.CODE);
//       err.statusCode = 0;
//       throw err
//     }
//     if (checkValidUser.isSuperAdmin == false) {
//       const err = new Error(error_code.NOT_AUTHERIZED.CODE);
//       err.statusCode = 0;
//       throw err
//     }
//     if (!req.params.org_id) {
//       const err = new Error(error_code.ID_NOT_FOUND.CODE);
//       err.statusCode = 0;
//       throw err
//     }
//     const orgId = req.params.org_id;
//     const organization = await Organization.findById(orgId);
//     if (!organization) {
//       const err = new Error(error_code.ID_NOT_FOUND.CODE);
//       err.statusCode = 0;
//       throw err
//     }
//     const updatedFeatures = {
//       // ...organization.features, 
//       // ...req.body.feature 
//       mcq_single: req.body.feature.mcq_single, 
//       mcq_multiple: req.body.feature.mcq_multiple, 
//       text: req.body.feature.text, 
//       number: req.body.feature.number, 
//       location: req.body.feature.location, 
//       date: req.body.feature.date,
//       time: req.body.feature.time, 
//       note: req.body.feature.note, 
//       signature: req.body.feature.signature, 
//       sectionBreak: req.body.feature.sectionBreak, 
//       area_on_map: req.body.feature.area_on_map, 
//       distance_on_map: req.body.feature.distance_on_map,
//       drop_down: req.body.feature.drop_down, 
//       image: req.body.feature.image, 
//       multiple_image_upload: req.body.feature.multiple_image_upload, 
//       image_geo_tag: req.body.feature.image_geo_tag, 
//       multiple_image_geo_tag: req.body.feature.multiple_image_geo_tag,
//       phone: req.body.feature.phone, 
//       email: req.body.feature.email, 
//       audio: req.body.feature.audio, 
//       video: req.body.feature.video, 
//       file_upload: req.body.feature.file_upload, 
//       multiple_file_upload: req.body.feature.multiple_file_upload,
//       likert_scale: req.body.feature.likert_scale, 
//       tracking: req.body.feature.tracking, 
//       scale: req.body.feature.scale, 
//       rating: req.body.feature.rating, 
//       matrix: req.body.feature.matrix, 
//       grp_no_repeat: req.body.feature.grp_no_repeat,
//       grp_number: req.body.feature.grp_number, 
//       grp_choice: req.body.feature.grp_choice, 
//       grp_custom: req.body.feature.grp_custom, 
//       monitoring: req.body.feature.monitoring, 
//       barcode: req.body.feature.barcode
//     };
//     const dataToUpdate = {
//       features: updatedFeatures,
//       updated_by: checkValidUser._id,
//       updated_at: Date.now(),
//     };
//     const updateOrg = await Organization.findByIdAndUpdate(
//       orgId,
//       dataToUpdate,
//       { new: true }
//     );
//     if (!updateOrg) {
//       const err = new Error(error_code.UNKNOWN_ERROR.CODE);
//       err.statusCode = 0;
//       throw err;
//     }
//     res.status(200).json({
//       status: 1,
//       error_code: error_code.NONE.CODE,
//       message: 'Features updated successfully',
//       updated_features: updateOrg.features
//     })

//   } catch (error) {
//     next(error)
//   }
// }
// exports.updateFeaturesByOrg_id = async (req, res, next) => {
//   try {
//     if (!req.isAuth) {
//       const err = new Error(error_code.NOT_AUTHERIZED.CODE);
//       err.statusCode = 0;
//       throw err;
//     }
//     const checkValidUser = await Users.findById(req.sessionUserData.userid);
//     if (!checkValidUser) {
//       const err = new Error(error_code.USER_NOT_FOUND.CODE);
//       err.statusCode = 0;
//       throw err;
//     }
//     if (checkValidUser.isSuperAdmin == false) {
//       const err = new Error(error_code.NOT_AUTHERIZED.CODE);
//       err.statusCode = 0;
//       throw err;
//     }
//     if (!req.params.org_id) {
//       const err = new Error(error_code.ID_NOT_FOUND.CODE);
//       err.statusCode = 0;
//       throw err;
//     }
//     const orgId = req.params.org_id;
//     const organization = await Organization.findById(orgId);
//     if (!organization) {
//       const err = new Error(error_code.ID_NOT_FOUND.CODE);
//       err.statusCode = 0;
//       throw err;
//     }
//     const updatedFeatures = {
//       ...organization.features, 
//       ...req.body.feature 
//     };

//     const dataToUpdate = {
//       features: updatedFeatures,
//       updated_by: checkValidUser._id,
//       updated_at: Date.now(),
//     };

//     const updateOrg = await Organization.findByIdAndUpdate(
//       orgId,
//       dataToUpdate,
//       { new: true }
//     );
//     if (!updateOrg) {
//       const err = new Error(error_code.UNKNOWN_ERROR.CODE);
//       err.statusCode = 0;
//       throw err;
//     }
//     res.status(200).json({
//       status: 1,
//       error_code: error_code.NONE.CODE,
//       message: 'Features updated successfully',
//       updated_features: updateOrg.features
//     });

//   } catch (error) {
//     next(error);
//   }
// };
exports.updateFeaturesByOrg_id = async (req, res, next) => {
  try {
    if (!req.isAuth) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);
    if (!checkValidUser) {
      const err = new Error(error_code.USER_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (checkValidUser.isSuperAdmin == false) {
      const err = new Error(error_code.NOT_AUTHERIZED.CODE);
      err.statusCode = 0;
      throw err;
    }
    if (!req.params.org_id) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const orgId = req.params.org_id;
    const organization = await Organization.findById(orgId);
    if (!organization) {
      const err = new Error(error_code.ID_NOT_FOUND.CODE);
      err.statusCode = 0;
      throw err;
    }
    const updatedFeatures = {
      ...organization.features, 
      ...req.body.feature 
    };

    // Keep the first 10 features true if the organization is created for the first time
    if (Object.keys(organization.features).length === 0) {
      const firstTenFeatures = {
        mcq_single: true,
        mcq_multiple: true,
        text: true,
        number: true,
        location: true,
        date: true,
        time: true,
        note: true,
        signature: true,
        sectionBreak: true,
      };
      Object.assign(updatedFeatures, firstTenFeatures);
    }

    const dataToUpdate = {
      features: updatedFeatures,
      updated_by: checkValidUser._id,
      updated_at: Date.now(),
    };

    const updateOrg = await Organization.findByIdAndUpdate(
      orgId,
      dataToUpdate,
      { new: true }
    );
    if (!updateOrg) {
      const err = new Error(error_code.UNKNOWN_ERROR.CODE);
      err.statusCode = 0;
      throw err;
    }
    res.status(200).json({
      status: 1,
      error_code: error_code.NONE.CODE,
      message: 'Features updated successfully',
      updated_features: updateOrg.features
    });

  } catch (error) {
    next(error);
  }
};

