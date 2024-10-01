const express = require('express');
const app = require('./app');
const path = require('path');

// Middleware to handle www to non-www redirect
app.use((req, res, next) => {
  if (req.hostname === 'www.whatisthiscar.io') {
    return res.redirect(301, `${req.protocol}://whatisthiscar.io${req.originalUrl}`);
  }
  next();
});

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Route for the Terms of Use page
app.get(['/terms'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

// Route for the Privacy Policy page
app.get('/privacy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

// Catch-all route for any undefined routes
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
