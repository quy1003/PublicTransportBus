const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/public_transport');

const Schema = mongoose.Schema;

const reportSchema = new Schema(
  {
    bus: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'bus',
    },
    status:{
      type:Boolean,
      default: true
    },
    note: String,
    createdAt: { type: Date, default: Date.now }
  },
  {
    collection: 'report',
  },
);

const reportModel = mongoose.model('report', reportSchema);
module.exports = reportModel;
