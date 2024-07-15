const XLSX = require("xlsx");
const Users = require("../models/users");
const Forms = require("../models/form");
const Version = require("../models/version");
var moment = require("moment");
var fs = require("fs");
const downloadFileHelper = require("../helper/file-download");
const Response = require("../models/response");
const error_code = require("../config/error-code");
const countryCodes = require("../config/country-code");
const { default: mongoose } = require("mongoose");

class ExcelClass {
  async importMainRes(filePath, mainBody) {
    try {
      // let countInserted = 0;
      // let countIgnored = 0;
      // let countUpdated = 0;
      // let totalRecords = 0;
      const workbook = XLSX.readFile("./" + filePath, {
        type: "binary",
        cellDates: false,
        codepage: 65001,
      });
      let worksheet = workbook.Sheets;
      let jsonData = XLSX.utils.sheet_to_json(worksheet["Sheet1"], {
        raw: false,
        defval: "",
      });

      ///////////////////////////////////////////
      // const getFormData = await Forms.findOne({_id: mainBody.formId});
      const getFormData = await Forms.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(mainBody.formId) } },
        {
          $project: {
            questions: {
              $filter: {
                input: "$questions",
                as: "questions",
                cond: {
                  $and: [
                    { $not: { $eq: ["$$questions.isGroupChild", true] } },
                    {
                      $not: {
                        $in: [
                          "$$questions.questionType",
                          [
                            "grp_no_repeat",
                            "grp_number",
                            "grp_choice",
                            "grp_custom",
                          ],
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ]);
      if (!getFormData) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }

      const allImportingData = [];
      for (let row of jsonData) {
        const submittedKey = Object.keys(row).filter(
          (key) =>
            key.split(" ")[0] + " " + key.split(" ")[1] === "Submitted Time"
        )[0];
        const modifiedKey = Object.keys(row).filter(
          (key) =>
            key.split(" ")[0] + " " + key.split(" ")[1] === "Last Modified"
        )[0];

        const total_minutes = new Date().getTimezoneOffset() / -1;
        const hours = total_minutes / 60;
        const totalHour =
          ("" + hours).split(".")[0].length === 2
            ? ("" + hours).split(".")[0]
            : ("0" + hours).split(".")[0];
        const minutes = total_minutes % 60;
        const finalOffset = `GMT${
          Math.sign(+totalHour) === 1 ? "+" : "-"
        }${Math.abs(totalHour)}:${Math.abs(minutes)}`;

        const created_on = row[submittedKey]
          ? moment(row[submittedKey].replace("/", "-"), "DD-MM-YYYY").format()
          : undefined;
        const updated_on = row[modifiedKey]
          ? moment(row[modifiedKey].replace("/", "-"), "DD-MM-YYYY").format()
          : undefined;

        const time_zone = {};
        time_zone["offset"] = finalOffset;
        time_zone["name"] = new Date()
          .toLocaleDateString("en-US", {
            day: "2-digit",
            timeZoneName: "long",
          })
          .slice(4);

        const submittedBy = {};
        row["Username"] = parseFloat(row["Username"]).toString();
        const getUserId = await Users.findOne(
          {
            mobile: {
              $regex: row["Username"].slice(4, row["Username"].length),
            },
          },
          { _id: 1 }
        );
        if (!getUserId) {
          const err = new Error(error_code.USER_NOT_FOUND.CODE);
          err.statusCode = 0;
          throw err;
        }

        submittedBy["userId"] = getUserId?._id;
        submittedBy["deviceData"] = {
          ip: "::1",
          androidVersion: "13.0.4",
          batteryLevel: "19.0",
          brand: "Redmi",
          hardware: "qcom",
          carrierAvailable: "airtel",
          isRooted: "false",
          lastFormDiffUpdatedAt: "Sep 2, 2022 11:27:44 AM",
          lastVersionCode: "20040",
          model: "Redmi Note 9 Pro Max",
          networkConnected: "Wifi",
          product: "excalibur_in",
          sdkVersion: "29",
          totalRam: "5853216768 KB",
        };

        const time_spent =
          row["Time Spent (hh:mm:ss)"] && row["Time Spent (hh:mm:ss)"] !== "NA"
            ? this.timeToTimestamp(row["Time Spent (hh:mm:ss)"])
            : undefined;
        const response_note = row["Response Note"]
          ? row["Response Note"]
          : undefined;
        const response_tag = row["Tags"] ? row["Tags"].toLowerCase() : "no_tag";
        const form_revision = [
          {
            createdIn: row["Form Revision Created In"]
              ? "v" + row["Form Revision Created In"]
              : "v1",
            submittedIn: row["Form Revision Submitted In"]
              ? "v" + row["Form Revision Submitted In"]
              : "v1",
            lastModifiedIn: row["Form Revision Submitted In"]
              ? "v" + row["Form Revision Submitted In"]
              : "v1",
          },
        ];

        const keyObj = Object.keys(row).slice(
          Object.keys(row).indexOf("Time Spent (hh:mm:ss)") + 1,
          Object.keys(row).length
        );

        const responses = [];
        let idx = 0;
        for (let formQues of getFormData[0].questions) {
          const resValueObj = {};
          // console.log(formQues.title);
          // console.log(row[keyObj[idx]], " + ", keyObj[idx]);
          // console.log("------------------------");

          if (formQues.questionType === "mcq_single") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              if (moment(row[keyObj[idx]]).format() !== "Invalid date") {
                resValueObj.value = formQues.properties.options.filter(
                  (opt) =>
                    moment(opt.label).format() ==
                    moment(row[keyObj[idx]]).format()
                )[0].id;
              } else {
                const optToMatch = row[keyObj[idx]]
                  .replace(/[^a-zA-Z0-9 ]/g, "")
                  .trim();
                resValueObj.value = formQues.properties.options.filter((opt) =>
                  opt.label
                    .replace(/[^a-zA-Z0-9 ]/g, "")
                    .match(new RegExp(optToMatch))
                )[0].id;
              }
            }
            idx++;
          } else if (formQues.questionType === "mcq_multiple") {
            let title = keyObj.filter(
              (val) => val.split("_")[0] === formQues.title
            );
            if (!title.length) {
              title = keyObj.filter((val) => {
                let h = val.split("_");
                h.pop();
                return h.join("_") === formQues.keyword;
              });
            }
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const mcqMultiRes = [];
              for (let i = 0; i < title.length; i++) {
                if (row[title[i]] === "1" || row[title[i]] === "Yes") {
                  // mcqMultiRes.push(formQues.properties.options.filter(val=>val.label===title[i].split("_")[1])[0].id);
                  const optToMatch = title[i]
                    .split("_")
                    [title[i].split("_").length - 1].replace(
                      /[^a-zA-Z0-9 ]/g,
                      ""
                    )
                    .trim();
                  // console.log(optToMatch);
                  mcqMultiRes.push(
                    formQues.properties.options.filter((val) =>
                      val.label
                        .replace(/[^a-zA-Z0-9 ]/g, "")
                        .match(new RegExp(optToMatch))
                    )[0].id
                  );
                }
              }
              resValueObj.value = mcqMultiRes;
            }
            idx += title.length;
          } else if (formQues.questionType === "text") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "number") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "location") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const title = keyObj.filter(
                (val) => val.split("_")[0] === formQues.title
              );
              if (!title.length) {
                title = keyObj.filter((val) => {
                  let h = val.split("_");
                  h.pop();
                  return h.join("_") === formQues.keyword;
                });
              }
              const locRes = {};
              if (title.length) {
                locRes.latitude = parseFloat(row[`${formQues.title}_latitude`]);
                locRes.longitude = parseFloat(
                  row[`${formQues.title}_longitude`]
                );
                locRes.accuracy = parseFloat(row[`${formQues.title}_accuracy`]);
                locRes.provider = "fused";
              }
              resValueObj.value = locRes;
              idx += 3;
            } else {
              idx += 3;
            }
          } else if (formQues.questionType === "date") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "time") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "note") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "signature") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const imgType = row[keyObj[idx]].split(".");
              if (
                imgType[imgType.length - 1] === "jpeg" ||
                imgType[imgType.length - 1] === "jpg" ||
                imgType[imgType.length - 1] === "png"
              ) {
                const mediaData = await downloadFileHelper.downloadFile(
                  row[keyObj[idx]],
                  Date.now() +
                    "." +
                    row[keyObj[idx]].split(".")[
                      row[keyObj[idx]].split(".").length - 1
                    ]
                );
                const mediaResValue = {
                  url: mediaData,
                  mimeType: `image/${
                    mediaData.split(".")[mediaData.split(".").length - 1]
                  }`,
                };
                resValueObj.value = mediaResValue;
              }
            }
            idx++;
          } else if (formQues.questionType === "section_break") {
            // if (!(row[keyObj[idx]]==="" || row[keyObj[idx]]==="N/A")) {
            resValueObj.value = formQues.title;
            // }
            idx++;
          } else if (formQues.questionType === "area_on_map") {
            idx++;
          } else if (formQues.questionType === "distance_on_map") {
            idx++;
          }
          // ------------dropdown
          else if (formQues.questionType === "dropdown") {
            idx++;
          } else if (formQues.questionType === "image") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const imgType = row[keyObj[idx]].split(".");
              if (
                imgType[imgType.length - 1] === "jpeg" ||
                imgType[imgType.length - 1] === "jpg" ||
                imgType[imgType.length - 1] === "png"
              ) {
                const mediaData = await downloadFileHelper.downloadFile(
                  row[keyObj[idx]],
                  Date.now() +
                    "." +
                    row[keyObj[idx]].split(".")[
                      row[keyObj[idx]].split(".").length - 1
                    ]
                );
                const mediaResValue = {
                  url: mediaData,
                  mimeType: `image/${
                    mediaData.split(".")[mediaData.split(".").length - 1]
                  }`,
                };
                resValueObj.value = mediaResValue;
              }
            }
            idx++;
          }
          // ---------------multiple_images
          else if (formQues.questionType === "multiple_image") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const imgType = row[keyObj[idx]].split(".");
              if (
                imgType[imgType.length - 1] === "jpeg" ||
                imgType[imgType.length - 1] === "jpg" ||
                imgType[imgType.length - 1] === "png"
              ) {
                const mediaData = await downloadFileHelper.downloadFile(
                  row[keyObj[idx]],
                  Date.now() +
                    "." +
                    row[keyObj[idx]].split(".")[
                      row[keyObj[idx]].split(".").length - 1
                    ]
                );
                const mediaResValue = {
                  url: mediaData,
                  mimeType: `image/${
                    mediaData.split(".")[mediaData.split(".").length - 1]
                  }`,
                };
                resValueObj.value = mediaResValue;
              }
            }
            idx++;
          }
          // ---------------multiple_images
          else if (formQues.questionType === "image_geo_tag") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const imgType = row[keyObj[idx]].split(".");
              if (
                imgType[imgType.length - 1] === "jpeg" ||
                imgType[imgType.length - 1] === "jpg" ||
                imgType[imgType.length - 1] === "png"
              ) {
                const mediaData = await downloadFileHelper.downloadFile(
                  row[keyObj[idx]],
                  Date.now() +
                    "." +
                    row[keyObj[idx]].split(".")[
                      row[keyObj[idx]].split(".").length - 1
                    ]
                );
                const mediaResValue = {
                  url: mediaData,
                  mimeType: `image/${
                    mediaData.split(".")[mediaData.split(".").length - 1]
                  }`,
                };
                resValueObj.value = mediaResValue;
              }
            }
            idx++;
          }
          // --------------------multiple image geo tag-------------------------------
          else if (formQues.questionType === "multiple_image_geo_tag") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const imgType = row[keyObj[idx]].split(".");
              if (
                imgType[imgType.length - 1] === "jpeg" ||
                imgType[imgType.length - 1] === "jpg" ||
                imgType[imgType.length - 1] === "png"
              ) {
                const mediaData = await downloadFileHelper.downloadFile(
                  row[keyObj[idx]],
                  Date.now() +
                    "." +
                    row[keyObj[idx]].split(".")[
                      row[keyObj[idx]].split(".").length - 1
                    ]
                );
                const mediaResValue = {
                  url: mediaData,
                  mimeType: `image/${
                    mediaData.split(".")[mediaData.split(".").length - 1]
                  }`,
                };
                resValueObj.value = mediaResValue;
              }
            }
            idx++;
          }
          // --------------------multiple image geo tag-------------------------------
          else if (formQues.questionType === "phone") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "email") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "audio") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const mediaData = await downloadFileHelper.downloadFile(
                row[keyObj[idx]],
                Date.now() +
                  "." +
                  row[keyObj[idx]].split(".")[
                    row[keyObj[idx]].split(".").length - 1
                  ]
              );
              const mediaResValue = {
                url: mediaData,
                mimeType: `audio/${
                  mediaData.split(".")[mediaData.split(".").length - 1]
                }`,
              };
              resValueObj.value = mediaResValue;
            }
            idx++;
          } else if (formQues.questionType === "video") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const mediaData = await downloadFileHelper.downloadFile(
                row[keyObj[idx]],
                Date.now() +
                  "." +
                  row[keyObj[idx]].split(".")[
                    row[keyObj[idx]].split(".").length - 1
                  ]
              );
              const mediaResValue = {
                url: mediaData,
                mimeType: `video/${
                  mediaData.split(".")[mediaData.split(".").length - 1]
                }`,
              };
              resValueObj.value = mediaResValue;
            }
            idx++;
          } else if (formQues.questionType === "file_upload") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const mediaData = await downloadFileHelper.downloadFile(
                row[keyObj[idx]],
                Date.now() +
                  "." +
                  row[keyObj[idx]].split(".")[
                    row[keyObj[idx]].split(".").length - 1
                  ]
              );
              const mediaResValue = {
                url: mediaData,
                mimeType: `file/${
                  mediaData.split(".")[mediaData.split(".").length - 1]
                }`,
              };
              resValueObj.value = mediaResValue;
            }
            idx++;
          }
          // -------multiple File----------
          else if (formQues.questionType === "multiple_file_upload") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const mediaData = await downloadFileHelper.downloadFile(
                row[keyObj[idx]],
                Date.now() +
                  "." +
                  row[keyObj[idx]].split(".")[
                    row[keyObj[idx]].split(".").length - 1
                  ]
              );
              const mediaResValue = {
                url: mediaData,
                mimeType: `file/${
                  mediaData.split(".")[mediaData.split(".").length - 1]
                }`,
              };
              resValueObj.value = mediaResValue;
            }
            idx++;
          }
          // -------multiple File----------
          else if (formQues.questionType === "likert_scale") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "scale") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "rating") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "monitoring") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          }
           else if (formQues.questionType === "barcode") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          }
           else if (formQues.questionType === "live_tracking") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          }

          if (Object.keys(resValueObj).length !== 0) {
            const resObj = {
              answer: resValueObj,
              status: "active",
              questionId: formQues._id,
              createdBy: getUserId?._id,
              createdOnDeviceAt: created_on,
              lastModifiedOnDeviceAt: updated_on,
              questionType: formQues.questionType,
              isFlagged: false,
              isParent: false,
            };
            responses.push(resObj);
          }
        }

        const putResponse = {
          // importedId: row["Response ID"],
          timeZone: time_zone,
          formId: mainBody.formId,
          versionNumber: 1, ///////////// prob
          tag: response_tag,
          timeSpent: time_spent,
          formRevision: form_revision,
          submittedBy: submittedBy,
          organizationId: mainBody.orgId,
          responseNote: response_note,
          responses: responses,
          submittedAt: created_on,
          createdOn: created_on,
          updatedOn: updated_on,
        };
        const upsertAllResponse = await Response.updateOne(
          { importedId: row["Response ID"], formId: mainBody.formId },
          putResponse,
          { upsert: true }
        );
        if (!upsertAllResponse) {
          const err = new Error(error_code.UNKNOWN_ERROR.CODE);
          err.statusCode = 0;
          throw err;
        }
        allImportingData.push(upsertAllResponse);
      }

      return Promise.resolve({
        total: jsonData.length,
        inserted: allImportingData.filter((val) => val?.upsertedCount === 1)
          .length,
        updated: allImportingData.filter((val) => val?.modifiedCount === 1)
          .length,
        message: "Uploaded",
        status: 1,
      });
    } catch (error) {
      console.log(error.message);
      console.log(error.stack);
    }
  }

  async importForm(file, mainBody, sessionUserData) {
    try {
      const workbook = XLSX.readFile("./" + file.path, {
        type: "binary",
        cellDates: false,
        codepage: 65001,
      });

      let worksheet = workbook.Sheets;

      let jsonData = XLSX.utils.sheet_to_json(worksheet["Sheet1"], {
        raw: false,
      });
      var groupedArr = jsonData.reduce(function (results, data) {
        (results[data.Id] = results[data.Id] || []).push(data);
        return results;
      }, {});

      let childQuestionsArr = [];
      let groupDependentsOn = {};
      let parentId;
      let formObj = {
        title: file.originalname.split(".")[0],
        formStatus: "draft",
        isActive: true,
        organizationId: mainBody.orgId,
        versionNumber: 1,
        newVersionNumber: 1,
        publishedAt: new Date(),
        createdAt: new Date(),
        createdBy: sessionUserData.userid,
        updatedAt: new Date(),
        updatedBy: sessionUserData.userid,
      };

      formObj.questions = [];
      for (let props in groupedArr) {
        let jsonData = groupedArr[props];
        let optionArray = [];
        for (let i = 0; i < jsonData.length; i++) {
          const questionId = jsonData[i]["Id"];
          const order = jsonData[i]["Order"];
          const questionType = jsonData[i]["Question Type"];
          const questionTitle = jsonData[i]["Question Title"];
          const description = jsonData[i]["Description"]
            ? jsonData[i]["Description"]
            : null;
          const keyword = jsonData[i]["Keyword"]
            ? jsonData[i]["Keyword"]
            : null;
          const mandatory =
            jsonData[i]["Mandatory"] === "true" ||
            jsonData[i]["Mandatory"] === "TRUE";
          const lowerLimit = jsonData[i]["Lower Limit"];
          const upperLimit = jsonData[i]["Upper Limit"];
          const imageQuality = jsonData[i]["Image Quality"];
          const accuracy = jsonData[i]["Accuracy"];
          const markOnMap =
            jsonData[i]["Mark On Map"] === "true" ||
            jsonData[i]["Mark On Map"] === "TRUE";
          const galleryUploadAllowed =
            jsonData[i]["Gallery Upload allowed"] === "true" ||
            jsonData[i]["Gallery Upload allowed"] === "TRUE";
          const allowCaption =
            jsonData[i]["Allow Caption"] === "true" ||
            jsonData[i]["Allow Caption"] === "TRUE";
          const allowDecimalNumber =
            jsonData[i]["Allow Decimal Number"] === "true" ||
            jsonData[i]["Allow Decimal Number"] === "TRUE";
          const dateFormat = jsonData[i]["Date Format"];
          const timeFormat = jsonData[i]["Time Format"];
          const defaultCountry = jsonData[i]["Default Country"];
          const groupedQuestionChild =
            jsonData[i]["Grouped Question Child"] === "true" ||
            jsonData[i]["Grouped Question Child"] === "TRUE";
          const groupType = jsonData[i]["Group Type"];
          const groupLabels = jsonData[i]["Group Labels"];
          const groupLabelsDependentOn =
            jsonData[i]["Group Labels Dependent On"];
          const option = jsonData[i]["Option"];
          const optionActive =
            jsonData[i]["Option Active"] === "true" ||
            jsonData[i]["Option Active"] === "TRUE";
          const optionType = jsonData[i]["Option Type"];
          const specialOptionCode = jsonData[i]["Special Option Code"];
          const code = jsonData[i]["Code"];
          const helpImageURL = jsonData[i]["Help Image"];
          const optionImage = jsonData[i]["Option Image"];
          const validationType = jsonData[i]["Validation Type"];
          const measurementUnit = jsonData[i]["Measurement Unit"];
          const audioMuted = jsonData[i]["Audio Muted"];
          const ratingType = jsonData[i]["Rating Type"];
          const stepSize = jsonData[i]["Step Size"];
          let questionObj = {
            _id: mongoose.Types.ObjectId(),
            title: questionTitle,
            description: description,
            keyword: keyword,
            isRequired: mandatory,
            properties: {},
            helpImageURL: {
              path: helpImageURL,
              mimetype: "",
            },
            displayOrder: order,
            isGroupChild: groupedQuestionChild,
            importId: questionId,
          };

          if (questionType === "Section Break") {
            questionObj.questionType = "section_break";
            formObj.questions.push(questionObj);
          } else if (questionType === "Choice") {
            if (upperLimit == 1) {
              questionObj.questionType = "mcq_single";
            } else {
              questionObj.questionType = "mcq_multiple";
            }
            optionArray.push({
              label: option,
              code: code,
              isActive: optionActive,
              type: optionType,
              id: mongoose.Types.ObjectId(),
              optImg: optionImage ? optionImage : "",
            });
            let isOptionCode;
            let isSpecialOption;
            if (isOptionCode && isOptionCode == true) {
              isOptionCode = true;
            } else {
              isOptionCode = code ? true : false;
            }
            if (isSpecialOption && isSpecialOption == true) {
              isSpecialOption = true;
            } else {
              isSpecialOption = specialOptionCode ? true : false;
            }

            questionObj.properties = {
              options: optionArray,
              isOptionRandomized: false,
              isOptionCode: isOptionCode,
              isSpecialOption: isSpecialOption,
              minLimit: lowerLimit,
              maxLimit: upperLimit,
            };

            if (i == jsonData.length - 1) formObj.questions.push(questionObj);
          } else if (questionType === "Text") {
            questionObj.questionType = "text";
            questionObj.properties.maxLimit = upperLimit;
            formObj.questions.push(questionObj);
          } else if (questionType === "Image") {
            questionObj.questionType = "image";
            questionObj.properties.imgQuality = imageQuality;
            questionObj.properties.galleryAllowed = galleryUploadAllowed;
            formObj.questions.push(questionObj);
          }
          // ---------------multiple_images
          else if (questionType === "Multiple Image") {
            questionObj.questionType = "multiple_image";
            questionObj.properties.imgQuality = imageQuality;
            questionObj.properties.galleryAllowed = galleryUploadAllowed;
            formObj.questions.push(questionObj);
          }
          // ---------------multiple_images
          else if (questionType === "Location") {
            questionObj.questionType = "location";
            questionObj.properties.isMap = markOnMap;
            questionObj.properties.accuracy = accuracy;
            formObj.questions.push(questionObj);
          } else if (questionType === "Area on Map") {
            questionObj.questionType = "area_on_map";
            questionObj.properties.measurementUnit = measurementUnit
              ? measurementUnit
              : "Squared meter (m^2)";
            formObj.questions.push(questionObj);
          } else if (questionType === "Date") {
            questionObj.questionType = "date";
            questionObj.properties.dateFormat = dateFormat.toUpperCase();
            formObj.questions.push(questionObj);
          } else if (questionType === "Signature") {
            questionObj.questionType = "signature";
            formObj.questions.push(questionObj);
          } else if (questionType === "Number") {
            questionObj.questionType = "number";
            questionObj.properties.validationType = validationType
              ? validationType
              : "valueBased";
            questionObj.properties.isDecimalAllowed = allowDecimalNumber;
            questionObj.properties.maxLimit = Number(upperLimit);
            questionObj.properties.minLimit = lowerLimit
              ? Number(lowerLimit)
              : 0;
            questionObj.properties.isWarningEnabled = false;
            formObj.questions.push(questionObj);
          } else if (questionType === "Time") {
            questionObj.questionType = "time";
            if (timeFormat == "12") {
              questionObj.properties.timeFormat = "12 Hour (AM/PM)";
            } else if (timeFormat == "24") {
              questionObj.properties.timeFormat = "24 Hour";
            }
            formObj.questions.push(questionObj);
          } else if (questionType === "Note") {
            questionObj.questionType = "note";
            formObj.questions.push(questionObj);
          } else if (questionType === "Distance on Map") {
            questionObj.questionType = "distance_on_map";
            questionObj.properties.measurementUnit = measurementUnit
              ? measurementUnit
              : "Meter (m)";
            formObj.questions.push(questionObj);
          }
          // ------------dropdown
          else if (questionType === "dropdown") {
            questionObj.questionType = "dropdown";

            formObj.questions.push(questionObj);
          } else if (questionType === "Image Geo Tag") {
            questionObj.questionType = "image_geo_tag";
            questionObj.properties.imageResolution = imageQuality;
            questionObj.properties.locationAccuracy = accuracy;
            formObj.questions.push(questionObj);
          }
          // ---------------multiple image geo tag-------
          else if(questionType==="Multiple Image Geo Tag"){
            questionObj.questionType = "multiple_image_geo_tag";
            questionObj.properties.imageResolution = imageQuality;
            questionObj.properties.locationAccuracy = accuracy;
            formObj.questions.push(questionObj);
          }
          // ---------------multiple image geo tag-------
          else if (questionType === "Phone") {
            questionObj.questionType = "phone";
            if (defaultCountry) {
              let countryName = defaultCountry.replace(/[^a-z]+/i, "");
              let countryCode = countryCodes.find(
                (o) => o.country == countryName
              );
              if (countryCode && Object.keys(countryCode).length !== 0) {
                questionObj.properties.countryCode =
                  countryCode.calling_code.toString();
              } else {
                questionObj.properties.countryCode = "91";
              }
            } else {
              questionObj.properties.countryCode = "91";
            }

            formObj.questions.push(questionObj);
          } else if (questionType === "Email") {
            questionObj.questionType = "email";
            formObj.questions.push(questionObj);
          } else if (questionType === "Audio") {
            questionObj.questionType = "audio";
            formObj.questions.push(questionObj);
          } else if (questionType === "Video") {
            questionObj.questionType = "video";
            questionObj.properties.isAudioMuted = audioMuted
              ? audioMuted
              : false;
            if (imageQuality == "low") {
              questionObj.properties.videoResolution = "480p";
            } else if (imageQuality == "medium") {
              questionObj.properties.videoResolution = "720p";
            } else if (imageQuality == "high") {
              questionObj.properties.videoResolution = "1080p";
            }
            formObj.questions.push(questionObj);
          } else if (questionType === "File Upload") {
            questionObj.questionType = "file_upload";
            formObj.questions.push(questionObj);
          }
          // -------multiple File----------
          else if (questionType === "Multiple File Upload") {
            questionObj.questionType = "multiple_file_upload";
            formObj.questions.push(questionObj);
          }
          // -------multiple File----------
          else if (questionType === "Likert Scale") {
            questionObj.questionType = "likert_scale";
            questionObj.properties.ratingType = ratingType
              ? ratingType
              : "likert";
            questionObj.properties.options = [
              { label: "Extremely Unsatisfied", code: "" },
              { label: "Unsatisfied", code: "" },
              { label: "Neutral", code: "" },
              { label: "Satisfied", code: "" },
              { label: "Extremely Satisfied", code: "" },
            ];
            formObj.questions.push(questionObj);
          } else if (questionType === "Scale") {
            questionObj.questionType = "scale";
            questionObj.properties.minLimit = lowerLimit;
            questionObj.properties.maxLimit = upperLimit;
            questionObj.properties.stepSize = stepSize ? stepSize : 1;
            formObj.questions.push(questionObj);
          }
           else if (questionType === "Rating") {
            questionObj.questionType = "rating";
            formObj.questions.push(questionObj);
          }
           else if (questionType === "Monitoring") {
            questionObj.questionType = "monitoring";
            formObj.questions.push(questionObj);
          }
           else if (questionType === "Barcode") {
            questionObj.questionType = "barcode";
            formObj.questions.push(questionObj);
          }
           else if (questionType === "Live Tracking") {
            questionObj.questionType = "live_tracking";
            formObj.questions.push(questionObj);
          }

          if (questionType === "Group" || groupedQuestionChild) {
            questionObj.groupQuestions = {
              parantSettings: {
                groupLabels: [],
                criteria: {},
              },
              childQuestions: [],
            };
            if (groupType && groupType.toLowerCase() == "no repeat") {
              questionObj.questionType = "grp_no_repeat";
              formObj.questions.push(questionObj);
              parentId = questionObj._id;
            } else if (groupType && groupType.toLowerCase() == "numerical") {
              questionObj.questionType = "grp_number";
              groupDependentsOn[groupLabelsDependentOn] = questionObj._id;
              formObj.questions.push(questionObj);
              parentId = questionObj._id;
            } else if (
              groupType &&
              (groupType.toLowerCase() == "selected" ||
                groupType.toLowerCase() == "notselected")
            ) {
              questionObj.questionType = "grp_choice";
              groupDependentsOn[groupLabelsDependentOn] = questionObj._id;
              if (groupType.toLowerCase() == "selected") {
                questionObj.groupQuestions.parantSettings.criteria.selection = true;
              } else if (groupType.toLowerCase() == "notselected") {
                questionObj.groupQuestions.parantSettings.criteria.selection = false;
              }
              formObj.questions.push(questionObj);
              parentId = questionObj._id;
            } else if (groupType && groupType.toLowerCase() == "static") {
              questionObj.questionType = "grp_custom";
              questionObj.groupQuestions.parantSettings.groupLabels =
                groupLabels.split(",");
              formObj.questions.push(questionObj);
              parentId = questionObj._id;
            } else {
              childQuestionsArr.push({
                _id: questionObj._id,
                parentId: parentId,
                order: order,
              });
            }
          }
        }
      }

      if (formObj.questions.length) {
        let parantQuestionId = {};
        //console.log(formObj.questions); return;
        var groupChildArr = childQuestionsArr.reduce(function (results, data) {
          (results[data.parentId] = results[data.parentId] || []).push(
            data._id
          );
          return results;
        }, {});

        for (let i = 0; i < formObj.questions.length; i++) {
          if (formObj.questions[i]._id in groupChildArr) {
            formObj.questions[i].groupQuestions.childQuestions =
              groupChildArr[formObj.questions[i]._id];
          }
          for (let id in groupDependentsOn) {
            if (id == formObj.questions[i].importId) {
              parantQuestionId[groupDependentsOn[id]] =
                formObj.questions[i]._id;
              break;
            }
          }
          delete formObj.questions[i].importId;
        }

        for (let i = 0; i < formObj.questions.length; i++) {
          for (let id in parantQuestionId) {
            if (id == formObj.questions[i]._id) {
              formObj.questions[i].groupQuestions.parantSettings.questionId =
                parantQuestionId[id];
              break;
            }
          }
        }

        const insertForm = await new Forms(formObj).save();
        formObj.formId = insertForm._id;
        const insertVersion = await new Version(formObj).save();
        let skippedQuestions =
          Object.keys(groupedArr).length - formObj.questions.length;
        skippedQuestions = skippedQuestions < 0 ? 0 : skippedQuestions;
        return Promise.resolve({
          message: "Form imported successfully",
          totalQuestions: formObj.questions.length,
          skipped: skippedQuestions,
          status: 1,
          id: formObj.formId,
        });
      } else {
        return Promise.resolve({
          message:
            "The uploaded file doesn't have any questions. Please check the type and format of the csv file.",
          status: 0,
        });
      }
    } catch (error) {
      console.log(error);
    }
  }

  async importGroupRes(file, mainBody) {
    try {
      const workbook = XLSX.readFile("./" + file.path, {
        type: "binary",
        cellDates: false,
        codepage: 65001,
      });
      let worksheet = workbook.Sheets;
      let jsonData = XLSX.utils.sheet_to_json(worksheet["Sheet1"], {
        raw: false,
        defval: "",
      });

      ///////////////////////////////////////////
      const fileName = file.originalname.split(".")[0];
      const questionTitle = fileName?.split("_").join(" ");

      // const getGrpData = await Forms.findOne({_id: mainBody.formId, "questions.title": questionTitle}, {"questions.$": 1, _id: 0});
      const getGrpData = await Forms.findOne(
        {
          _id: mainBody.formId,
          "questions.title": { $regex: questionTitle, $options: "i" },
        },
        { "questions.$": 1, _id: 0 }
      );
      if (!getGrpData) {
        const err = new Error(error_code.QUESTION_ID_NOT_FOUND.CODE);
        err.statusCode = 0;
        throw err;
      }
      ///////////////// validations for grp type and child ques ////////////////////
      const grpQuesId = getGrpData.questions[0]._id;
      // console.log(grpQuesId);
      const allQuestions = await Forms.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(mainBody.formId) } },
        {
          $project: {
            questions: {
              $filter: {
                input: "$questions",
                as: "questions",
                cond: {
                  $and: [
                    { $eq: ["$$questions.isGroupChild", true] },
                    {
                      $in: [
                        "$$questions._id",
                        getGrpData.questions[0].groupQuestions.childQuestions,
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      ]);
      if (!allQuestions) {
        const err = new Error(error_code.UNKNOWN_ERROR.CODE);
        err.statusCode = 0;
        throw err;
      }

      for (let row of jsonData) {
        const getMainResData = await Response.findOne({
          importedId: row["Response ID"],
        });
        if (!getMainResData) {
          const err = new Error(error_code.UNKNOWN_ERROR.CODE);
          err.statusCode = 0;
          throw err;
        }

        const keyObj = Object.keys(row).slice(
          Object.keys(row).indexOf("Group Context") + 1,
          Object.keys(row).length
        );
        const responses = [];
        let idx = 0;
        for (let formQues of allQuestions[0].questions) {
          const resValueObj = {};
          // console.log(formQues.title);
          // console.log(row[keyObj[idx]], " + ", keyObj[idx]);
          // console.log("------------------------");

          if (formQues.questionType === "mcq_single") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              if (moment(row[keyObj[idx]]).format() !== "Invalid date") {
                resValueObj.value = formQues.properties.options.filter(
                  (opt) =>
                    moment(opt.label).format() ==
                    moment(row[keyObj[idx]]).format()
                )[0].id;
              } else {
                const optToMatch = row[keyObj[idx]]
                  .replace(/[^a-zA-Z0-9 ]/g, "")
                  .trim();
                resValueObj.value = formQues.properties.options.filter((opt) =>
                  opt.label
                    .replace(/[^a-zA-Z0-9 ]/g, "")
                    .match(new RegExp(optToMatch))
                )[0].id;
              }
            }
            idx++;
          } else if (formQues.questionType === "mcq_multiple") {
            let title = keyObj.filter(
              (val) => val.split("_")[0] === formQues.title
            );
            if (!title.length) {
              title = keyObj.filter((val) => {
                let h = val.split("_");
                h.pop();
                return h.join("_") === formQues.keyword;
              });
            }
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const mcqMultiRes = [];
              for (let i = 0; i < title.length; i++) {
                if (row[title[i]] === "1" || row[title[i]] === "Yes") {
                  // mcqMultiRes.push(formQues.properties.options.filter(val=>val.label===title[i].split("_")[1])[0].id);
                  const optToMatch = title[i]
                    .split("_")
                    [title[i].split("_").length - 1].replace(
                      /[^a-zA-Z0-9 ]/g,
                      ""
                    )
                    .trim();
                  // console.log(optToMatch);
                  mcqMultiRes.push(
                    formQues.properties.options.filter((val) =>
                      val.label
                        .replace(/[^a-zA-Z0-9 ]/g, "")
                        .match(new RegExp(optToMatch))
                    )[0].id
                  );
                }
              }
              resValueObj.value = mcqMultiRes;
            }
            idx += title.length;
          } else if (formQues.questionType === "text") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "number") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "location") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const title = keyObj.filter(
                (val) => val.split("_")[0] === formQues.title
              );
              if (!title.length) {
                title = keyObj.filter((val) => {
                  let h = val.split("_");
                  h.pop();
                  return h.join("_") === formQues.keyword;
                });
              }
              const locRes = {};
              if (title.length) {
                locRes.latitude = parseFloat(row[`${formQues.title}_latitude`]);
                locRes.longitude = parseFloat(
                  row[`${formQues.title}_longitude`]
                );
                locRes.accuracy = parseFloat(row[`${formQues.title}_accuracy`]);
                locRes.provider = "fused";
              }
              resValueObj.value = locRes;
              idx += 3;
            } else {
              idx += 3;
            }
          } else if (formQues.questionType === "date") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "time") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "note") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "signature") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const imgType = row[keyObj[idx]].split(".");
              if (
                imgType[imgType.length - 1] === "jpeg" ||
                imgType[imgType.length - 1] === "jpg" ||
                imgType[imgType.length - 1] === "png"
              ) {
                const mediaData = await downloadFileHelper.downloadFile(
                  row[keyObj[idx]],
                  Date.now() +
                    "." +
                    row[keyObj[idx]].split(".")[
                      row[keyObj[idx]].split(".").length - 1
                    ]
                );
                const mediaResValue = {
                  url: mediaData,
                  mimeType: `image/${
                    mediaData.split(".")[mediaData.split(".").length - 1]
                  }`,
                };
                resValueObj.value = mediaResValue;
              }
            }
            idx++;
          } else if (formQues.questionType === "section_break") {
            // if (!(row[keyObj[idx]]==="" || row[keyObj[idx]]==="N/A")) {
            resValueObj.value = formQues.title;
            // }
            idx++;
          } else if (formQues.questionType === "area_on_map") {
            idx++;
          } else if (formQues.questionType === "distance_on_map") {
            idx++;
          }
          // -----------------dropdown
          else if (formQues.questionType === "dropdown") {
            idx++;
          } else if (formQues.questionType === "image") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const imgType = row[keyObj[idx]].split(".");
              if (
                imgType[imgType.length - 1] === "jpeg" ||
                imgType[imgType.length - 1] === "jpg" ||
                imgType[imgType.length - 1] === "png"
              ) {
                const mediaData = await downloadFileHelper.downloadFile(
                  row[keyObj[idx]],
                  Date.now() +
                    "." +
                    row[keyObj[idx]].split(".")[
                      row[keyObj[idx]].split(".").length - 1
                    ]
                );
                const mediaResValue = {
                  url: mediaData,
                  mimeType: `image/${
                    mediaData.split(".")[mediaData.split(".").length - 1]
                  }`,
                };
                resValueObj.value = mediaResValue;
              }
            }
            idx++;
          }
          // ---------------multiple_images
          else if (formQues.questionType === "multipe_image") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const imgType = row[keyObj[idx]].split(".");
              if (
                imgType[imgType.length - 1] === "jpeg" ||
                imgType[imgType.length - 1] === "jpg" ||
                imgType[imgType.length - 1] === "png"
              ) {
                const mediaData = await downloadFileHelper.downloadFile(
                  row[keyObj[idx]],
                  Date.now() +
                    "." +
                    row[keyObj[idx]].split(".")[
                      row[keyObj[idx]].split(".").length - 1
                    ]
                );
                const mediaResValue = {
                  url: mediaData,
                  mimeType: `image/${
                    mediaData.split(".")[mediaData.split(".").length - 1]
                  }`,
                };
                resValueObj.value = mediaResValue;
              }
            }
            idx++;
          }
          // ---------------multiple_images
          else if (formQues.questionType === "image_geo_tag") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const imgType = row[keyObj[idx]].split(".");
              if (
                imgType[imgType.length - 1] === "jpeg" ||
                imgType[imgType.length - 1] === "jpg" ||
                imgType[imgType.length - 1] === "png"
              ) {
                const mediaData = await downloadFileHelper.downloadFile(
                  row[keyObj[idx]],
                  Date.now() +
                    "." +
                    row[keyObj[idx]].split(".")[
                      row[keyObj[idx]].split(".").length - 1
                    ]
                );
                const mediaResValue = {
                  url: mediaData,
                  mimeType: `image/${
                    mediaData.split(".")[mediaData.split(".").length - 1]
                  }`,
                };
                resValueObj.value = mediaResValue;
              }
            }
            idx++;
          } 
          // ------------------multiple image geo tag-------------------
          else if (formQues.questionType === "multiple_image_geo_tag") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const imgType = row[keyObj[idx]].split(".");
              if (
                imgType[imgType.length - 1] === "jpeg" ||
                imgType[imgType.length - 1] === "jpg" ||
                imgType[imgType.length - 1] === "png"
              ) {
                const mediaData = await downloadFileHelper.downloadFile(
                  row[keyObj[idx]],
                  Date.now() +
                    "." +
                    row[keyObj[idx]].split(".")[
                      row[keyObj[idx]].split(".").length - 1
                    ]
                );
                const mediaResValue = {
                  url: mediaData,
                  mimeType: `image/${
                    mediaData.split(".")[mediaData.split(".").length - 1]
                  }`,
                };
                resValueObj.value = mediaResValue;
              }
            }
            idx++;
          }
          // ------------------multiple image geo tag-------------------
          else if (formQues.questionType === "phone") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "email") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "audio") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const mediaData = await downloadFileHelper.downloadFile(
                row[keyObj[idx]],
                Date.now() +
                  "." +
                  row[keyObj[idx]].split(".")[
                    row[keyObj[idx]].split(".").length - 1
                  ]
              );
              const mediaResValue = {
                url: mediaData,
                mimeType: `audio/${
                  mediaData.split(".")[mediaData.split(".").length - 1]
                }`,
              };
              resValueObj.value = mediaResValue;
            }
            idx++;
          } else if (formQues.questionType === "video") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const mediaData = await downloadFileHelper.downloadFile(
                row[keyObj[idx]],
                Date.now() +
                  "." +
                  row[keyObj[idx]].split(".")[
                    row[keyObj[idx]].split(".").length - 1
                  ]
              );
              const mediaResValue = {
                url: mediaData,
                mimeType: `video/${
                  mediaData.split(".")[mediaData.split(".").length - 1]
                }`,
              };
              resValueObj.value = mediaResValue;
            }
            idx++;
          } else if (formQues.questionType === "file_upload") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const mediaData = await downloadFileHelper.downloadFile(
                row[keyObj[idx]],
                Date.now() +
                  "." +
                  row[keyObj[idx]].split(".")[
                    row[keyObj[idx]].split(".").length - 1
                  ]
              );
              const mediaResValue = {
                url: mediaData,
                mimeType: `file/${
                  mediaData.split(".")[mediaData.split(".").length - 1]
                }`,
              };
              resValueObj.value = mediaResValue;
            }
            idx++;
          }
          // -------multiple File----------
          else if (formQues.questionType === "multiple_file_upload") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              const mediaData = await downloadFileHelper.downloadFile(
                row[keyObj[idx]],
                Date.now() +
                  "." +
                  row[keyObj[idx]].split(".")[
                    row[keyObj[idx]].split(".").length - 1
                  ]
              );
              const mediaResValue = {
                url: mediaData,
                mimeType: `file/${
                  mediaData.split(".")[mediaData.split(".").length - 1]
                }`,
              };
              resValueObj.value = mediaResValue;
            }
            idx++;
          }
          // -------multiple File----------
          else if (formQues.questionType === "likert_scale") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "scale") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "rating") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } else if (formQues.questionType === "monitoring") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          } 
          else if (formQues.questionType === "barcode") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          }
          else if (formQues.questionType === "live_tracking") {
            if (!(row[keyObj[idx]] === "" || row[keyObj[idx]] === "N/A")) {
              resValueObj.value = row[formQues.title];
            }
            idx++;
          }

          if (Object.keys(resValueObj).length !== 0) {
            const resObj = {
              answer: resValueObj,
              status: "active",
              questionId: formQues._id,
              createdBy: getMainResData.submittedBy.userId,
              createdOnDeviceAt: getMainResData.createdOn,
              lastModifiedOnDeviceAt: getMainResData.updatedOn,
              questionType: formQues.questionType,
              isFlagged: false,
              isParent: true,
              groupId: grpQuesId,
              groupLabelId: row["Group Context"]
                ? row["Group Context"]
                : undefined,
            };
            // responses.push(resObj);
            const updateRes = await Response.updateOne(
              { importedId: row["Response ID"], formId: mainBody.formId },
              {
                $push: { responses: resObj },
              }
            );
            if (!updateRes) {
              const err = new Error(error_code.UNKNOWN_ERROR.CODE);
              err.statusCode = 0;
              throw err;
            }
          }
        }
      }

      return Promise.resolve({
        message: "Uploaded",
        total: jsonData.length,
        status: 1,
      });
    } catch (error) {
      console.log(error);
    }
  }

  timeToTimestamp(time) {
    let [h, m, s] = time.split(":");
    if (!s) {
      (s = h), (h = undefined);
    }
    h = parseInt(h);
    m = parseInt(m);
    s = parseInt(s);
    if (h) {
      h = parseInt(h);
      h <= 0 ? (h = 1) : (h = h * 60 * 60 * 1000);
    }
    m <= 0 ? (m = 1) : (m = m * 60 * 1000);
    s <= 0 ? (s = 1) : (s = s * 1000);
    return (h ? h : 0) + m + s;
  }
}

module.exports = ExcelClass;
