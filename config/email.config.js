var nodemailer = require("nodemailer");
var config = require("./config");
var senderEmail = config.EMAIL_ID;
var password = config.EMAIL_PASSWORD;
var service = config.EMAIL_SERVICE;
//--------------------------------------------------------
// Mail Sending Email
//--------------------------------------------------------
var transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  options: {
    debug: true,
  },
  auth: {
    user: senderEmail,
    pass: password,
  },
});

// ================================================================
// handle Sendmail
// ================================================================

var sendEMail = (emailId, subject, mailcontent) => {
  let userMail = emailId;
  let mailOptions = {
    from: `Accrue <${senderEmail}>`,
    to: userMail,
    subject: subject,
    html: mailcontent,
  };
  return new Promise(function (resolve, reject) {
    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        console.log(info);
        resolve(info);
      }
    });
  });
};

var sendEMailAttachemt = (emailId, subject, mailcontent, filename, path) => {
  let userMail = emailId;

  let mailOptions = {
    from: `Accrue <${senderEmail}>`,
    to: userMail,
    subject: subject,
    html: mailcontent,
    attachments: [
      {
        filename: filename,
        path: path,
      },
    ],
  };

  return new Promise(function (resolve, reject) {
    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        reject(err);
      } else {
        resolve(info);
        var path = require("path").join(
          __dirname,
          "../" + mailOptions.attachments[0].path
        );
        //console.log(path);
        //remove file from server after email is sent.
        require("fs").unlink(path, (err) => {
          if (err) throw err;
          //console.log('file deleted');
        });
      }
    });
  });
};
const sendEmailLink = (link, entry, noteContent) => {
  let userMail = entry;
  let htmlContent = `
  <p>Accrue has shared this <a href="${link}" style="color: blue; text-decoration: underline;">Link</a> to fill the form
  </p>`;
  if (noteContent) {
    htmlContent += `<p> <b>Note: ${noteContent} </b></p>`;
  }
  let mailOptions = {
    from: `Accrue <${senderEmail}>`,
    to: userMail,
    subject: "Share Form",
    html: htmlContent,
  };
  mailOptions.headers = {
    "Content-Type": "text/html",
  };
  return new Promise(function (resolve, reject) {
    transporter.sendMail(mailOptions, function (err, info) {
      if (err) {
        reject(err);
      } else {
        resolve(info);
      }
    });
  });
};

//--------------------------------------------------------
//--------------- Exporting All functions ----------------
//--------------------------------------------------------

module.exports = {
  transporter,
  senderEmail,
  sendEMail,
  sendEMailAttachemt,
  sendEmailLink,
};
