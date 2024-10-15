const path = require('path');
const express = require('express');
const morgan = require('morgan');

const questionRouter = require('./routers/questionRouter.js');
const userRouter = require('./routers/userRouter.js');
const reviewRouter = require('./routers/reviewRouter.js');
const createError = require('./utils/createError');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require("compression")

const app = express();

app.use(express.static("public"));

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet());

if (process.env.NODE_ENV === 'developement') app.use(morgan('dev'));

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour',
});

app.use('/', limiter);
app.use(express.json({ limit: '10kb' }));
app.use(mongoSanitize());
app.use(xss());
app.use(
  hpp({
    whitelist: ['duration', 'rating'],
  })
);

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

app.get('/', (req, res) => {
  res.status(200).render('base',{
    tour: "The forest hiker",
    user: "Akshat",
    yo: 8
  });
});

app.use(compression);

app.use('/questions', questionRouter);
app.use('/user', userRouter);
app.use('/review', reviewRouter);

app.all('*', (req, res, next) => {
  return next(createError(`Cant find ${req.originalUrl} on this server`, 404));
});

app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  if (err.code === 11000) err.message = 'Dublicate entry';
  if (err.name === 'ValidationError') err.message = `Data not valid: ${err}`;
  if (err.name === 'JsonWebTokenError') err.message = 'Invalid JWT token';
  if (err.name === 'TokenExpiredError') err.message = 'JWT token expired';

  res.status(err.statusCode).json({
    status: err.status,
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
});

module.exports = app;
