import Promise from 'bluebird';
import { Version } from './models';
import { generateHash } from './generateHash';

export default function(oldDb, userMongoToId, pubMongoToId) {
	let rejectCount = 0;

	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('versions').find({ type: 'document' }))
	})
	.then(function(versions) {
		return versions.toArray();
	})
	.then(function(versionArray) {
		const createVersions = versionArray.filter((version)=> {
			if (!version.createDate) {
				rejectCount += 1;
				return false;
			}
			if (!pubMongoToId[version.parent]) {
				rejectCount += 1;
				return false;
			}
			return true;
		}).map((version)=> {
			return { 
				message: version.message,
				isPublished: version.isPublished,
				hash: null, 
				publishedAt: version.isPublished ? version.publishedDate : null,
				publishedBy: userMongoToId[version.publishedBy],
				defaultFile: 'main.pub',
				pubId: pubMongoToId[version.parent],
				createdAt: version.createDate,
			};
		});
		console.log('Versions rejected: ', rejectCount);
		console.log('Versions creating: ', createVersions.length);
		return Version.bulkCreate(createVersions, { returning: true });
	})
	.then(function(newVersions) {
		// newJournals.map((newJournal)=> {
		// 	const mongoId = slugToMongoId[newJournal.slug];
		// 	journalMongoToId[mongoId] = newJournal.id;
		// });
		console.log('Finished migrating Versions');
		console.log('----------');
		return undefined;
	})
	.catch(function(err) {
		console.log('Error migrating Versions', err.message, err.errors);
	});
}
