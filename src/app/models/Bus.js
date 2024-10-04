const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/public_transport');

const Schema = mongoose.Schema;

const busSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'route',
    },
    capacity: {
      type: Number,
      required: true,
    },
    status:{
      type:Boolean,
      default: true
    },
    seats: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'seat',
      },
    ],
  },
  {
    collection: 'bus',
  },
);

const busModel = mongoose.model('bus', busSchema);
module.exports = busModel;
