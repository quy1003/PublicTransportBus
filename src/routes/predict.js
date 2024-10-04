const express = require('express');
const router = express.Router();
const predictController = require('../app/controllers/predict');
const authAdmin = require('../app/middlewares/authAdmin');

router.get('/predict-revenue/', authAdmin, predictController.predictNextMonthRevenue)
router.get('/predict-clustering/',authAdmin, predictController.clusterUsersAndAnalyzeBehavior)
router.get('/predict-spending/',authAdmin, predictController.predictAverageUserSpending)
router.post('/assistant/', predictController.startConversation)
module.exports = router;
