const express = require('express');
const app = require('./app');
const path = require('path'); // Include the path module

// ... other code ... 

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public'))); 

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});



