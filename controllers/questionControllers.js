const catchAsync = require(`../utils/catchAsync.js`);
const model = require('../models/questionModel.js');
const createError = require("../utils/createError")

const deleteEverything = catchAsync(async (req, res) => {
  await model.deleteMany();
  console.log('Deleted everything from db');
})

exports.deleteData = () => {
  if (process.argv[2] === 'delete') {
    setTimeout(deleteEverything, 1000);
  }
}

exports.createQuestion = catchAsync(async (req, res, next) => {
  const upDoc = new model(req.body);
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

exports.getAllQuestions = catchAsync(async (req, res, next) => {
  let query = model.find().populate("reviews")

  if (req.query.sort) {
    const sortBy = req.query.sort.split(",").join(" ")
    query = query.sort(sortBy);
  }

  // const stats = await model.aggregate([
  //   {
  //     $unwind: '$startDate',
  //   },
  //   {
  //     $match: { price: { $gte: 1000 } },
  //   },
  //   {
  //     $group: {
  //       _id: { $substr: ['$startDate', 5, 2] },
  //       numHotels: { $sum: 1 },
  //       data: { $push: '$name' },
  //     },
  //   },
  //   {
  //     $addFields: {
  //       month: '$_id',
  //     },
  //   },
  //   {
  //     $project: {
  //       _id: 0,
  //     },
  //   },
  // ]);

  const newData = await query;

  res.status(200).json({
    status: 'success',
    data: {
      tour: newData,
    },
  });
});

exports.getQuestion = catchAsync(async (req, res, next) => {
  const newData = await model.findById(req.params.id).populate({
    path: "reviews"
  });

  res.status(200).json({
    status: 'success',
    data: {
      tour: newData,
    },
  });
});

exports.updateQuestion = catchAsync(async (req, res, next) => {
  const updatedData = await model.findOneAndUpdate(
    { name: 'Akshat the hotel' },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedData) {
    return next(createError('Document not found'));
  }

  res.status(200).json({
    status: 'success',
    data: {
      updatedData,
    },
  });
});

exports.deleteQuestion = catchAsync(async (req, res, next) => {
  const deletedData = await model.findOneAndDelete({
    name: 'Ishi the hotel',
  });

  if (!deletedData) {
    return next(createError('Document not Found', 406));
  }
  res.status(200).json({
    status: 'success',
    data: {
      deletedData,
    },
  });
});

exports.getTourReview = catchAsync(async (req, res, next) => {
  const data = await model.findById(req.params.tourId).populate("reviews")

  if(!data){
    return next(createError("No such tour found with the repective id", 404))
  }

  res.status(200).json({
    status: "success",
    data: {
      review: data.reviews
    }
  })
})