// routes/historyRoutes.js
const express = require('express');
const router = express.Router();
const { getSensorHistory } = require('../controllers/history-controller');

router.get('/history', getSensorHistory);

module.exports = router;
