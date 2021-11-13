require('dotenv').config()

const express = require('express');
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');

const helmet = require("helmet");
const cors = require('cors')
const mongoose = require('mongoose');

const SocialController = require('./controllers/SocialController');

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

const spacesEndpoint = new aws.Endpoint(process.env.DIGITAL_OCEAN_SPACES_ENDPOINT);

const s3 = new aws.S3({
  endpoint: spacesEndpoint,
  accessKeyId: process.env.DIGITAL_OCEAN_SPACES_KEY,
  secretAccessKey: process.env.DIGITAL_OCEAN_SPACES_SECRET
});

const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.DIGITAL_OCEAN_SPACES_BUCKET_NAME+"/posts",
        acl: 'public-read',
        key: function (req, file, cb) {
            console.log(file);
            cb(null, (Date.now().toString()+ "-" + file.originalname));
        }
    })
}).array('social_file', 1);

const uploadProfileSettings = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.DIGITAL_OCEAN_SPACES_BUCKET_NAME+"/social",
        acl: 'public-read',
        key: function (req, file, cb) {
            console.log(file);
            var dir = (file.fieldname == "profile_image") ? "profile" : "cover";
            cb(null, dir + "/" +req.body.userId);
        }
    })
}).fields([
    {
    name: 'profile_image', maxCount: 1
  }, 
  {
    name: 'cover_image', maxCount: 1
  }
]);

app.post('/api/v1/social/post/create', (req, res) => {
    upload(req, res, function (error) {
        console.log(req.files[0].location);
        if(!error) SocialController.create_social_post(req, res, req.files[0].location);
        else res.json({
            status: -1,
            message: 'unknown_error'
        });
    })
})

app.post('/api/v1/social/profile/update', (req, res) => {
    uploadProfileSettings(req, res, function (error) {
        console.log("Location: "+req.files['profile_image'][0].location);

        if(!error) SocialController.update_profile_settings(req, res, 
            req.files['profile_image'][0].location, req.files['cover_image'][0].location);
        else res.json({
            status: -1,
            message: 'unknown_error'
        });
    })
})

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

app.get('/api/v1/social/following/:user_id/:page', (req, res) => {
    SocialController.get_following_social_posts(req, res)
})

app.get('/api/v1/social/nearby/:user_id/:latitude/:longitude/:page', (req, res) => {
    SocialController.get_nearby_social_posts(req, res)
})

app.get('/api/v1/social/trending/:user_id/:page', (req, res) => {
    SocialController.get_trending_social_posts(req, res)
})

app.get('/api/v1/social/profile/:profile_id/:user_id/:page', (req, res) => {
    SocialController.get_profile_posts(req, res)
})

app.get('/api/v1/social/profile/:club_id/:user_id/:page', (req, res) => {
    SocialController.get_club_posts(req, res)
})

app.get('/api/v1/social/follow/:profile_id/:user_id', (req, res) => {
    SocialController.follow_user(req, res)
})

app.get('/api/v1/social/unfollow/:profile_id/:user_id', (req, res) => {
    SocialController.unfollow_user(req, res)
})

app.post('/api/v1/social/post/like', (req, res) => {
    SocialController.like_social_post(req, res)
})

app.post('/api/v1/social/post/unlike', (req, res) => {
    SocialController.unlike_social_post(req, res)
})

app.post('/api/v1/social/post/comment/add', (req, res) => {
    SocialController.add_social_post_comment(req, res)
})

app.get('/api/v1/social/post/comment/delete/:comment_id', (req, res) => {
    SocialController.delete_social_post_comment(req, res)
})

app.get('/api/v1/social/post/comments/:user_id/:post_id/:page', (req, res) => {
    SocialController.get_social_post_comments(req, res)
})

app.post('/api/v1/social/post/comment/like', (req, res) => {
    SocialController.like_social_comment(req, res)
})

app.post('/api/v1/social/post/comment/unlike', (req, res) => {
    SocialController.unlike_social_comment(req, res)
})

app.get('/api/v1/social/profile/:user_id/:profile_id', (req, res) => {
    SocialController.get_social_profile(req, res)
})

app.post('/api/v1/social/profile/password/change', (req, res) => {
    SocialController.change_user_password(req, res)
})

app.get('/api/v1/social/users/following/:user_id/:page', (req, res) => {
    SocialController.get_users_following(req, res)
})

app.post('/api/v1/social/users/following/search', (req, res) => {
    SocialController.search_users_following(req, res)
})

app.get('/api/v1/social/block/:user_id/:profile_id', (req, res) => {
    SocialController.block_user(req, res)
})

app.get('/api/v1/social/unblock/:user_id/:profile_id', (req, res) => {
    SocialController.unblock_user(req, res)
})

app.post('/api/v1/social/search/users', (req, res) => {
    SocialController.search_users(req, res)
})

app.post('/api/v1/social/report', (req, res) => {
    SocialController.create_report(req, res)
})

app.use(Sentry.Handlers.errorHandler());

app.listen(PORT, () => {
    console.log('Server running on ' + PORT);
})