#!/usr/bin/env node
// Core server
const createError = require('http-errors');
const express = require('express');
const app = express();
const router = express.Router();
const http = require('http');
const server = http.createServer(app);   // Create HTTP server.

// middlewares
const rateLimit = require("express-rate-limit");
const favicon = require('serve-favicon')
const cors = require('cors'); // CORS middleware
const passport = require('passport');
const Strategy = require('passport-local').Strategy;
const DB = require('./modules/db');
const db = new DB("sqlitedb.db")
const CryptoJS = require('crypto-js');

const debug = require('debug')('nodefile:server');
const path = require('path');
const secrets = require('./conf/config');
const port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

// Listen on provided port, on all network interfaces.
server.listen(port);
console.log('Listening on ' + port);
server.on('error', onError);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(cors())
app.use(favicon(path.join(__dirname, 'public', 'res', 'favicon.ico')))
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/js', express.static(__dirname + '/node_modules/vue/dist/'));                    // Include Vue js
app.use('/', express.static(__dirname + '/node_modules/bootstrap/dist/'));                // Include bootstrap
app.use('/', express.static(__dirname + '/node_modules/vue-toast-notification/dist/'));   // Include toast notification
app.use('/slick', express.static(__dirname + '/node_modules/slick-carousel/slick'));      // Include slick carousel
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));             // Include jquery
const apiLimiter = rateLimit({
  windowMs: 1000, // 1 sec
  max: 50
});
app.use("/", apiLimiter);
app.get('/js/crypto-js.js', function(req, res) {
  res.sendFile(__dirname + '/node_modules/crypto-js/crypto-js.js');
});

app.use(require('express-session')({ secret: secrets.secret, resave: false, saveUninitialized: false }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());
passport.use(new Strategy(
  function(username, password, cb) {
    db.selectByName(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      var mismatch = 0;
      for (var i = 0; i < user.password; ++i) {
        mismatch |= (user.charCodeAt(i) ^ password.charCodeAt(i));}
      if (mismatch) { return cb(null, false); }
      return cb(null, user);
  });
}));

passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  db.selectById(id, function (err, user) {
      if (err) { return cb(err); }
      cb(null, user);
  });
});

// Create a default account if needed
db.selectAll(function(err, user) {
  if (user == undefined) { db.insert(secrets.defaultuser, CryptoJS.SHA512(secrets.defaultpass).toString(), "1", function(err, user) {if (err) { console.log(err) }})}
  else if (!user[0]) { db.insert(secrets.defaultuser, CryptoJS.SHA512(secrets.defaultpass).toString(), "1", function(err, user) {if (err) { console.log(err) }})}
})

app.get("/login", (req, res) => res.render('login'))
app.post('/login', 
  passport.authenticate('local', { failureRedirect: '/login?bad=1' }),
  function(req, res) {
    res.redirect('/');
  });
app.use('/', require('connect-ensure-login').ensureLoggedIn(), require('./routes/masterroutes'));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  console.log(err.message)
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Normalize a port into a number, string, or false.
function normalizePort(val) {
  var port = parseInt(val, 10);
  if (isNaN(port)) {
    // named pipe
    return val;
  }
  if (port >= 0) {
    // port number
    return port;
  }
  return false;
}

// Event listener for HTTP server "error" event.
function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

module.exports = app;
