var nodemailer = require('nodemailer');
var _ = require('lodash');
var fs = require('fs');
var validator = require('validator');
var merge = require('merge');
var chalk = require('chalk');
var app = require('express')();
var bodyParser = require('body-parser');
var pad = require('pad');

var config = {
	mail: {
		name: process.env.MAILNAME,
		pass: process.env.MAILPASS,
		host: process.env.HOST,
		serv: process.env.SERVER,
		sendTo: process.env.SENDTO
	},
};

// show env variables on bootstrap
Object.keys(config.mail).forEach(k => {
	if (k === 'pass' && config.mail.pass) { // mask pasword
		console.log(pad(k, 8) + chalk.red('=> ') + config.mail[k].split('').map(_ => '*').join(''));
	} else {
		console.log(pad(k, 8) + chalk.red('=> ') + config.mail[k]);		
	}
});	

var transporter = nodemailer.createTransport('smtps://' + config.mail.name + '%40' + config.mail.host + ':' + config.mail.pass + '@' + config.mail.serv);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/sendmail', function (req, res) {
	res.sendStatus(200);
});

app.post('/sendmail', function (req, res) {

	var body = req.body;

	var hasAllRequiredFields = true;
	var requiredFields = ['firstName', 'lastName', 'email', 'message'];
	var mailTimeStamp = +new Date;

	requiredFields.forEach(function (field) {
		if(!_.has(body, field)) hasAllRequiredFields = false;
	});

	if(!hasAllRequiredFields) { 
		res.status(402).send({message: 'missing one of [ ' + requiredFields.reduce(function (acc, field) {
			return acc.concat(' ' + field);
		}, '') + ' ]'}); // example: {message: "missing one of [ firstName lastName email message ]"}
		return;
	}

	var author = body.firstName + ' ' + body.lastName + ' <' + body.email + '>';

	var mailOptions = {
		from: author,
		to: config.mail.sendTo,
		subject: 'mail from portfolio #' + mailTimeStamp,
		text: body.message + '\n\n\n\ -------\n ' + author
	};

	console.log('sending mail... #' + mailTimeStamp);

	transporter.sendMail(mailOptions, function (error, info) {
		
		if(error) {
			console.log(chalk.red('mail ' + mailTimeStamp + 'has failed, see log for more info.'));
		}

		fs.writeFile(
			'./logs/' + mailTimeStamp + '.json',
			JSON.stringify(merge(mailOptions, {status: error ? 'failure' : 'success'}, error || info)),
			function (err) {
				if (err) {
					console.log(chalk.red('nvm the log has exploded as well here is what I know'));
					console.log(err);
					throw err;
				}
				
				if(!error) {
					console.log(chalk.green('mail ' + mailTimeStamp + 'sent with success!'));
					res.status(201).send({message: 'mail sent successfully'});
				} 

				else {
					console.log(error);
					res.status(500).send({message: 'something went wrong >.<'});
				}

			}		
		);

	});

 
});

var port = process.env.PORT || 8080;
app.listen(port);
console.log(chalk.white.bgGreen.bold('app up and runnig :' + port));