const express = require("express");
const helmet = require("helmet");
const cors = require('cors')
const mongoose = require('mongoose');
const UserController = require('./controllers/UserController');
const ClubController = require('./controllers/ClubController');
const EventController = require('./controllers/EventController');

const PORT = process.env.PORT || 3000;
let app = express();

const Sentry = require('@sentry/node');
const Tracing = require("@sentry/tracing");

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Tracing.Integrations.Express({ app }),
    ],
    tracesSampleRate: 1.0,
  });

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

app.use(helmet())
app.use(cors())

const db_url = process.env.MONGODB_URI;
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});
var db = mongoose.connection;

if(!db) console.log("Error Connecting Database");
else console.log("Database Connected Successfully");

app.use(express.urlencoded({
    extended: true
}));

app.use(express.json());

app.post('/api/v1/admin/cities/add', (req, res) => {
    UserController.add_city(req, res)
})

app.post('/api/v1/admin/clubs/add', (req, res) => {
    ClubController.add_club(req, res)
})

app.post('/api/v1/admin/clubs/promotions/add', (req, res) => {
    ClubController.add_promotion(req, res)
})

app.post('/api/v1/admin/events/add', (req, res) => {
    EventController.add_event(req, res)
})

app.use(Sentry.Handlers.errorHandler());

app.listen(PORT, () => {
    console.log('Server running on '+PORT);
})