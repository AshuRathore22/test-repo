var multer = require("multer");
const path = require("path");
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    let extArray = file.mimetype.split("/");

    let extension = path.extname(file.originalname);

    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      // check file type to be doc, or docx
      cb(null, Date.now() + ".docx");
    } else if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ) {
      // check file type to be excel
      cb(null, Date.now() + ".xlsx");
    } else if (file.mimetype === "text/plain") {
      cb(null, Date.now() + ".txt");
    } else if (file.mimetype === "image/svg+xml") {
      cb(null, Date.now() + ".svg");
    } else {
      cb(null, Date.now() + extension);
    }
  },
});

var upload = multer({
  storage: storage,
  limits: { fieldSize: 25 * 1024 * 1024 },
});

module.exports = upload;
