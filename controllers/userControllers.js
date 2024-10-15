const crypto = require('crypto');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');
const jwt = require('jsonwebtoken');
const createError = require('../utils/createError');
const sendEmail = require('../utils/email');
const { promisify } = require('util');
const multer = require('multer');
const sharp = require('sharp');
// const bcrypt = require("bcrypt.js")

// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   },
// });


const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(createError('Not an image', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadUserPhoto = upload.fields([
  { name: 'imageMain', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.files.imageMain || !req.files.images) return next();

  req.body.imageMain = `user-main-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.files.imageMain[0].buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    // .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.body.imageMain}`);

  req.body.images = [];

  await Promise.all(
    req.files.images.map(async (file, i) => {
      const filename = `user-image-${req.user.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(req.files.images[i].buffer)
        .resize(500, 500)
        .toFormat('jpeg')
        .toFile(`public/img/users/${filename}`);

      req.body.images.push(filename);
    })
  );
  next();
});

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

exports.createUser = catchAsync(async (req, res) => {
  console.log(req);
  req.body.passwordChangedAt = parseInt(Date.now());
  const newUser = await User.create(req.body);

  const token = signToken(newUser._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true,
    httpOnly: true,
  });

  await sendEmail({
    email: req.body.email,
    subject: 'Welcome',
    message: 'Welcome sir!',
    html: 'welcome',
  });

  res.status(201).json({
    status: 'success',
    token,
    data: {
      user: newUser,
    },
  });
});

exports.loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(createError('Write Credentials', 206));
  }

  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(createError('Incorrect email or password', 406));
  }

  const token = signToken(user._id);
  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true,
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.protect = catchAsync(async (req, res, next) => {
  //1) check if token exists
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      createError('You are not logged in, please log in to get access', 401)
    );
  }

  //2) validate token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3)check if user exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      createError('The user belonging to this token no longer exists!', 401)
    );
  }

  //4)check if password changed after token issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      createError('The password has been changed! Please log in again', 401)
    );
  }

  req.user = currentUser;

  //Grant access to the protected route
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(createError('You do not have permission to do this!', 403));
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on posted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(createError('There is no user with that email address', 404));
  }

  //2)Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3)Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/user/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(createError('There was an error sending the email'));
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1)Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2)If token has not expired, and there is user, set the new password
  if (!user) {
    return next(createError('The token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //3)Update changedPasswordAt property for the user (in user model with middlewware)

  //4)Log the user in, send JWT
  const token = signToken(user._id);
  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true,
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
    token,
  });
  ``;
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1)Get user from the collection
  const user = await User.findById(req.user._id).select('+password');

  //2)Check if the posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(createError('Your current password is wrong'), 401);
  }

  //3)Check if new password is not same as the old one
  if (req.body.password === req.body.passwordCurrent) {
    return next(
      createError('The new password cannot be same as the old password!')
    );
  }

  //4)If correct then update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //5)Log in user, send JWT
  const token = signToken(user._id);
  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    // secure: true,
    httpOnly: true,
  });
  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(createError('Password data not accepted', 400));
  }

  const filteredBody = filterObj(
    req.body,
    'name',
    'email',
    'imageMain',
    'images'
  );
  // if (req.files) filteredBody.imageMain = req.body.imageMain;

  console.log(filteredBody);

  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
