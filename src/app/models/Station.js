const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/public_transport');

const Schema = mongoose.Schema;

const stationSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true
    },
    routes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'route',
      },
    ],
    location: {
      type: String,
      required: true,
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
    },
  },
  {
    collection: 'station',
  },
);

const stationModel = mongoose.model('station', stationSchema);
module.exports = stationModel;
