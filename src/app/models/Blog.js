const mongoose = require('mongoose');
const { Schema } = mongoose;

const commentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'user', required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const blogSchema = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now }
});

const Blog = mongoose.model('Blog', blogSchema);

module.exports = Blog;
