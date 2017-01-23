import Promise from 'bluebird';
import { ContributorRole } from './models';

export default function(oldDb, rolesTitleToId, userMongoToId, journalMongoToId, pubMongoToId, contributorMongoToId) {
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
		const createContributorRoles = linksArray.filter((link)=> {
			const userId = userMongoToId[link.source];
			const pubId = pubMongoToId[link.destination];
			if (userIdPubIdToMongoId[`u${userId}p${pubId}`]) {
				// rejectCount += 1;
				return false;
			}
			if (!userId) {
				// rejectCount += 1;
				return false
			}
			if (!pubId) {
				// rejectCount += 1;
				return false
			}
			userIdPubIdToMongoId[`u${userId}p${pubId}`] = link._id;
			return true;
		}).map((link)=> {
			const userId = userMongoToId[link.source];
			const pubId = pubMongoToId[link.destination];
			const roles = link.metadata && link.metadata.roles || [];
			return roles.map((role)=> {
				return {
					createdAt: link.createDate,
					contributorId: contributorMongoToId[link._id],
					roleId: rolesTitleToId[role.label],
					pubId: pubId,
				};
			});
		});

		const mergedRoleArray = [].concat.apply([], createContributorRoles);
		
		console.log('Contributor Roles rejected: ', rejectCount);
		console.log('Contributor Roles creating: ', mergedRoleArray.length);
		return ContributorRole.bulkCreate(mergedRoleArray, { returning: true });
	})
	.then(function(newContributorRoles) {
		console.log('Finished migrating Contributor Roles');
		console.log('----------');
		return undefined;
	})
	.catch(function(err) {
		console.log('Error migrating Contributor Roles', err.message, err.errors);
	});
}
