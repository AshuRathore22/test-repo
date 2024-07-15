const mongoose = require("mongoose");
const QuestionType = require("../models/question_type");
const Category = require("../models/category");

const config = require("../config/config");
const bcrypt = require("bcryptjs");

mongoose
  .connect(config.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MONGO CONNECTION OPEN!!!");
  })
  .catch((err) => {
    console.log(err);
  });

const seedData = [
  {
    title: "Popular Question Types",
    code: "popular",
    isActive: true,
    displayOrder: 0,
    questionTypes: [
      {
        title: "Single Choice",
        code: "mcq_single",
        isActive: true,
        displayOrder: 0,
        icon: "radio_button_checked",
      },
      {
        title: "Multiple Choice",
        code: "mcq_multiple",
        isActive: true,
        displayOrder: 1,
        icon: "check_circle",
      },
      {
        title: "Text",
        code: "text",
        isActive: true,
        displayOrder: 2,
        icon: "text_fields",
      },
      {
        title: "Number",
        code: "number",
        isActive: true,
        displayOrder: 3,
        icon: "looks_one",
      },
      {
        title: "Location",
        code: "location",
        isActive: true,
        displayOrder: 4,
        icon: "location_on",
      },
      {
        title: "Date",
        code: "date",
        isActive: true,
        displayOrder: 5,
        icon: "calendar_month",
      },
      {
        title: "Time",
        code: "time",
        isActive: true,
        displayOrder: 6,
        icon: "schedule",
      },
      {
        title: "Note",
        code: "note",
        isActive: true,
        displayOrder: 7,
        icon: "notes",
      },
      {
        title: "Signature",
        code: "signature",
        isActive: true,
        displayOrder: 8,
        icon: "edit",
      },
      {
        title: "Section Break",
        code: "section_break",
        isActive: true,
        displayOrder: 9,
        icon: "insert_page_break",
      },
      {
        title: "Area on Map",
        code: "area_on_map",
        isActive: true,
        displayOrder: 10,
        icon: "area_chart",
      },
      {
        title: "Distance on Map",
        code: "distance_on_map",
        isActive: true,
        displayOrder: 11,
        icon: "route",
      },
      // --------dropdown----
      {
        title: "dropdown",
        code: "dropdown",
        isActive: true,
        displayOrder: 12,
        icon: "route",
      },
    ],
  },
  {
    title: "Media And Contact",
    code: "media_and_contact",
    isActive: true,
    displayOrder: 1,
    questionTypes: [
      {
        title: "Image",
        code: "image",
        isActive: true,
        displayOrder: 12,
        icon: "image",
      },
      {
        title: "Image Geo Tag",
        code: "image_geo_tag",
        isActive: true,
        displayOrder: 13,
        icon: "satellite",
      },
      // -------------multiple image geo tag-------------------
      {
        title: "Multiple Image Geo Tag",
        code: "multiple_image_geo_tag",
        isActive: true,
        displayOrder: 21,
        icon: "satellite",
      },
      // -------------multiple image geo tag-------------------
      {
        title: "Phone",
        code: "phone",
        isActive: true,
        displayOrder: 14,
        icon: "call",
      },
      {
        title: "Email",
        code: "email",
        isActive: true,
        displayOrder: 15,
        icon: "email",
      },
      {
        title: "Audio",
        code: "audio",
        isActive: true,
        displayOrder: 16,
        icon: "mic",
      },
      {
        title: "Video",
        code: "video",
        isActive: true,
        displayOrder: 17,
        icon: "videocam",
      },
      {
        title: "File Upload",
        code: "file_upload",
        isActive: true,
        displayOrder: 18,
        icon: "upload_file",
      },
      // -------------
      {
        title: "Multiple File Upload",
        code: "multiple_file_upload",
        isActive: true,
        displayOrder: 19,
        icon: "upload_file",
      },
      {
        title: "Multiple Image",
        code: "multiple_image",
        isActive: true,
        displayOrder: 20,
        icon: "image",
      },
      // -------------
    ],
  },
  {
    title: "Feedback",
    code: "feedback",
    isActive: true,
    displayOrder: 2,
    questionTypes: [
      {
        title: "Likert Scale",
        code: "likert_scale",
        isActive: true,
        displayOrder: 18,
        icon: "emoji_emotions",
      },
      {
        title: "Scale",
        code: "scale",
        isActive: true,
        displayOrder: 19,
        icon: "linear_scale",
      },
      {
        title: "Rating",
        code: "rating",
        isActive: true,
        displayOrder: 20,
        icon: "star_outline",
      },
    ],
  },
  {
    title: "Advanced",
    code: "advanced",
    isActive: true,
    displayOrder: 3,
    questionTypes: [
      {
        title: "Group (No Repeat)",
        code: "grp_no_repeat",
        isActive: true,
        displayOrder: 21,
        icon: "account_tree",
      },
      {
        title: "Group (Number)",
        code: "grp_number",
        isActive: true,
        displayOrder: 22,
        icon: "account_tree",
      },
      {
        title: "Group (Choice)",
        code: "grp_choice",
        isActive: true,
        displayOrder: 23,
        icon: "account_tree",
      },
      {
        title: "Group (Custom)",
        code: "grp_custom",
        isActive: true,
        displayOrder: 24,
        icon: "account_tree",
      },
      {
        title: "Monitoring",
        code: "monitoring",
        isActive: true,
        displayOrder: 25,
        icon: "speed",
      },
      {
        title: "Barcode",
        code: "barcode",
        isActive: true,
        displayOrder: 26,
        icon: "qr_code_scanner",
      },
      {
        title: "Live Tracking",
        code: "live_tracking",
        isActive: true,
        displayOrder: 27,
        icon: "location",
      },
    ],
  },
];

const seedDB = async () => {
  try {
    await Category.deleteMany({});
    await QuestionType.deleteMany({});
    for (let category of seedData) {
      catObj = {
        title: category.title,
        code: category.code,
        isActive: category.isActive,
        displayOrder: category.displayOrder,
      };
      await new Category(catObj).save(function (err, result) {
        if (result) {
          for (let questionType of category.questionTypes) {
            questionType.category = result._id;
            new QuestionType(questionType).save();
            console.log("Question type added successfully");
          }
        } else {
          console.log(err);
        }
      });
    }
  } catch (err) {
    console.log(err);
  }
};

seedDB().then(() => {
  //mongoose.connection.close();
});
