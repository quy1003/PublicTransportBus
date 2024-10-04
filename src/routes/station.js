const express = require('express');
const router = express.Router();
const stationController = require('../app/controllers/station');
const authAdmin = require('../app/middlewares/authAdmin');
//Endpoints
router.post('/create-station/', authAdmin, stationController.createStation);
router.get('/', stationController.listStation);
router.post('/find-station/', stationController.findAllPaths);
router.post('/my-journey/', stationController.myJourney);
module.exports = router;
