const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/public_transport');

const Schema = mongoose.Schema;

const seatSchema = new Schema(
  {
    name: String,
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'bus',
    },
  },
  {
    collection: 'seat',
  },
);

const seatModel = mongoose.model('seat', seatSchema);
module.exports = seatModel;
