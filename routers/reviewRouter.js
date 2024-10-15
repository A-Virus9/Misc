const express = require('express');
const reviewControllers = require('../controllers/reviewControllers.js');

const router = express.Router();

router
  .route('/')
  .post(reviewControllers.addReview);

module.exports = router;