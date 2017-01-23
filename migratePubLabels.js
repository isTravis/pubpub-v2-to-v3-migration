import Promise from 'bluebird';
import { PubLabel } from './models';
import { generateHash } from './generateHash';

export default function(oldDb, pubMongoToId, journalMongoToId, labelMongoToId) {
	let rejectCount = 0;
	const pubIdLabelId = {};

	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('links').find({ type: 'featured' }));
	})
	.then(function(featureLinks) {
		return featureLinks.toArray();
	})
	.then(function(featureLinksArray) {
		const createdPubLabels = featureLinksArray.filter((link)=> {
			if (!link.metadata || !link.metadata.collections || !link.metadata.collections.length) {
				return false;
			}
			return true;
		}).map((link)=> {
			return link.metadata.collections.filter((collection)=> {
				if (pubIdLabelId[`p${link.destination}l${collection}`]) {
					rejectCount += 1;
					return false;
				}
				if (!labelMongoToId[collection] || !pubMongoToId[link.destination]) {
					rejectCount += 1;
					return false;
				}
				pubIdLabelId[`p${link.destination}l${collection}`] = true;
				return true;
			}).map((collection)=> {
				return {
					createdAt: link.createDate,
					pubId: pubMongoToId[link.destination],
					labelId: labelMongoToId[collection],
					journalId: journalMongoToId[link.source],
				};
			});
		});
		
		const mergedPubLabelArray = [].concat.apply([], createdPubLabels);

		console.log('Pub Labels rejected: ', rejectCount);
		console.log('Pub Labels creating: ', mergedPubLabelArray.length);
		return PubLabel.bulkCreate(mergedPubLabelArray);
	})
	.then(function(newJournalAdmins) {
		console.log('Finished migrating Pub Labels');
		console.log('----------');
		return undefined;	
	})
	.catch(function(err) {
		console.log('Error migrating Pub Labels', err.message, err.errors);
	});
}
