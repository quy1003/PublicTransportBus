const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dbdd85bp4',
  api_key: '947314781637449',
  api_secret: 'aEQ5nlEGafd_SBz7ZxK2QfcCzWQ',
});

module.exports = cloudinary;
