const Blog = require("../models/Blog");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const User = require('../models/User')
class BlogController {
  //[GET] = /blogs/
  async listBlog(req, res) {
    try {
      const { page = 1 } = req.query;
      const pageSize = parseInt(process.env.PAGE_SIZE);

      const blogs = await Blog.find()
      .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select("title createdAt");

      const totalBlogs = await Blog.countDocuments();
      const totalPages = Math.ceil(totalBlogs / pageSize);
      const currentPage = parseInt(page);

      const prevPage = currentPage > 1 ? currentPage - 1 : null;
      const nextPage = currentPage < totalPages ? currentPage + 1 : null;

      return res.status(200).json({
        totalBlogs,
        totalPages,
        currentPage,
        prevPage,
        nextPage,
        blogs,
      });
    } catch (error) {
      return res.status(500).json({ error: "Failed to get blogs" });
    }
  }
  //[POST] - /blogs/create-blog/
  async createBlog(req, res) {
    try {
      const { title, content } = req.body;
      if (!title || !content) {
        return res
          .status(400)
          .send(
            "Thiếu thông tin, vui lòng cung cấp đầy đủ các trường cần thiết"
          );
      }
      let images = [];

      if (req.files && req.files.length > 0) {
        const uploadPromises = req.files.map((file) => {
          return new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
              { resource_type: "auto" },
              (error, result) => {
                if (error) {
                  return reject(new Error("Không thể upload file"));
                }
                resolve(result.secure_url);
              }
            );
            stream.end(file.buffer);
          });
        });

        try {
          images = await Promise.all(uploadPromises);
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }
      }
      const blog = new Blog({
        title: title,
        content: content,
        images: images ? images : [],
      });
      await blog.save();
      return res.status(200).json("Thêm blog thành công");
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
  // [GET] - /blogs/:id
  async DetailBlog(req, res) {
    try {
      const blogId = req.params.id;
      const blog = await Blog.findById(blogId).select('-comments');

      if (!blog) {
        return res.status(404).json({ message: "Bài viết không tồn tại" });
      }

      res.status(200).json(blog);
    } catch (err) {
      res.status(500).json({ message: "Lỗi server", error: err.message });
    }
  }
  //[POST] - /blogs/:id/post-comment/
  async postComment(req, res) {
    try {
      try {
        const { blogId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;
        
        const blog = await Blog.findById(blogId);
        if (!blog) {
          return res.status(404).json({ message: "Blog không tồn tại" });
        }

        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: "Người dùng không tồn tại" });
        }

        const newComment = {
          user: userId,
          content: content,
          createdAt: Date.now(),
        };

        blog.comments.push(newComment);

        await blog.save();

        return res.status(201).json({
          message: "Comment đã được thêm thành công"
        });
      } catch (error) {
        console.error(error);
        return res
          .status(500)
          .json({ message: "Có lỗi xảy ra khi thêm comment" });
      }
    } catch (ex) {
      return res.status(500).send(ex.message);
    }
  }
  //[GET] - /blogs/:blogId/get-comments/
  async getComments(req, res) {
    try {
      const { blogId } = req.params;
      const { page = 1 } = req.query;
      const pageSize = parseInt(process.env.PAGE_SIZE);
  
      const blog = await Blog.findById(blogId)
        .select('comments')
        .populate({
          path: 'comments.user',
          select: 'username avatar'
        });
  
      if (!blog) {
        return res.status(404).json({ message: 'Bài viết không tồn tại' });
      }
  
      const sortedComments = blog.comments.sort((a, b) => b.createdAt - a.createdAt);
  
      const totalComments = sortedComments.length;
      const totalPages = Math.ceil(totalComments / pageSize);
      const currentPage = parseInt(page);
  
      const paginatedComments = sortedComments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
      const prevPage = currentPage > 1 ? currentPage - 1 : null;
      const nextPage = currentPage < totalPages ? currentPage + 1 : null;
  
      return res.status(200).json({
        totalComments,
        totalPages,
        currentPage,
        prevPage,
        nextPage,
        comments: paginatedComments,
      });
    } catch (error) {
      return res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
  }
  

}

module.exports = new BlogController();
