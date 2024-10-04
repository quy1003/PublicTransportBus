const express = require('express');
const router = express.Router();
const ticketController = require('../app/controllers/ticket');
const authAdmin = require('../app/middlewares/authAdmin');

router.get('/get-years/', authAdmin, ticketController.getRevenueYears)
router.get('/get-revenue/', authAdmin, ticketController.getRevenueByMonth)
router.get('/', authAdmin, ticketController.listTicket)

module.exports = router;
