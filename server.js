const dotenv = require('dotenv');
const mongoose = require('mongoose');

const questionControllers = require('./controllers/questionControllers.js');

process.on('uncaughtException', (err) => {
  console.log(err.name, err.message);
  console.log('Uncaught Exception! Shutting down...');
  process.exit(1);
});
dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

(function startConnect() {
  mongoose
    .connect(DB)
    .then((con) => {
      console.log('DB successful');
      questionControllers.deleteData();
    })
    .catch((err) => {
      console.error(err, "Couldn't connect DB");
      startConnect();
    });
})();

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on 3000`);
});

process.on('unhandledRejection', (err) => {
  console.log(err.name, err.message);
  console.log('Unhandled rejection! Shutting down...');
  server.close(() => {
    process.exit(1);
  });
});
