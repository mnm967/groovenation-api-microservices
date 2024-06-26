const express = require("express");
const helmet = require("helmet");
const cors = require('cors')
const mongoose = require('mongoose');
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

app.get('/api/v1/events/upcoming/:user_city/:page', (req, res) => {
    EventController.get_upcoming_events(req, res)
})

app.get('/api/v1/events/favourites/:user_id/:user_city', (req, res) => {
    EventController.get_user_favourite_events(req, res)
})

app.get('/api/v1/events/add/favourites/:user_id/:event_id', (req, res) => {
    EventController.add_user_favourite_event(req, res)
})

app.get('/api/v1/events/remove/favourites/:user_id/:event_id', (req, res) => {
    EventController.remove_user_favourite_event(req, res)
})

app.get('/api/v1/events/club/:club_id/:page', (req, res) => {
    EventController.get_club_events(req, res)
})

app.post('/api/v1/events/search', (req, res) => {
    EventController.search_event(req, res)
})

app.use(Sentry.Handlers.errorHandler());

app.listen(PORT, () => {
    console.log('Server running on ' + PORT);
})