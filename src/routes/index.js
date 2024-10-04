const userRouter = require('../routes/user');
const blogRouter = require('../routes/blog');
const stationRouter = require('../routes/station');
const routeRouter = require('../routes/route');
const busRouter = require('../routes/bus');
const seatRouter = require('../routes/seat');
const reportRouter = require('../routes/report');
const tripRouter = require('../routes/trip');
const ticketRouter = require('../routes/ticket');
const predictRouter = require('../routes/predict')
const zalopayCallback = require('../routes/zalopayCallback');
function route(app) {
  app.use('/reports', reportRouter);
  app.use('/predicts/', predictRouter);
  app.use('/trips', tripRouter);
  app.use('/routes', routeRouter);
  app.use('/stations', stationRouter);
  app.use('/tickets', ticketRouter);
  app.use('/buses', busRouter);
  app.use('/seats', seatRouter);
  app.use('/users', userRouter);
  app.use('/blogs', blogRouter);
  app.use('/', userRouter);
  app.use('/callback', zalopayCallback);
}
module.exports = route;
