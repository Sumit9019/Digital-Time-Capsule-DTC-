require('dotenv').config();

const express = require('express');
const passport = require('passport'); 

const app = require('./app');
const cronJob = require('./utils/cronJob');
const analyticsRoutes = require('./routes/analytics');
const capsuleRoutes = require('./routes/capsuleRoutes');

const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(passport.initialize());
app.use(passport.session()); 

// Routes
app.use('/api/analytics', analyticsRoutes);
app.use('/api/capsule', capsuleRoutes);

cronJob();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
