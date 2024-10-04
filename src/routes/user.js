const express = require('express');
const router = express.Router();
const userController = require('../app/controllers/user');
const authUser = require('../app/middlewares/auth');
const authenticateJWT = require('../app/middlewares/auth');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const authAdmin = require('../app/middlewares/authAdmin');


router.post('/login/', userController.login);
router.post(
  '/create-user/',
  upload.single('avatar'),
  userController.createUser,
);
router.get('/current-user/', authenticateJWT, userController.currentUser);
router.get('/my-trip/', authenticateJWT, userController.myTrip)
router.get('/drivers/', authAdmin, userController.getDriver)
module.exports = router;
