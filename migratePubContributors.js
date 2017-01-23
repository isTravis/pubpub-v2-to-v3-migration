import Promise from 'bluebird';
import { Pub, Contributor } from './models';
import { generateHash } from './generateHash';

export default function(oldDb, userMongoToId, pubMongoToId, contributorMongoToId) {
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
			return { 
				canEdit: link.type === 'editor' || link.type === 'author',
				canRead: link.type === 'reader',
				isAuthor: link.type === 'author',
				createdAt: link.createDate,
				userId: userMongoToId[link.source],
				pubId: pubMongoToId[link.destination],
			};
		});
		
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
