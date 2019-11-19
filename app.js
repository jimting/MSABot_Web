var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var request = require('request');

//for rabbitmq
var context = require('rabbit.js').createContext('amqp://140.121.196.23:4111');

//mongo add-on
var MongoClient = require('mongodb').MongoClient;
var mongo = require('mongodb');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.get('/auth', (req, res) =>{
    res.sendFile(__dirname + '/add_to_slack.html')
})

app.get('/auth/redirect', (req, res) =>{
    var options = {
        uri: 'https://slack.com/api/oauth.access?code='
            +req.query.code+
            '&client_id=329491346420.652179506566&client_secret=9f71bb5faa0f07f6f869f99e5ba46d7d',
        method: 'GET'
    }
    request(options, (error, response, body) => {
        var JSONresponse = JSON.parse(body)
        if (!JSONresponse.ok){
            console.log(JSONresponse)
            res.send("Error encountered: \n"+JSON.stringify(JSONresponse)).status(200).end()
        }else{
	    	//write user data to mongo
	    	var MongoClient = require('mongodb').MongoClient;
		var url = "mongodb://140.121.196.23:4114/apuser";

		MongoClient.connect(url, { useNewUrlParser: false }, function(err, db) {
		  if (err) throw err;
		  var dbo = db.db("apuser");
		  var testData = {'access_token':JSONresponse.access_token, 'scope':JSONresponse.scope, 'user_id':JSONresponse.user_id, 'team_name':JSONresponse.team_name, 'team_id':JSONresponse.team_id, 'bot_user_id':JSONresponse.bot.bot_user_id, 'bot_access_token':JSONresponse.bot.bot_access_token, 'eureka':[], 'jenkins':[], 'zuul':[], 'vmamv':[]};
		  dbo.collection("apuser").insertOne(testData);
		  //push data to mq
		  var pub = context.socket('PUBLISH');
		  pub.connect('bots', function() {
			pub.write(JSON.stringify(testData), "utf-8");
		  });
		});  
            	console.log(JSONresponse)
            	res.send("Success!")
        }
    })
})

app.get("/mqTest", (req, res) =>{
	//push data to mq
	var pub = context.socket('PUBLISH');
	pub.connect('bots', function() {
		pub.write("{'messege':'hello!'}", "utf-8");
	});
	res.send("send Success!");
})

app.get('/mongoTest', (req, res) =>{
        var MongoClient = require('mongodb').MongoClient;
	var url = "mongodb://140.121.196.23:4114/apuser";

	MongoClient.connect(url, { useNewUrlParser: false }, function(err, db) {
	  if (err) throw err;
	  var dbo = db.db("apuser");
	  var testData = {'group':'JTGroup', 'access_token':'xoxb-330574132855-SKE6x1YDXfoUqG6prLZOKczL'};
	  dbo.collection("apuser").insertOne(testData);
	  dbo.collection("apuser").find({}, function(err, result) {
	    if (err) throw err;
	    console.log(result);
	    db.close();
	  });
	}); 
	res.send("success!"); 
    })

app.post('/auth/events', (req, res) =>{
    console.log(req.body.challenge);
    res.send(req.body.challenge);
    
    })

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
