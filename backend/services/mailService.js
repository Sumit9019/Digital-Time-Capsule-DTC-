const nodemailer = require('nodemailer');
require('dotenv').config();


const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,  
    pass: process.env.EMAIL_PASSWORD, 
  }
});

 exports.sendCongratulatoryEmail = (userEmail) => {
  const mailOptions = {
    from: process.env.EMAIL, 
    to: userEmail,             
    subject: 'Congratulations on Achieving Your PR Milestone!',
    text: 'Dear user, congratulations! You have successfully achieved your PR milestone on GitHub. Keep up the great work!',
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log('Error sending email:', error);
    } else {
      console.log('Email sent:', info.response);
    }
  });
};
