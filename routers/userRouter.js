const express = require('express');
const userControllers = require('../controllers/userControllers.js');

const router = express.Router();

router.route('/login').post(userControllers.loginUser);
router.route('/signup').post(userControllers.createUser);
router.route('/forgotPassword').post(userControllers.forgotPassword);
router.route('/resetPassword/:token').patch(userControllers.resetPassword);
router.patch(
  '/updateMyPassword',
  userControllers.protect,
  userControllers.updatePassword
);
router.patch(
  '/updateMe',
  userControllers.protect,
  userControllers.uploadUserPhoto,
  userControllers.resizeUserPhoto,
  userControllers.updateMe
);
router.delete('/deleteMe', userControllers.protect, userControllers.deleteMe);

module.exports = router;
