const mongoose = require('mongoose');

async function connect() {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/public_transport', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connecting Successfully!');
  } catch (ex) {
    console.error('Failed Connect!');
  }
}

module.exports = { connect };
