const express = require('express');
const router = express.Router();
const seatController = require('../app/controllers/seat');
const authenticateJWT = require('../app/middlewares/auth');

router.post('/create-seat/', authenticateJWT, seatController.createSeat);

module.exports = router;
