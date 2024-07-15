const express = require('express')

const Excel = require('../controllers/excel-import');
const upload = require('../middleware/multer');
const authMiddleware = require('../middleware/auth');
const error_code = require("../config/error-code");

const router = express.Router();

router.post('/import', upload.fields([{ name: 'uploadingFile', maxCount: 1 }]) , async (req, res, next) => {
    try {
        if (!req.files.uploadingFile) {
            const err = new Error(error_code.RESPONSE_IMPORT_FILE_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        if (!req.body.formId || req.body.formId == "") {
            const err = new Error(error_code.FORM_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        if (!req.body.orgId || req.body.orgId == "") {
            const err = new Error(error_code.ORG_NAME_NOT_FOUND.CODE);
            err.statusCode = 0;
            throw err;
        }
        var excel = new Excel();
        const file = await excel.importMainRes(req.files.uploadingFile[0].path, req.body);
        if(file?.message == 'Uploaded') {
            return res.send(file);
        } else {
            return res.send({
                status: 200,
                message: "something went wrong"
            })
        }
    } catch (err) {
        next(err);
    }
});

router.post('/import-form', [authMiddleware.auth,upload.fields([{ name: 'uploadingFile', maxCount: 1 }])] , async (req, res) => {
    try { 
        if(!req.body.orgId){
            return res.send({
                status: 0,
                message: "Organization doesn't exist"
            })
        }
        if(Array.isArray(req.files.uploadingFile) && req.files.uploadingFile.length > 0 && req.files.uploadingFile[0].mimetype=='text/csv'){
            var excel = new Excel();
        
            const file = await excel.importForm(req.files.uploadingFile[0], req.body,req.sessionUserData);
            
            if(file) {
                return res.send(file);
            } else {
                return res.send({
                    status: 200,
                    message: "One or more questions contains invalid values. Please check and reupload the file."
                })
            }
        } else {
            return res.send({
                status: 0,
                message: "Please select a csv file."
            })
        }
        
    } catch (err) {
        console.log(err);
        res.send({
            status: err,
            message: "One or more questions contains invalid values. Please check and reupload the file."
        })
    }
});

router.post('/import-group-res', upload.fields([{ name: 'uploadingFile', maxCount: 1 }]) , async (req, res, next) => {
    try {
        const excel = new Excel();
        const file = await excel.importGroupRes(req.files.uploadingFile[0], req.body);
        if(file.message == 'Uploaded') {
            return res.send(file);
        } else {
            return res.send({
                status: 0,
                message: "something went wrong"
            })
        }
    } catch (err) {
        console.log(err);
        res.send({
            status: err,
            message: "Please import correct group response file"
        })
    }
})
// router.post('/import', async (req, res) => {
//     try {
//         var excel = new Excel();
//         const file = excel.import();
//         res.send({
//             status: 200,
//             message: "Imported Successfully"
//         })
//     } catch (err) {
//         console.log(err);
//         res.send({
//             status: err,
//             message: "something went wrong"
//         })
//     }
// });

module.exports = router;
