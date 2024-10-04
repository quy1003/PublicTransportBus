
  const mongoose = require('mongoose');
  mongoose.connect('mongodb://127.0.0.1:27017/public_transport');

  const Schema = mongoose.Schema;

  const routeSchema = new Schema(
    {
      name: {
        type: String,
        required: true,
      },
      buses: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'bus'
        },
      ],
      stations: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'station',
        },
      ],
      stationsReverse: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'station',
        },
      ],
    },
    {
      collection: 'route',
    },
  );

  const routeModel = mongoose.model('route', routeSchema);
  module.exports = routeModel;
