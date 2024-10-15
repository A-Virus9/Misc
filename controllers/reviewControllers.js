const catchAsync = require(`../utils/catchAsync.js`);
const createError = require("../utils/createError")
const Review = require('../models/reviewModel.js');

exports.addReview = catchAsync(async (req, res, next) => {
    const upDoc = new Review(req.body);
    const newData = await upDoc.save({
      // validateBeforeSave: false
    });
    res.status(200).json({
      status: 'success',
      data: {
        tour: newData,
      },
    });
  });