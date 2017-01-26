import Promise from 'bluebird';
import { sequelize, Pub } from './models';

export default function() {
	
	return sequelize.query(`SELECT setval('"Pubs_id_seq"', (SELECT MAX("id") FROM "Pubs")+1)`)	
	.then(function() {
		return sequelize.query(`SELECT setval('"Labels_id_seq"', (SELECT MAX("id") FROM "Labels")+1)`);
	})
	.then(function() {
		return sequelize.query(`SELECT setval('"Files_id_seq"', (SELECT MAX("id") FROM "Files")+1)`);
	})
	.then(function() {
		return sequelize.query(`SELECT setval('"Versions_id_seq"', (SELECT MAX("id") FROM "Versions")+1)`);
	})
	.then(function() {
		console.log('Finished syncing Table Indexes ');
		console.log('----------');
		return undefined;
	})
	.catch(function(err) {
		console.log('Error syncing Table Indexes', err.message, err.errors);
	});
}
