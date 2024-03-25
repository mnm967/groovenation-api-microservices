const express = require("express");
const helmet = require("helmet");
const cors = require('cors')
const mongoose = require('mongoose');
const ClubController = require('./controllers/ClubController');

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

if (!db) console.log("Error Connecting Database");
else console.log("Database Connected Successfully");

app.use(express.urlencoded({
    extended: true
}));

app.use(express.json());

app.get('/api/v1/clubs/nearby/:user_id/:user_latitiude/:user_longitude/:user_city/:page', (req, res) => {
    ClubController.get_nearby_clubs(req, res)
})

app.get('/api/v1/clubs/reviews/:club_id/:user_id/:page', (req, res) => {
    ClubController.get_club_reviews(req, res)
})

app.post('/api/v1/clubs/reviews/add', (req, res) => {
    ClubController.add_club_review(req, res)
})

app.get('/api/v1/clubs/top/:user_id/:user_city/:page', (req, res) => {
    ClubController.get_top_clubs(req, res)
})

app.get('/api/v1/clubs/club/:club_id/:user_id', (req, res) => {
    ClubController.get_club(req, res)
})

app.get('/api/v1/clubs/favourites/:user_id/:user_city', (req, res) => {
    ClubController.get_user_favourite_clubs(req, res)
})

app.get('/api/v1/clubs/add/favourites/:user_id/:club_id', (req, res) => {
    ClubController.add_user_favourite_club(req, res)
})

app.get('/api/v1/clubs/remove/favourites/:user_id/:club_id', (req, res) => {
    ClubController.remove_user_favourite_club(req, res)
})

app.post('/api/v1/api/v1/clubs/promotions/add', (req, res) => {
    ClubController.add_promotion(req, res)
})

app.post('/api/v1/clubs/search', (req, res) => {
    ClubController.search_clubs(req, res)
})

app.use(Sentry.Handlers.errorHandler());

app.listen(PORT, () => {
    console.log('Server running on ' + PORT);
})