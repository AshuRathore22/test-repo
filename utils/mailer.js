require('dotenv').config()
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    service: 'Gmail', 
    auth: {
        user: process.env.EMAIL_ID,
        pass: process.env.EMAIL_PASS
    }
}); 

async function sendEmail (recipient, subject, message) {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_ID, 
            to: recipient, 
            subject: subject, 
            text: message
        });
        console.log(`Email sent successfully to ${recipient}`);
    } catch (error) {
        console.error(error);
    }
};

module.exports = {sendEmail};
