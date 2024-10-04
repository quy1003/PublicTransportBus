const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const cloudinary = require('../config/cloudinary');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const Ticket = require('../models/Ticket')
class UserController {
  //[POST] - /login/
  async login(req, res) {
    try {
      let username = req.body.username;
      let password = req.body.password;

      const user = await User.findOne({ username: req.body.username });

      if (!user) {
        return res.status(400).json({ message: 'Tài khoản không tồn tại' });
      }

      // Giải mã mật khẩu được gửi trong request và so sánh với mật khẩu đã lưu
      const isMatch = await bcrypt.compare(password, user.password);

      if (isMatch) {
        var token = jwt.sign(
          {
            _id: user._id,
          },
          process.env.SECRET_KEY,
        );
        return res.json({
          message: 'Đăng nhập thành công',
          token: token,
        });
      } else {
        return res.status(401).json({ message: 'Mật khẩu không đúng' });
      }
    } catch (ex) {
      res.status(500).json('Lỗi server');
    }
  }

  //[GET] - /users/current-user/
  async currentUser(req, res) {
    try {
      const user = await User.findById(req.user._id).select('-password');
      if (!user) {
        return res.status(404).send('User not found');
      }
      return res.json(user);
    } catch (ex) {
      res.status(500).send('Lỗi server');
    }
  }
  //[GET] /users/drivers/
  async getDriver(req,res){
    try{
      const driver = await User.find({type:'DRIVER'})
      if(!driver){
        return res.status(404).json({message: 'Không tìm thấy tài xế nào'})
      }
      return res.status(200).json(driver)
    }
    catch(ex){

    }
  }
  //[POST] - /users/create-user/
  async createUser(req, res) {
    try {
      const { name, username, password, type } = req.body;
      if (!name || !username || !password || !type) {
        return res
          .status(400)
          .send(
            'Thiếu thông tin, vui lòng cung cấp đầy đủ các trường cần thiết',
          );
      }

      let avatar = '';
      if (req.file) {
        await cloudinary.uploader
          .upload_stream({ resource_type: 'auto' }, async (error, result) => {
            if (error) {
              return res.status(400).json({ error: 'Không thể upload file' });
            }
            avatar = result.secure_url;

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({
              name: name,
              username: username,
              password: hashedPassword,
              email: req.body.email || '',
              type: type,
              avatar: avatar,
            });

            try {
              await newUser.save();
              res.status(201).send('User created successfully');
            } catch (ex) {
              res.status(500).send(ex.message);
            }
          })
          .end(req.file.buffer);
      } else {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
          name: name,
          username: username,
          password: hashedPassword,
          email: req.body.email || '',
          type: type,
          avatar: avatar,
        });

        try {
          await newUser.save();
          res.status(201).send('User created successfully');
        } catch (ex) {
          res.status(500).send(ex.message);
        }
      }
    } catch (err) {
      res.status(500).send(err.message);
    }
  }
  //[GET] - /users/my-trip/
  async myTrip(req, res){
    try{
      const userId = req.user._id
      const tickets = await Ticket.find({user:userId})
      .populate("route", "name")
      .populate("bus", "name")
      .populate("seat", "name")
      return res.status(200).send(tickets)
    }
    catch(ex){
      return res.status(500).send('Lỗi server')
    }
  }
}

module.exports = new UserController();
