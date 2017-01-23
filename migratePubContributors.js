import Promise from 'bluebird';
import { Pub, Contributor } from './models';
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

export default function(oldDb, userMongoToId, journalMongoToId, pubMongoToId, contributorMongoToId) {
	const userIdPubIdToMongoId = {};
	let rejectCount = 0;
	
	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('links').find({
			$and: [
				{ inactive: { $ne: true } },
				{
					$or: [ 
						{type: 'author'},
						{type: 'editor'},
						{type: 'reader'},
						{type: 'contributor'},
					]
				}
			]
		}));
	})
	.then(function(links) {
		return links.toArray();
	})
	.then(function(linksArray) {
		const createContributors = linksArray.filter((link)=> {
			const userId = userMongoToId[link.source];
			const pubId = pubMongoToId[link.destination];
			if (userIdPubIdToMongoId[`u${userId}p${pubId}`]) {
				rejectCount += 1;
				return false;
			}
			if (!userId) {
				rejectCount += 1;
				return false
			}
			if (!pubId) {
				rejectCount += 1;
				return false
			}
			userIdPubIdToMongoId[`u${userId}p${pubId}`] = link._id;
			return true;
		}).map((link)=> {
			// types.add(link.type);
			// if (link.metadata && link.metadata.roles && link.metadata.roles.length) {metadata.push(link.metadata.roles)}
			// return link;
			return { 
				canEdit: link.type === 'editor' || link.type === 'author',
				canRead: link.type === 'reader',
				isAuthor: link.type === 'author',
				createdAt: link.createDate,
				userId: userMongoToId[link.source],
				pubId: pubMongoToId[link.destination],
			};
		});

		// const createContributorRoles = linksArray.filter((link)=> {
		// 	return true;
		// }).map((link)=> {
		// 	const userId = userMongoToId[link.source];
		// 	const pubId = pubMongoToId[link.destination];
		// 	const roles = link.metadata && link.metadata.roles || [];
		// 	return roles.map((role)=> {

		// 		return {
		// 			createdAt: link.createDate,
		// 			contributorId: 
		// 			roleId: 
		// 			pubId: pubId,
		// 		};
		// 	});
		// })
		
		console.log('Contributors rejected: ', rejectCount);
		console.log('Contributors creating: ', createContributors.length);
		return Contributor.bulkCreate(createContributors, { returning: true });
	})
	.then(function(newContributors) {
		newContributors.map((newContributor)=> {
			const mongoId = userIdPubIdToMongoId[`u${newContributor.userId}p${newContributor.pubId}`];
			contributorMongoToId[mongoId] = newContributor.id;
		});
		console.log('Finished migrating Contributors');
		console.log('----------');
		return undefined;
	})
	.catch(function(err) {
		console.log('Error migrating Contributors', err.message, err.errors);
	});
}
