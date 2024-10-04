const express = require('express');
const router = express.Router();
const routeController = require('../app/controllers/route');
const authenticateJWT = require('../app/middlewares/auth');

//Endpoints
router.post('/create-route/', authenticateJWT, routeController.createRoute);
router.post('/add-station/:id/', authenticateJWT, routeController.addStation);
router.post('/add-bus/:id/', authenticateJWT, routeController.addBuses);
router.get('/', routeController.listRoute);
router.get('/:id', routeController.detailRoute);
module.exports = router;
