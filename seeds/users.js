const mongoose = require("mongoose");
const Users = require('../models/users');
const dotenv = require('dotenv')
const config = require('../config/config');
const bcrypt = require('bcryptjs');
dotenv.config()
mongoose.connect(process.env.MONGODB_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
}).then(() => { 
    console.log('MONGO CONNECTION OPEN!!!');
}).catch((err) => { 
    console.log(err);
});


const createSuperadminSeed = async () => {
    try {
      const dataBody = {
        name: 'Rohit',
        email: 'superadmin@yopmail.com',
        mobile: '8871714622',
        countryCode: '91',
        isSuperAdmin: true,
        isPhoneVerified: true,
        isEmailVerified: true,
        category: 'web'
      }
      console.log(process.env.MONGODB_URI);
      // console.log(dataBody);return
      const hashedPassword = await bcrypt.hash('123456', 12);
      dataBody.password = hashedPassword;
      const isAlreadyExist = await Users.findOne({email: dataBody.email});
      // console.log(isAlreadyExist);
      if (!isAlreadyExist) {
        const addSuperadmin = await new Users(dataBody).save();
        if (!addSuperadmin) {
          throw new Error("Not able to add user");
        } else {
          console.log("Superadmin created successfully");
        }
      } else {
        throw new Error("User email already exists");
      }
    } catch (err) {
      console.error(err);
    }
  }
  
  createSuperadminSeed().then(() => {
  
  })