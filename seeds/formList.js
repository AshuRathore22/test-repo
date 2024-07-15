const mongoose = require("mongoose");
const Forms = require('../models/form');

const config = require('../config/config');
const bcrypt = require('bcryptjs');

mongoose.connect(config.MONGODB_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
}).then(() => { 
    console.log('MONGO CONNECTION OPEN!!!');
}).catch((err) => { 
    console.log(err);
});

const formData = [{
    title: "Demo Form 1",
    description: "Test description 1",
    formStatus: "live",
    isActive: 1,
    settings:{},
    questions:[],
    audience: ['6321b45abb959d653c2dc256','6320233d31494a42a940e3a2'],
    versionNumber: "v3",
    publishedAt: new Date(),
    publishedBy: "631cb86f30edcac28d10222c",
    createdAt: new Date(),
    createdBy: "631cb86f30edcac28d10222c",
    updatedAt: new Date(),
    updatedBy: "631cb86f30edcac28d10222c"
},{
    title: "Demo Form 2",
    description: "Test description 2",
    formStatus: "live",
    isActive: 1,
    settings:{},
    questions:[],
    audience: ['6321b45abb959d653c2dc256','6320233d31494a42a940e3a2'],
    versionNumber: "v2",
    publishedAt: new Date(),
    publishedBy: "631cb86f30edcac28d10222c",
    createdAt: new Date(),
    createdBy: "631cb86f30edcac28d10222c",
    updatedAt: new Date(),
    updatedBy: "631cb86f30edcac28d10222c"
},{
    title: "Demo Form 3",
    description: "Test description 3",
    formStatus: "live",
    isActive: 0,
    settings:{},
    questions:[],
    audience: ['6321b45abb959d653c2dc256','6320233d31494a42a940e3a2'],
    versionNumber: "v3",
    publishedAt: new Date(),
    publishedBy: "631cb86f30edcac28d10222c",
    createdAt: new Date(),
    createdBy: "631cb86f30edcac28d10222c",
    updatedAt: new Date(),
    updatedBy: "631cb86f30edcac28d10222c"
},{
    title: "Demo Form 4",
    description: "Test description 4",
    formStatus: "live",
    isActive: 1,
    settings:{},
    questions:[],
    audience: ['6321b45abb959d653c2dc256','6320233d31494a42a940e3a2'],
    versionNumber: "v3",
    publishedAt: new Date(),
    publishedBy: "631cb86f30edcac28d10222c",
    createdAt: new Date(),
    createdBy: "631cb86f30edcac28d10222c",
    updatedAt: new Date(),
    updatedBy: "631cb86f30edcac28d10222c"
},{
    title: "Demo Form 5",
    description: "Test description 5",
    formStatus: "live",
    isActive: 1,
    settings:{},
    questions:[],
    audience: ['6321b45abb959d653c2dc256','6320233d31494a42a940e3a2'],
    versionNumber: "v3",
    publishedAt: new Date(),
    publishedBy: "631cb86f30edcac28d10222c",
    createdAt: new Date(),
    createdBy: "631cb86f30edcac28d10222c",
    updatedAt: new Date(),
    updatedBy: "631cb86f30edcac28d10222c"
},{
    title: "Demo Form 6",
    description: "Test description 6",
    formStatus: "live",
    isActive: 1,
    settings:{},
    questions:[],
    audience: ['6321b45abb959d653c2dc256','6320233d31494a42a940e3a2'],
    versionNumber: "v3",
    publishedAt: new Date(),
    publishedBy: "631cb86f30edcac28d10222c",
    createdAt: new Date(),
    createdBy: "631cb86f30edcac28d10222c",
    updatedAt: new Date(),
    updatedBy: "631cb86f30edcac28d10222c"
}]

const createDemoForms = async () => {
    try {
        for(let form of formData){
            await new Forms(form).save(function(error, result){
                console.log("Form inserted successfully",result._id);   
            });  
        }
    } catch (err) {
      console.error(err);
    }
  }
  
  createDemoForms().then(() => {
  
  })