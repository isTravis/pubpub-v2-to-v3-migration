import Promise from 'bluebird';
import { Journal, JournalAdmin } from './models';
import { generateHash } from './generateHash';


// Create Journals
// Create JournalAdmins (query for links with type === 'admin')
// Create JournalFollows (diff file)

// Create journal labels (collections - query 'tags')

// Migrate Pubs (top level)
// Migrate versions (upload files, create files)

// Migrate discussions

// Migrate contributors

// Create journalSubmits and journalFeatures (Diff file, needs pubs first)

// Create FollowsPubs
// Create FollowsJournals
// Create FollowsUsers
// 

export default function(oldDb, userMongoToId, journalMongoToId) {
	let rejectCount = 0;

	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('links').find({type: 'admin'}));
	})
	.then(function(journalAdminLinks) {
		return journalAdminLinks.toArray();
	})
	.then(function(journalAdminLinksArray) {
		const journalAdmins = journalAdminLinksArray.map((adminLink)=> {
			const userId = userMongoToId[adminLink.source];
			const journalId = journalMongoToId[adminLink.destination];
			if (!userId || !journalId) {
				// console.log('Missing a requried param');
				// console.log(adminLink);
				// console.log({
				// 	adminLinkSource: adminLink.source,
				// 	adminLinkDestination: adminLink.destination,
				// 	journalId: journalId,
				// })
				rejectCount += 1;
			}
			return {
				userId: userMongoToId[adminLink.source],
				journalId: journalMongoToId[adminLink.destination],
				createdAt: adminLink.createDate,
			};
		});
		console.log('Journal Admins rejected: ', rejectCount);
		console.log('Journal Admins creating: ', journalAdmins.length);
		return JournalAdmin.bulkCreate(journalAdmins);
	})
	.then(function(newJournalAdmins) {
		console.log('Finished migrating Journal Admins');
		console.log('----------');
		return undefined;	
	})
	.catch(function(err) {
		console.log('Error migrating Journal Admins', err.message, err.errors);
	});
}
