import Promise from 'bluebird';
const MongoClient = require('mongodb').MongoClient;
require('./config.js');
import { sequelize, User } from './models';
import migrateUsers from './migrateUsers';

MongoClient.connect(process.env.MONGO_URL, {promiseLibrary: Promise}, function(err, oldDb) {
	console.log('Connected to old Mongo server');
	
	sequelize.sync({ force: true })
	.then(function() {
		console.log('Connected to new Postgres server');
		return migrateUsers(oldDb);
	})
	.then(function() {
		oldDb.close();
		process.exit(0)
	})
	.catch(function(err) {
		console.log('Error ', err.message, err.errors);
	})
});