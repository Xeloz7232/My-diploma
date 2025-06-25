const express = require('express');
const { TaskController, DataController } = require('../controllers');
const router = express.Router();

router.get('/sirius/:task_number', TaskController.getTask);
router.get('/siriusData', DataController.getData);

module.exports = router;