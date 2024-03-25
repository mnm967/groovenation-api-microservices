require('dotenv').config()

const express = require("express");
const helmet = require("helmet");
const cors = require('cors')

const mongoose = require('mongoose');
const UserController = require('./controllers/UserController');

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

const auth = require("./util/jwt-verify").verifyJWT;

app.use(helmet())
app.use(cors())

app.use(express.urlencoded({
    extended: true
}));

app.use(express.json());

const db_url = process.env.MONGODB_URI;
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});
var db = mongoose.connection;

if(!db) console.log("Error Connecting Database");
else console.log("Database Connected Successfully");

app.get('/', auth, (req, res) => {
    res.status(200).send()
})

app.post('/api/v1/users/create/email', (req, res) => {
    UserController.create_user_email(req, res)
})

app.post('/api/v1/users/login/google', (req, res) => {
    UserController.login_user_google(req, res)
})

app.post('/api/v1/users/login/facebook', (req, res) => {
    UserController.login_user_facebook(req, res)
})

app.post('/api/v1/users/fcm/token', auth, (req, res) => {
    UserController.save_fcm_token(req, res)
})

app.post('/api/v1/users/login/email', (req, res) => {
    UserController.login_user_email(req, res)
})

app.post('/api/v1/users/check/username', (req, res) => {
    UserController.check_username_exists(req, res)
})

app.post('/api/v1/users/create/username', auth, (req, res) => {
    UserController.create_username(req, res)
})

app.use(Sentry.Handlers.errorHandler());

app.listen(PORT, () => {
    console.log('Server running on '+PORT);
})