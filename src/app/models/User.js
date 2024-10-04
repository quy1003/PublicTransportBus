const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/public_transport');

const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: String,
    username: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    tickets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ticket',
      },
    ],
    email: String,
    type: String,
    avatar: String,
  },
  {
    collection: 'user',
  },
);

const userModel = mongoose.model('user', userSchema);
module.exports = userModel;
