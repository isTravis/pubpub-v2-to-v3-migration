import Promise from 'bluebird';
const MongoClient = require('mongodb').MongoClient;
require('./config.js');
import { sequelize, User } from './models';
import initializePostgres from './initializePostgres';
import migrateUsers from './migrateUsers';
import migrateJournals from './migrateJournals';
import migrateJournalAdmins from './migrateJournalAdmins';
import migratePubs from './migratePubs';
import migratePubContributors from './migratePubContributors';
import migratePubContributorRoles from './migratePubContributorRoles';

const rolesTitleToId = {} // Defined by initializePostgres
const userMongoToId = {}; // Defined by migrateUsers and sent into functions to aid in migration.
const journalMongoToId = {}; // Defined by migrateJournals and sent into functions to aid in migration.
const pubMongoToId = {}; // Defined by migratePubs and sent into functions to aid in migration.
const contributorMongoToId = {}; // Defined by migratePubContributors

MongoClient.connect(process.env.MONGO_URL, {promiseLibrary: Promise}, function(err, oldDb) {
	console.log('Connected to old Mongo server');
	
	sequelize.sync({ force: true })
	.then(function() {
		console.log('Connected to new Postgres server');
		return initializePostgres(rolesTitleToId);
	})
	.then(function() {
		return migrateUsers(oldDb, userMongoToId);
	})
	.then(function() {
		return migrateJournals(oldDb, userMongoToId, journalMongoToId);
	})
	.then(function() {
		return migrateJournalAdmins(oldDb, userMongoToId, journalMongoToId);
	})
	.then(function() {
		return migratePubs(oldDb, userMongoToId, journalMongoToId, pubMongoToId);
	})
	.then(function() {
		return migratePubContributors(oldDb, userMongoToId, journalMongoToId, pubMongoToId, contributorMongoToId);
	})
	.then(function() {
		return migratePubContributorRoles(oldDb, rolesTitleToId, userMongoToId, journalMongoToId, pubMongoToId, contributorMongoToId);
	})
	.then(function() {
		// console.log(userMongoToId);
		oldDb.close();
		process.exit(0)
	})
	.catch(function(err) {
		console.log('Error ', err.message, err.errors);
	})
});