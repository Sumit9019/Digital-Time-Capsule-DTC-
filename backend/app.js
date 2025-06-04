require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require("express-session");
const passport = require("passport");
require('./config/passport');

const capsuleRoutes = require('./routes/capsuleRoutes');
const authRoutes = require('./routes/authRoutes');
const analyticsRoutes = require('./routes/analytics');

const startCronJob = require('./utils/cronJob');

const app = express();


startCronJob();


app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(express.json()); 


 app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret", 
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, 
  })
);


app.use(passport.initialize());
app.use(passport.session());


app.use('/api/capsule', capsuleRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/analytics', analyticsRoutes);



module.exports = app;
