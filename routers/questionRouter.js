const express = require('express');
const questionControllers = require('../controllers/questionControllers.js');
const userControllers = require('../controllers/userControllers.js');

const router = express.Router();

router.route('/').post(questionControllers.createQuestion).get(
  // userControllers.protect,
  // userControllers.restrictTo('admin', 'user'),
  questionControllers.getAllQuestions
);
router
  .route('/:id')
  .get(questionControllers.getQuestion)
  .patch(questionControllers.updateQuestion)
  .delete(questionControllers.deleteQuestion);

router.route('/:tourId/reviews').get(questionControllers.getTourReview);

module.exports = router;
