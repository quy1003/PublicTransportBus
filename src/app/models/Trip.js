//
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/public_transport');

const Schema = mongoose.Schema;

const seatSubSchema = new Schema(
  {
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'seat',
      required: true,
    },
    status: { type: Boolean, default: false },
  },
  { _id: false },
);

const tripSchema = new Schema(
  {
    bus: { type: mongoose.Schema.Types.ObjectId, ref: 'bus', required: true },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'route',
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    isReverse: {
      type: Boolean,
      default: false
    },
    departureTime: { type: Date, required: true },
    price: { type: Number, default: process.env.TICKET_PRICE },
    seats: [seatSubSchema],
  },
  {
    collection: 'trip',
  },
);

const tripModel = mongoose.model('trip', tripSchema);
module.exports = tripModel;
