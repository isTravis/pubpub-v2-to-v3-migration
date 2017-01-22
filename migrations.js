import Promise from 'bluebird';
const MongoClient = require('mongodb').MongoClient;
require('./config.js');
import { sequelize, User } from './models';

MongoClient.connect(process.env.MONGO_URL, {promiseLibrary: Promise}, function(err, oldDB) {
	console.log('Connected to old Mongo server');

	const emailsUsed = new Set();
	let rejectCount = 0;

	sequelize.sync({ force: true })
	.then(function() {
		console.log('Connected to new Postgres server');
		return oldDB.collection('users').find({});
	})
	.then(function(users) {
		return users.toArray();
	})
	.then(function(userArray) {
		const createUsers = userArray.filter((user)=> {
			if (!user.firstName || !user.lastName) {
				console.log('no firstname or lastname')
				console.log(user);
				rejectCount += 1;
				return false;
			}
			if (emailsUsed.has(user.email.trim())) {
				console.log('duplicate email');
				console.log(user);
				rejectCount += 1;
				return false;
			}
			emailsUsed.add(user.email.trim());
			return true;
		}).map((user)=> {
			return {
				username: user.username,
				firstName: user.firstName,
				lastName: user.lastName,
				avatar: user.image,
				email: user.email.trim(),
				bio: user.bio,
				publicEmail: user.publicEmail,
				github: user.github,
				orcid: user.orcid,
				twitter: user.twitter,
				website: user.website,
				googleScholar: user.googleScholar,
				accessToken: 'BLAHBLAH',
				createdAt: user.registerDate,
				hash: user.hash,
				salt: user.salt,
			};
		});
		console.log(rejectCount);
		return User.bulkCreate(createUsers);
	})
	.then(function() {
		oldDB.close();
		process.exit(0)
	})
	.catch(function(err) {
		console.log('Error ', err.message, err.errors);
	})
});