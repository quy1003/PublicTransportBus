const express = require('express');
const router = express.Router();
const reportController = require('../app/controllers/report');
const authReport = require('../app/middlewares/authReport');

router.post('/create-report/',authReport, reportController.createReport);
router.get('/',authReport, reportController.listReport);
router.patch('/:id/update-report/',authReport, reportController.updateReport)
module.exports = router;
