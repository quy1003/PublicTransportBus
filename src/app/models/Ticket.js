const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/public_transport');

const Schema = mongoose.Schema;

const ticketSchema = new Schema(
  {
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'route',
    },
    isReverse:{
      type: Boolean,
      required: true
    },
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'bus',
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'trip',
    },
    seat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'seat',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    },
    price: {
      type: Number,
      required: true,
    },
    purchaseDay:{
      type: Date,
      required: true
    },
    departureTime: { type: Date, required: true },
  },
  {
    collection: 'ticket',
  },
);

const ticketModel = mongoose.model('ticket', ticketSchema);
module.exports = ticketModel;
