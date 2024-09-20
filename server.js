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

// ... other routes and middleware ...

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
