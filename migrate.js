import Promise from 'bluebird';
import fs from 'fs';
const fsWriteFile = Promise.promisify(fs.writeFile);
const MongoClient = require('mongodb').MongoClient;
require('./config.js');
import { sequelize, User } from './models';
import initializePostgres from './initializePostgres';
import migrateUsers from './migrateUsers';
import migrateJournals from './migrateJournals';
import migrateJournalAdmins from './migrateJournalAdmins';
import migrateLabels from './migrateLabels';
import migratePubs from './migratePubs';
import migratePubContributors from './migratePubContributors';
import migratePubContributorRoles from './migratePubContributorRoles';
import migratePubLabels from './migratePubLabels';
import migratePubReactions from './migratePubReactions';
import migratePubSubmitsAndFeatures from './migratePubSubmitsAndFeatures';
import migratePubVersions from './migratePubVersions';
import migrateFollows from './migrateFollows';
import syncTableIndexes from './syncTableIndexes';

const rolesTitleToId = {} // Defined by initializePostgres
const userMongoToId = {}; // Defined by migrateUsers and sent into functions to aid in migration.
const journalMongoToId = {}; // Defined by migrateJournals and sent into functions to aid in migration.
const pubMongoToId = {}; // Defined by migratePubs and sent into functions to aid in migration.
const contributorMongoToId = {}; // Defined by migratePubContributors
const pubMongoToFirstAuthorId = {};
const labelMongoToId = {}; // Defined by migrateLabels

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
		return migrateLabels(oldDb, journalMongoToId, labelMongoToId);
	})
	.then(function() {
		return migratePubs(oldDb, userMongoToId, pubMongoToId, labelMongoToId);
	})
	.then(function() {
		return migratePubContributors(oldDb, userMongoToId, pubMongoToId, contributorMongoToId, pubMongoToFirstAuthorId);
	})
	.then(function() {
		return migratePubVersions(oldDb, userMongoToId, pubMongoToId, pubMongoToFirstAuthorId);
	})
	.then(function() {
		return migratePubContributorRoles(oldDb, rolesTitleToId, userMongoToId, pubMongoToId, contributorMongoToId);
	})
	.then(function() {
		return migratePubReactions(oldDb, userMongoToId, pubMongoToId);
	})
	.then(function() {
		return migratePubLabels(oldDb, pubMongoToId, journalMongoToId, labelMongoToId);
	})
	.then(function() {
		return migratePubSubmitsAndFeatures(oldDb, userMongoToId, pubMongoToId, journalMongoToId);
	})
	.then(function() {
		return migrateFollows(oldDb, userMongoToId, pubMongoToId, journalMongoToId);
	})

	// .then(function() {
	// 	return fsWriteFile('./pubMongoIdToPostgresId', JSON.stringify(pubMongoToId, null, 2), 'utf-8');
	// })
	
	.then(function() {
		return syncTableIndexes();
	})
	.then(function() {
		oldDb.close();
		process.exit(0)
	})
	.catch(function(err) {
		console.log('Error ', err.message, err.errors);
	})
});