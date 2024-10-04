const express = require('express');
const router = express.Router();
const busController = require('../app/controllers/bus');
const authAdmin = require('../app/middlewares/authAdmin');

router.post('/create-bus/', authAdmin,busController.createBus);
router.post('/add-seats/:id',authAdmin, busController.addSeat);
router.get('/list-seats/:id',authAdmin, busController.listSeat);
router.get('/',authAdmin, busController.listBus)
module.exports = router;
