const mongoose = require("mongoose");
const supportSchema = require("../models/support");
const NodeGeocoder = require("node-geocoder");
const config = require("../config/config");



exports.supportTicket = async (req, res, next) => {
  try {
    const { subject, description, status, email, assignTo } = req.body;
    const existingSupport = await supportSchema.findOne({ email });

    if (existingSupport) {
      // If email exists, update the existing record
      const ticketNumber = generateTicketNumber();
      const updatedData = await supportSchema.findOneAndUpdate(
        { email },
        {
          $set: {
            ticketNumber: ticketNumber,
            subject,
            description,
            status,
            assignTo,
            updatedAt: Date.now(),
          },
        },
        { new: true } 
      );

      // console.log(updatedData);

      res.status(200).json({
        message: "Support ticket updated successfully",
        data: updatedData,
      });
    } else {

      const newData = await supportSchema.create({
        ticketNumber: generateTicketNumber(),
        subject,
        description,
        status,
        email,
        assignTo,
      });


      res.status(201).json({
        message: "Support ticket created successfully",
        data: newData,
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

function generateRandomString() {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

function generateTicketNumber() {
  const prefix = "TICKET";
  const randomString = generateRandomString();
  const ticketNumber = `${prefix}-${randomString}`;
  return ticketNumber;
}

exports.help = async (req, res, next) => {
  try {
    // Retrieve help information from the database or any other data source
    const helpInfo = {
      title: "Help",
      description: "This is the help page.",
      contact: "For further assistance, please contact support@example.com.",
    };

    // Return the help information as the API response
    res.status(200).json(helpInfo);
  } catch (error) {
    // Handle any errors that occur during the API call
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.geoLocation = async (req, res, next) => {
  try {
    const { latitude, longitude } = req.query;
    // console.log(req.query);
    const options = {
      provider: "openstreetmap",
      apiKey: process.env.GOOGLEAPIKEY,
    };
    const geocoder = NodeGeocoder(options);
    const result = await geocoder.reverse({ lat: latitude, lon: longitude });
    res.json({
      status: 1,
      success: true,
      data: result,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: 0,
      success: false,
      error: "An error occurred.",
    });
  }
};
