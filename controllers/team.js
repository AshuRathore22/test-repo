const Teams = require("../models/team");
const Forms = require("../models/form");
const Responses = require("../models/response");
const Users = require("../models/users");
const Versions = require("../models/version");
const jwt = require("jsonwebtoken");
const error_code = require("../config/error-code");
const admin_error_code = require("../config/admin-error-code");
const { find } = require("../models/file_upload");
const mongoose = require("mongoose");
exports.addTeam = async (req, res, next) => {
    try {

        if (!req.isAuth) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }

        if (!req.body.name || req.body.name?.trim() == "") {
            const err = new Error(admin_error_code.TEAM_NOT_fOUND.CODE);
            err.statusCode = 0;
            throw err;
        }

        if (!req.body.org_id) {
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

        const isOwner = checkValidUser.permissions.some(i => i.type.includes('owner'));

        if (!isOwner) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }

        const obj = {
            name: req.body.name,
            organization_id: req.body.org_id,
            created_by: req.sessionUserData.userid,
            updated_by: req.sessionUserData.userid
        }

        const addTeam = new Teams(obj).save();

        if (!addTeam) {
            const err = new Error(error_code.UNKNOWN_ERROR.CODE);
            err.statusCode = 0;
            throw err;
        }

        res.status(200).json({
            status: 1,
            error_code: error_code.NONE.CODE
        });

    } catch (err) {
        console.log(err);
        next(err);
    }
};

exports.teamStatus = async (req, res, next) => {
    try {
        promiseArr = [];
        if (Array.isArray(req.body.team_id) && req.body.team_id.length > 0) {
            for (let teamId of req.body.team_id) {
                let promiseArr = new Promise((resolve, reject) => {
                    resolve(Teams.updateOne({ _id: teamId._id }, { status: teamId.status, updated_at: Date.now() }));
                });
                promiseArr = new Promise((resolve, reject) => {
                    if (teamId.status == 'active') {
                        resolve(
                            Users.update({
                                "permissions.teamId": mongoose.Types.ObjectId(teamId._id),
                                "permissions.status": 2
                            }, {
                                "$set": {
                                    "permissions.$[elem].status": 1
                                }
                            },
                                {
                                    "arrayFilters": [{
                                        "elem.status": 2,
                                        "elem.teamId": mongoose.Types.ObjectId(teamId._id)
                                    }],
                                    "multi": true
                                })
                        );
                    } else if (teamId.status == 'inactive') {
                        resolve(
                            Users.update({
                                "permissions.teamId": mongoose.Types.ObjectId(teamId._id),
                                "permissions.status": 1
                            }, {
                                "$set": {
                                    "permissions.$[elem].status": 2
                                }
                            },
                                {
                                    "arrayFilters": [{
                                        "elem.status": 1,
                                        "elem.teamId": mongoose.Types.ObjectId(teamId._id)
                                    }],
                                    "multi": true
                                })
                        );
                    }

                });

            }

            Promise.all(promiseArr).then(
                (result) => {
                    res.status(200).json({
                        status: 1,
                        error_code: 0
                    })
                });
        }
        else {
            console.log('else');
            const err = new Error(error_code.ID_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

exports.getTeamsByOrgId = async (req, res, next) => {
    try {

        if (!req.params.org_id) {
            const err = new Error(error_code.ID_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        let findObj = { organization_id: req.params.org_id };

        if (req.query.status) {
            findObj.status = req.query.status;
        }

        if (req.query.search) {
            let regex = new RegExp(req.query.search, 'i');
            findObj.name = regex;
        }

        let limit = 0;

        let pageNo = 0;

        if (req.query.limit && req.query.limit > 0) {
            limit = req.query.limit;
        }

        if (req.query.page && req.query.page > 0) {
            pageNo = (req.query.page) * limit
        }

        const teamData = await Teams.find(findObj)
            .populate({
                path: 'created_by',
                model: 'Users',
                select: 'name'
            })
            .sort({ "updated_at": -1 })
            .skip(pageNo)
            .limit(limit).lean();

        const teamCount = await Teams.countDocuments(findObj);
        const teamList = teamData.map(async (m) => {

            let membersCount = await Users.countDocuments({
                permissions: {
                    $elemMatch: {
                        type: "member",
                        organizationId: req.params.org_id,
                        teamId: m._id
                    }
                }
            });
            let managersCount = await Users.countDocuments({
                permissions: {
                    $elemMatch: {
                        type: "manager",
                        organizationId: req.params.org_id,
                        teamId: m._id
                    }
                }
            });
            let formsCount = await Forms.countDocuments({
                organizationId: req.params.org_id,
                teams: m._id
            })

            return { ...m, membersCount: membersCount, managersCount: managersCount, formsCount: formsCount }
        });

        const teams = await Promise.all(teamList);

        res.status(200).json({
            status: 1,
            error_code: error_code.NONE.CODE,
            body: teams,
            total: teamCount
        });

    } catch (err) {
        console.log(err);
        next(err);
    }
}

exports.getTeamsCountByOrgId = async (req, res, next) => {
    try {

        if (!req.params.org_id) {
            const err = new Error(error_code.ID_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }

        let findObj = { organization_id: req.params.org_id };

        if (req.query.status) {
            findObj.status = req.query.status;
        }

        const teamCount = await Teams.countDocuments(findObj);

        res.status(200).json({
            status: 1,
            count: teamCount
        });

    } catch (err) {
        console.log(err);
        next(err);
    }
}

exports.getTeamsByFormId = async (req, res, next) => {

    if (!req.params.formId || req.params.formId == "") {
        const err = new Error(error_code.FORM_NOT_FOUND.CODE);
        err.statusCode = 400;
        throw err;
    }

    if (!req.query.orgId || req.query.orgId == "") {
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

    const isOwnerOrAdmin = checkValidUser.permissions.some(i => (i.type.includes('owner') || i.type.includes('administrator')));

    if (!isOwnerOrAdmin) {
        const err = new Error(error_code.NOT_AUTHERIZED.CODE);
        err.statusCode = 0;
        throw err;
    }

    const getTeamsArr = await Forms.find({ _id: req.params.formId }, { teams: 1, _id: 0 });

    if (!getTeamsArr) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
    }

    let findObj = {};

    if (req.query.status == 'teamWithAccess') {
        findObj = {
            _id: {
                $in: getTeamsArr[0].teams
            },
            organization_id: req.query.orgId
        }
    } else if (req.query.status == 'teamWithoutAccess') {
        findObj = {
            _id: {
                $nin: getTeamsArr[0].teams
            },
            organization_id: req.query.orgId
        }
    } else {
        findObj = {
            organization_id: req.query.orgId
        }
    }

    if (req.query.search) {
        let regex = new RegExp(req.query.search, 'i');
        findObj.name = regex;
    }
    let limit = 0;

    let pageNo = 0;

    if (req.query.limit && req.query.limit > 0) {
        limit = req.query.limit;
    }

    if (req.query.page && req.query.page > 0) {
        pageNo = (req.query.page) * limit
    }


    const getTeams = await Teams.find(findObj).sort({ "_id": -1 }).skip(pageNo).limit(limit);

    const teamCount = await Teams.countDocuments(findObj);

    res.status(200).json({
        status: 1,
        teams: getTeams,
        total: teamCount,
        error_code: error_code.NONE.CODE
    });
};


exports.getMemberTeams = async (req, res, next) => {
    try {
        if (!req.query.teamId || req.query.teamId == "") {
            const err = new Error(error_code.ID_NOT_FOUND.CODE);
            err.statusCode = 400;
            throw err;
        }

        if (!req.query.orgId || req.query.orgId == "") {
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

        const isOwnerOrAdmin = checkValidUser.permissions.some(i => (i.type.includes('owner') || i.type.includes('administrator')));

        if (!isOwnerOrAdmin) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }

        let findObj = {
            permissions: {
                $elemMatch: {
                    type: "member",
                    organizationId: req.query.orgId,
                    teamId: req.query.teamId
                }
            }
        };

        if (req.query.search) {
            let regex = new RegExp(req.query.search, 'i');
            findObj["$or"] = [{
                "name": regex
            }, {
                "mobile": regex
            }];
        }

        let limit = 0;

        let pageNo = 0;

        if (req.query.limit && req.query.limit > 0) {
            limit = req.query.limit;
        }

        if (req.query.page && req.query.page > 0) {
            pageNo = (req.query.page) * limit
        }

        const getUsers = await Users.find(findObj, {
            name: 1,
            permissions: 1,
            createdAt: 1
        }).sort({ "_id": -1 }).skip(pageNo).limit(limit).lean();

        if (!getUsers) {
            const err = new Error(error_code.UNKNOWN_ERROR.CODE);
            err.statusCode = 0;
            throw err;
        }

        const memberCount = await Users.countDocuments(findObj);

        const usersArray = getUsers.map((obj) => {

            let memberTeamCount = 0;
            let managerTeamCount = 0;

            obj.permissions.find((i) => {
                if (i.teamId && i.type == "member") {
                    memberTeamCount++;
                }
                if (i.teamId && i.type == "manager") {
                    managerTeamCount++;
                }
            })

            let countObj = { memberTeamCount: memberTeamCount, managerTeamCount: managerTeamCount }
            delete obj.permissions;
            return { ...obj, ...countObj }

        });

        res.status(200).json({
            status: 1,
            users: usersArray,
            total: memberCount,
            error_code: error_code.NONE.CODE
        });
    } catch (e) {
        next(e);
    }
};

exports.deleteMemberTeams = async (req, res, next) => {
    if (!req.body.teamId || req.body.teamId == "") {
        const err = new Error(error_code.ID_NOT_FOUND.CODE);
        err.statusCode = 400;
        throw err;
    }

    if (!req.body.userId || req.body.userId.length == 0) {
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

    const isOwnerOrAdmin = checkValidUser.permissions.some(i => (i.type.includes('owner') || i.type.includes('administrator')));

    if (!isOwnerOrAdmin) {
        const err = new Error(error_code.NOT_AUTHERIZED.CODE);
        err.statusCode = 0;
        throw err;
    }
    const updateUser = [];
    for (let i = 0; i < req.body.userId.length; i++) {
        updateUser.push(await Users.update({
            _id: mongoose.Types.ObjectId(req.body.userId[i]),
            permissions: {
                $elemMatch: {
                    type: "member",
                    organizationId: req.body.orgId,
                    teamId: mongoose.Types.ObjectId(req.body.teamId)
                }
            }
        }, {
            $pull: {
                "permissions": {
                    "teamId": mongoose.Types.ObjectId(req.body.teamId),
                    "type": "member"
                }
            }
        }))
    }

    const isUpdated = await Promise.all(updateUser);

    if (!isUpdated) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
    }

    res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE
    });


};

exports.getManagerTeams = async (req, res, next) => {

    if (!req.query.teamId || req.query.teamId == "") {
        const err = new Error(error_code.FORM_NOT_FOUND.CODE);
        err.statusCode = 400;
        throw err;
    }

    if (!req.query.orgId || req.query.orgId == "") {
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

    const isOwnerOrAdmin = checkValidUser.permissions.some(i => (i.type.includes('owner') || i.type.includes('administrator')));

    if (!isOwnerOrAdmin) {
        const err = new Error(error_code.NOT_AUTHERIZED.CODE);
        err.statusCode = 0;
        throw err;
    }

    const getTeamsArr = await Forms.find({ _id: req.params.formId }, { teams: 1, _id: 0 });

    if (!getTeamsArr) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
    }

    let findObj = {
        permissions: {
            $elemMatch: {
                type: "manager",
                organizationId: req.query.orgId,
                teamId: req.query.teamId
            }
        }
    };

    // if (req.query.status == 'teamWithAccess') {
    //     findObj = {
    //         _id: {
    //             $in: getTeamsArr[0].teams
    //         },
    //         organization_id: req.query.orgId
    //     }
    // } else if (req.query.status == 'teamWithoutAccess') {
    //     findObj = {
    //         _id: {
    //             $nin: getTeamsArr[0].teams
    //         },
    //         organization_id: req.query.orgId
    //     }
    // } else {
    //     findObj = {
    //         organization_id: req.query.orgId
    //     }
    // }

    if (req.query.search) {
        let regex = new RegExp(req.query.search, 'i');
        findObj.name = regex;
    }
    console.log(findObj);
    let limit = 0;

    let pageNo = 0;

    if (req.query.limit && req.query.limit > 0) {
        limit = req.query.limit;
    }

    if (req.query.page && req.query.page > 0) {
        pageNo = (req.query.page) * limit
    }

    const getUsers = await Users.find(findObj, {
        name: 1,
        permissions: 1,
        createdAt: 1
    }).sort({ "_id": -1 }).skip(pageNo).limit(limit).lean();

    if (!getUsers) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
    }

    const memberCount = await Users.countDocuments(findObj);

    // const getTeams = await Teams.find(findObj).sort({ "_id": -1 }).skip(pageNo).limit(limit);

    // const teamCount = await Teams.countDocuments(findObj);

    const usersArray = getUsers.map((obj) => {

        let memberTeamCount = 0;
        let managerTeamCount = 0;

        obj.permissions.find((i) => {
            if (i.teamId && i.type == "member") {
                memberTeamCount++;
            }
            if (i.teamId && i.type == "manager") {
                managerTeamCount++;
            }
        })

        let countObj = { memberTeamCount: memberTeamCount, managerTeamCount: managerTeamCount }
        //console.log(obj);
        delete obj.permissions;
        return { ...obj, ...countObj }

    });

    res.status(200).json({
        status: 1,
        managers: usersArray,
        total: memberCount,
        error_code: error_code.NONE.CODE
    });
};


exports.deleteManagerTeams = async (req, res, next) => {
    if (!req.body.teamId || req.body.teamId == "") {
        const err = new Error(error_code.ID_NOT_FOUND.CODE);
        err.statusCode = 400;
        throw err;
    }

    if (!req.body.userId || req.body.userId.length == 0) {
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

    const isOwnerOrAdmin = checkValidUser.permissions.some(i => (i.type.includes('owner') || i.type.includes('administrator')));

    if (!isOwnerOrAdmin) {
        const err = new Error(error_code.NOT_AUTHERIZED.CODE);
        err.statusCode = 0;
        throw err;
    }
    const updateUser = [];       ///form//
    for (let i = 0; i < req.body.userId.length; i++) {
        updateUser.push(await Users.update({
            _id: mongoose.Types.ObjectId(req.body.userId[i]),
            permissions: {
                $elemMatch: {
                    type: "manager",
                    organizationId: req.body.orgId,
                    teamId: mongoose.Types.ObjectId(req.body.teamId)
                }
            }
        }, {
            $pull: {
                "permissions": {
                    "teamId": mongoose.Types.ObjectId(req.body.teamId),
                    "type": "manager"
                }
            }
        }))
    }

    const isUpdated = await Promise.all(updateUser);

    if (!isUpdated) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
    }

    res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE
    });



};



exports.getManagerListUserMob = async (req, res, next) => {
    try {
        if (!req.isAuth) {
            const err = new Error("Not Authenticated");
            err.statusCode = 401;
            throw err;
        }

        const checkValidUser = await Users.findById(req.sessionUserData.userid);

        if (!checkValidUser) {
            const err = new Error(error_code.USER_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }

        let findObj = {
            _id: mongoose.Types.ObjectId(req.sessionUserData.userid),
            "role": "user",
            "permissions": {
                $elemMatch: {
                    "type": 'manager'
                }
            }
        };
        // if(req.query.search){
        //     let regex = new RegExp(req.query.search,'i');
        //     findObj.name = regex;
        // }

        let limit = 0;
        let pageNo = 0;

        if (req.query.limit && req.query.limit > 0) {
            limit = req.query.limit;
        }

        if (req.query.page && req.query.page > 0) {
            pageNo = (req.query.page) * limit
        }
        const allData = await Users.find(findObj, {
            permissions: 1
        })
            .populate({
                path: "permissions.teamId", select: 'name _id', populate: {
                    path: 'updated_by',
                    select: 'name'
                }
            })
            .sort({ "updatedAt": -1 })
            .skip(pageNo)
            .limit(limit).lean();
        if (allData[0]?.permissions) {
            const managerData = allData[0].permissions.filter(
                (obj) => {
                    if (obj.type == 'manager') {
                        return obj;
                    }
                })
            res.status(200).json({
                status: 1,
                error_code: error_code.NONE.CODE,
                body: managerData,
            });
        } else {
            const err = new Error(error_code.NO_DATA.CODE);
            err.statusCode = 0;
            throw err;
        }
    } catch (err) {
        console.log(err);
        next(err);
    }
};

exports.getCountsbyOrgTeamIdMob = async (req, res, next) => {
    try {
        if (!req.isAuth) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }
        if (!req.params.org_id) {
            const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        if (!req.params.team_id) {
            const err = new Error(error_code.TEAM_NOT_fOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        const checkValidUser = await Users.findById(req.sessionUserData.userid);

        if (!checkValidUser) {
            const err = new Error(error_code.USER_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        const teamName = await Teams.findById(req.params.team_id).select("name");
        let findObj = { organization_id: req.params.org_id };
        const teamData = await Teams.find(findObj)
            .populate({
                path: 'created_by',
                model: 'Users',
                select: 'name'
            })
            .sort({ "updatedAt": -1 })

        const teamCount = await Teams.countDocuments(findObj);
        //const teamList = teamData.map(async(m) => {
        let membersCount = await Users.countDocuments({
            permissions: {
                $elemMatch: {
                    type: "member",
                    organizationId: req.params.org_id,
                    teamId: req.params.team_id,
                    invitationStatus: "Accepted"
                }
            }
        });
        let managersCount = await Users.countDocuments({
            permissions: {
                $elemMatch: {
                    type: "manager",
                    organizationId: req.params.org_id,
                    teamId: req.params.team_id,
                    invitationStatus: "Accepted"
                }
            }
        });
        let formsCount = await Forms.countDocuments({
            organizationId: req.params.org_id,
            teams: req.params.team_id
        })

        let invitationCount = await Users.countDocuments({
            permissions: {
                $elemMatch: {
                    organizationId: req.params.org_id,
                    teamId: req.params.team_id,
                    invitationStatus: 'Pending'
                }
            }
        });
        let formObj = {
            organizationId: mongoose.Types.ObjectId(req.params.org_id),
            teams: req.params.team_id,
            isActive: true
        };
        const getForms = await Forms.find(formObj).select("_id").sort({ "_id": -1 }).lean();
        let responseCount = await Responses.countDocuments({
            organizationId: req.params.org_id,
            formId: getForms[0]?._id
        })
        return res.status(200).json({
            status: 1,
            error_code: error_code.NONE.CODE,
            membersCount: membersCount,
            managersCount: managersCount,
            formsCount: formsCount,
            invitationCount: invitationCount,
            responseCount: responseCount,
            teamName: teamName?.name,
        });

    } catch (err) {
        console.log(err);
        next(err);
    }
}

exports.addNewDeviceInTeamMob = async (req, res, next) => {
    try {
        if (!req.isAuth) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }
        if (!req.body.orgId || req.body.orgId == "") {
            const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        if (!req.body.countryCode || req.body.countryCode == "") {
            const err = new Error(error_code.COUNTRY_CODE_NOT_FOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        if (!req.body.mobile || req.body.mobile == "") {
            const err = new Error(error_code.PHONE_NOT_fOUND.CODE);
            err.statusCode = 400;
            throw err;
        }

        if (!req.body.teamId || req.body.teamId == "") {
            const err = new Error(error_code.TEAM_NOT_fOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        const checkValidUser = await Users.findById(req.sessionUserData.userid);

        if (!checkValidUser) {
            const err = new Error(error_code.USER_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }

        const checkObj = {
            mobile: req.body.mobile,
            countryCode: req.body.countryCode
        }

        const mobileCheck = await Users.findOne(checkObj);
        let role = '';
        if (req.body.isManager == true) {
            role = 'manager';
        } else {
            role = 'member';
        }
        if (mobileCheck) {
            const permissionCheck = await Users.find({
                mobile: req.body.mobile,
                countryCode: req.body.countryCode,
                permissions: {
                    $elemMatch: {
                        type: role,
                        teamId: mongoose.Types.ObjectId(req.body.teamId)
                    }
                }
            },
                {
                    permissions: 1
                });
            const verificationCheck = await Users.find({ mobile: req.body.mobile, countryCode: req.body.countryCode }, { isPhoneVerified: 1 });
            let invitationStatus;
            if (Array.isArray(verificationCheck) && verificationCheck.length > 0) {
                invitationStatus = verificationCheck[0].isPhoneVerified == true ? 'Accepted' : 'Pending';
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
                            updatedBy: req.sessionUserData.userid
                        }
                    }
                });
                if (!updatedPermission) {
                    const err = new Error(error_code.UNKNOWN_ERROR.CODE);
                    err.statusCode = 0;
                    throw err;
                }
            }
        } else {
            const setNewUser = await new Users({
                mobile: req.body.mobile,
                countryCode: req.body.countryCode,
                isPhoneVerified: false,
                category: "web",
                role: "user",
                permissions: [{
                    teamId: req.body.teamId,
                    type: role,
                    organizationId: req.body.orgId,
                    invitationStatus: 'Pending',
                    createdBy: req.sessionUserData.userid,
                    updatedBy: req.sessionUserData.userid
                }]
            }).save();
            console.log(setNewUser, "setNewUser");
        }
        res.status(200).json({
            status: 1,
            error_code: error_code.NONE.CODE
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
};

exports.deleteMemberTeamsMob = async (req, res, next) => {
    if (!req.isAuth) {
        const err = new Error(error_code.NOT_AUTHERIZED.CODE);
        err.statusCode = 0;
        throw err;
    }

    if (!req.body.teamId || req.body.teamId == "") {
        const err = new Error(error_code.TEAM_NOT_fOUND.CODE);
        err.statusCode = 400;
        throw err;
    }

    if (!req.body.userId || req.body.userId.length == 0) {
        const err = new Error(error_code.ID_NOT_FOUND.CODE);
        err.statusCode = 400;
        throw err;
    }

    if (!req.body.orgId || req.body.orgId == "") {
        const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
        err.statusCode = 400;
        throw err;
    }
    const checkValidUser = await Users.findById(req.sessionUserData.userid);

    if (!checkValidUser) {
        const err = new Error(error_code.USER_NOT_FOUND.CODE);
        err.statusCode = 0;
        throw err;
    }

    const updateUser = [];
    updateUser.push(await Users.update({
        _id: mongoose.Types.ObjectId(req.body.userId),
        permissions: {
            $elemMatch: {
                type: "member",
                organizationId: req.body.orgId,
                teamId: mongoose.Types.ObjectId(req.body.teamId)
            }
        }
    }, {
        $pull: {
            "permissions": {
                "teamId": mongoose.Types.ObjectId(req.body.teamId),
                "organizationId": req.body.orgId,
                "type": "member"
            }
        }
    }))
    const isUpdated = await Promise.all(updateUser);

    if (!isUpdated) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
    }

    res.status(200).json({
        status: 1,
        error_code: error_code.NONE.CODE
    });
};



exports.getMemberTeamsMob = async (req, res, next) => {
    try {
        if (!req.isAuth) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }
        if (!req.query.teamId || req.query.teamId == "") {
            const err = new Error(error_code.TEAM_NOT_fOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        if (!req.query.orgId || req.query.orgId == "") {
            const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        const checkValidUser = await Users.findById(req.sessionUserData.userid);
       
        console.log(checkValidUser.profilePic,"<<<<<<<checkValidUser")
         
      const profilePic =   checkValidUser.profilePic 

        if (!checkValidUser) {
            const err = new Error(error_code.USER_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        const teamName = await Teams.findById(req.query.teamId).select("name");
        let findObj = {
            permissions: {
                $elemMatch: {
                    type: "member",
                    organizationId: mongoose.Types.ObjectId(req.query.orgId),
                    teamId: mongoose.Types.ObjectId(req.query.teamId),
                    invitationStatus: "Accepted"
                }
            }
        };
        if (req.query.search) {
            let regex = new RegExp(req.query.search, 'i');
            findObj["$or"] = [{
                "name": regex
            }, {
                "mobile": regex
            }];
        }

        const getUsers = await Users.find(findObj, {
            name: 1,
            mobile: 1,
            permissions: 1,
            createdAt: 1
        }).sort({ "_id": -1 }).lean();
        if (!getUsers) {
            const err = new Error(error_code.UNKNOWN_ERROR.CODE);
            err.statusCode = 0;
            throw err;
        }
        const memberCount = await Users.countDocuments(findObj);

        const usersArray = getUsers.map((obj) => {
            let memberTeamCount = 0;

            obj.permissions.find((i) => {
                if (i.teamId && i.type == "member") {
                    memberTeamCount++;
                }
            })

            let countObj = { memberTeamCount: memberTeamCount }
            delete obj.permissions;
            return { ...obj, ...countObj }
        });
        return res.status(200).json({
            status: 1,
            users: usersArray,
            total: memberCount,
            teamName: teamName?.name,
            error_code: error_code.NONE.CODE,
            profilePic :profilePic
        });
    } catch (e) {
        next(e);
    }
};

exports.getManagerTeamsMob = async (req, res, next) => {
    try {
        if (!req.isAuth) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }
        if (!req.query.teamId || req.query.teamId == "") {
            const err = new Error(error_code.TEAM_NOT_fOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        if (!req.query.orgId || req.query.orgId == "") {
            const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        const checkValidUser = await Users.findById(req.sessionUserData.userid);

        if (!checkValidUser) {
            const err = new Error(error_code.USER_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        const teamName = await Teams.findById(req.query.teamId).select("name");
        let findObj = {
            permissions: {
                $elemMatch: {
                    type: "manager",
                    organizationId: mongoose.Types.ObjectId(req.query.orgId),
                    teamId: mongoose.Types.ObjectId(req.query.teamId),
                    invitationStatus: "Accepted"
                }
            }
        };
        if (req.query.search) {
            let regex = new RegExp(req.query.search, 'i');
            findObj["$or"] = [{
                "name": regex
            }, {
                "mobile": regex
            }];
        }

        const getUsers = await Users.find(findObj, {
            name: 1,
            mobile: 1,
            permissions: 1,
            createdAt: 1
        }).sort({ "_id": -1 }).lean();
        if (!getUsers) {
            const err = new Error(error_code.UNKNOWN_ERROR.CODE);
            err.statusCode = 0;
            throw err;
        }
        const managerCount = await Users.countDocuments(findObj);

        const usersArray = getUsers.map((obj) => {
            let managerTeamCount = 0;

            obj.permissions.find((i) => {
                if (i.teamId && i.type == "manager") {
                    managerTeamCount++;
                }
            })

            let countObj = { managerTeamCount: managerTeamCount }
            delete obj.permissions;
            return { ...obj, ...countObj }
        });
        return res.status(200).json({
            status: 1,
            users: usersArray,
            total: managerCount,
            teamName: teamName?.name,
            error_code: error_code.NONE.CODE
        });
    } catch (e) {
        next(e);
    }
};

exports.getFormTeamsMob = async (req, res, next) => {
    try {
        if (!req.isAuth) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }
        if (!req.query.teamId || req.query.teamId == "") {
            const err = new Error(error_code.TEAM_NOT_fOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        if (!req.query.orgId || req.query.orgId == "") {
            const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
            err.statusCode = 400;
            throw err;
        }

        const checkValidUser = await Users.findById(req.sessionUserData.userid);

        if (!checkValidUser) {
            const err = new Error(error_code.USER_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        const teamName = await Teams.findById(req.query.teamId).select("name");
        let findObj = {
            organizationId: mongoose.Types.ObjectId(req.query.orgId),
            teams: req.query.teamId,
            isActive: true
        };
        if (req.query.search) {
            let regex = new RegExp(req.query.search, 'i');
            findObj.title = regex;
        }
        const getForms = await Forms.find(findObj).select("title description").sort({ "_id": -1 }).lean();
        if (!getForms) {
            const err = new Error("No Forms found");
            err.statusCode = 500;
            throw err;
        }
        res.status(200).json({
            status: 1,
            error_code: error_code.NONE.CODE,
            data: getForms,
            teamName: teamName?.name,
        });
    } catch (e) {
        next(e);
    }
};

exports.getUserDeviceDetailMob = async (req, res, next) => {
    try {
        if (!req.isAuth) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }
        const checkValidUser = await Users.findById(req.sessionUserData.userid);
        
        if (!req.params.userId) {
            const err = new Error(error_code.USER_NOT_FOUND.CODE);
            err.statusCode = 400;
            throw err;
        }

        if (!checkValidUser) {
            const err = new Error(error_code.USER_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }

        const getUserData = await Users.findById(req.params.userId).select("name mobile deviceData profilePic");
        
        // let profilePic = req.file 
        // getUserData.profilePic = profilePic
        
        if (!getUserData) {
            const err = new Error("Unable to get device data");
            err.statusCode = 500;
            throw err;
        }
        res.status(200).json({
            status: 1,
            error_code: error_code.NONE.CODE,
            data: getUserData
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.getInvitationsMob = async (req, res, next) => {
    try {
        if (!req.isAuth) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }

        if (!req.params.orgId) {
            const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        if (!req.params.teamId) {
            const err = new Error(error_code.TEAM_NOT_FOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        const checkValidUser = await Users.findById(req.sessionUserData.userid);
        if (!checkValidUser) {
            const err = new Error(error_code.USER_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        const teamName = await Teams.findById(req.params.teamId).select("name");
        let findObj = {
            "permissions.organizationId": mongoose.Types.ObjectId(req.params.orgId),
            "permissions.teamId": mongoose.Types.ObjectId(req.params.teamId),
            "permissions.invitationStatus": 'Pending'
        };

        // if(req.query.status){
        //     findObj["permissions.invitationStatus"] = req.query.status;
        // } else {
        //     findObj["permissions.invitationStatus"] ='Pending';
        // }

        if (req.query.search) {
            let regex = new RegExp(req.query.search, 'i');
            findObj.mobile = regex;
        }

        const invitations = await Users.find(findObj);

        const invitationsOld = await Users.find(findObj, {
            "permissions": 1,
            "mobile": 1,
            "countryCode": 1,
            "name": 1,
            "updatedAt": 1
        }).populate({
            path: 'permissions.teamId',
            model: 'Teams',
            select: 'name'
        }).populate({
            path: 'permissions.createdBy',
            model: 'Users',
            select: 'name'
        });

        let data = [];

        // for(let i = 0; i < invitations.length; i++) {
        //     for(let j = 0; j < invitations[i].permissions.length; j++){
        //         data.push({
        //             _id: invitations[i]._id,
        //             mobile: invitations[i].mobile,
        //             countryCode: invitations[i].countryCode,
        //             // teamId: invitations[i].permissions.teamId?._id,
        //             // teamName: invitations[i].permissions.teamId?.name,
        //             invitationStatus: invitations[i].permissions[j].invitationStatus,
        //             sentTime: invitations[i].permissions[j].createdAt,
        //             sentBy: invitations[i].permissions[j].createdBy.name,
        //             acceptedBy: invitations[i].name,
        //             acceptedTime: invitations[i].updatedAt
        //         })
        //     }
        // }
        res.status(200).json({
            status: 1,
            data: invitations,
            teamName: teamName?.name,
            error_code: error_code.NONE.CODE
        });
    } catch (err) {
        next(err);
    }
};

exports.deleteInvitationsMob = async (req, res, next) => {
    try {
        if (!req.isAuth) {
            const err = new Error(error_code.NOT_AUTHERIZED.CODE);
            err.statusCode = 0;
            throw err;
        }
        if (!req.params.orgId) {
            const err = new Error(error_code.ID_NOT_FOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        if (!req.body.teamId) {
            const err = new Error(error_code.TEAM_NOT_fOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        if (!req.body.userId) {
            const err = new Error(error_code.USER_NOT_fOUND.CODE);
            err.statusCode = 400;
            throw err;
        }
        const checkValidUser = await Users.findById(req.sessionUserData.userid);

        if (!checkValidUser) {
            const err = new Error(error_code.USER_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }

        let promiseArr;
        //promiseArr.push(await Users.update({ 
        promiseArr = await Users.updateOne(
            {
                _id: req.body.userId,
                "permissions.teamId": req.body.teamId,
                "permissions.organizationID": req.params.orgId
            },
            {
                $set: {
                    "permissions.$.invitationStatus": "Deleted"
                }
            });
        res.status(200).json({
            status: 1,
            error_code: error_code.NONE.CODE
        });

        // Promise.all(promiseArr).then((result) => { 
        //     res.status(200).json({
        //         status: 1,
        //         error_code: 0
        //     })
        // }); 
    } catch (err) {
        next(err);
    }
};