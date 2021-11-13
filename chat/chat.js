require('dotenv').config()

const express = require('express');
const helmet = require("helmet");
const cors = require('cors')
const mongoose = require('mongoose');
const admin = require("firebase-admin");


const ChatController = require('./controllers/ChatController');

const PORT = process.env.PORT || 3000;
let app = express();

const Sentry = require('@sentry/node');
const Tracing = require("@sentry/tracing");

Sentry.init({
    dsn: "https://b8ae065022004656816c347d62e327b2@o405222.ingest.sentry.io/6062169",
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

const db_url = "mongodb+srv://groovenation_api_test:JKZbCVWmzx8o1arX@cluster0.cezun.mongodb.net/groovenation?authSource=admin&replicaSet=atlas-12jllf-shard-0&readPreference=primary&appname=MongoDB%20Compass%20Community&ssl=true";
mongoose.connect(db_url, {useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true});
var db = mongoose.connection;

if(!db) console.log("Error Connecting Database");
else console.log("Database Connected Successfully");

app.use(express.static('files'))

app.use(express.urlencoded({
    extended: true
}));

app.use(express.json());

admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_CONFIG))
});

app.post('/api/v1/chat/send/media', (req, res) => {
    ChatController.send_image_chat(req, res, (newMessage, isConversationNew, conversation, fcm_token) => {
        sendMessageCallback(newMessage, isConversationNew, conversation, fcm_token, res, true);
    });
})

app.get('/api/v1/chat/messages/:userId', (req, res) => {
    ChatController.getUserMessages(req, res);
})

app.get('/api/v1/chat/conversations/:userId', (req, res) => {
    ChatController.getConversations(req, res);
})

app.get('/api/v1/chat/conversations/read/:conversationId/:userId', (req, res) => {
    ChatController.setMessagesRead(req, res);
})

app.post('/api/v1/chat/message/send', (req, res) => {
    ChatController.sendChat(req, async (newMessage, isConversationNew, conversation, fcm_token) => {
        sendMessageCallback(newMessage, isConversationNew, conversation, fcm_token, res, false);
    });
})

async function sendMessageCallback(newMessage, isConversationNew, conversation, fcm_token, res, isImage){
    var message = {};

    if(isImage){
        if(isConversationNew) res.json({
            "status": 1,
            "command": "add_message_conversation",
            "messageType": newMessage.messageType,
            "conversationId" : newMessage.conversationId,
            "message": JSON.stringify(newMessage),
            "conversation": JSON.stringify(conversation)
        }); else res.json({
            "status": 1,
            "command": "add_message",
            "messageType": newMessage.messageType,
            "conversationId" : newMessage.conversationId,
            "message": JSON.stringify(newMessage)
        });
    }

    if(isConversationNew){
        if(!isImage) res.json({
            status: 2,
            conversation: conversation
        });

        message = {            
            data: {
                "command" : "add_message_conversation",
                "message" : JSON.stringify(newMessage),
                "conversation" : JSON.stringify(conversation),
                "conversationId" : newMessage.conversationId.toString(),
                "messageType" : newMessage.messageType.toString(),
            },
            android: {
                priority: "high",
            },
            token: fcm_token
        };
    }else{
        if(!isImage) res.json({
            status: 1,
            message: 'success'
        });

        message = {            
            data: {
                "command" : "add_message",
                "message" : JSON.stringify(newMessage),
                "conversationId" : newMessage.conversationId.toString(),
                "messageType" : newMessage.messageType.toString(),
            },
            android: {
                priority: "high",
            },
            token: fcm_token
        };
    }
        
    if(fcm_token != null){
        admin.messaging().send(message)
        .then((response) => {
            console.log('Successfully sent message:', response);
        })
        .catch((error) => {
            console.log('Error sending message:', error);
        });
    }
}

app.use(Sentry.Handlers.errorHandler());

app.listen(PORT, () => {
    console.log('Server running on ' + PORT);
})