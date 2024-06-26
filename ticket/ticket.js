const express = require("express");
const helmet = require("helmet");
const cors = require('cors')
const mongoose = require('mongoose');
const TicketController = require('./controllers/TicketController');

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

app.get('/api/v1/tickets', (req, res) => {
    res.send("Response from Tickets")
})

app.get('/api/v1/tickets/prices/:event_id', (req, res) => {
    TicketController.get_ticket_prices(req, res)
})

app.post('/api/v1/tickets/purchase/verify', (req, res) => {
    TicketController.verify_ticket_purchase(req, res)
})

app.get('/api/v1/tickets/:user_id', (req, res) => {
    TicketController.get_user_tickets(req, res)
})

app.use(Sentry.Handlers.errorHandler());

app.listen(PORT, () => {
    console.log('Server running on ' + PORT);
})