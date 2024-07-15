const path = require('path');
const express = require('express');
const bodyParser = require("body-parser");
const cron = require( 'node-cron' );
const config = require('./config/config');
const mongoose = require("mongoose");
const multer = require('multer');
const dotenv = require('dotenv')
const startCronJob = require('./middleware/cron');
dotenv.config()
const app = express();

// app.get("/send", async (req, res) => {
//   transporter.sendMail(mailOption, (error, info) => {
//     if (error) {
//       console.log(error);
//     } else {
//       console.log("email sent succesfully" + info.response);
//     }
//   });
// });

// --------- data parsing --------- //
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
// app.use(multer({storage: fileStorage, fileFilter: fileFilter }).single('image'));

// --------- path as static --------- //
app.use(express.static("./"));
app.use(express.static(path.join(__dirname, 'public')));

// --------- set access permission to origin --------- //
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-type, Authorization, x-auth-token');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ---------------------------------------------
// --------- Calling Router --------------------
// ---------------------------------------------
app.set('trust proxy', true)
const routes = require('./routes/index');
app.use('/', routes);


// --------- error handling --------- //
app.use((error, req, res, next) => {
  // let status = error.statusCode || 500;
  // if (error.message === 'Not Authenticated' && status === 500) status = 401;
  console.log(error);
  let status = error.statusCode;
  const message = error.message;
  res.json({
    status: Number(status),
    error_code: Number(message)
  })
});

// --------- database and server connection --------- //
mongoose.connect(process.env.MONGODB_URI).then(result => {
  console.log("Successfully connected to database");
  const server = app.listen(process.env.PORT);
  console.log(`Server is listening on port ${process.env.PORT}` );
  // startCronJob();                   
}).catch(err => console.log(err));


