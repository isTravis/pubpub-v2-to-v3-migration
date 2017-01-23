import Promise from 'bluebird';
import { Label } from './models';
import { generateHash } from './generateHash';

export default function(oldDb, journalMongoToId, labelMongoToId) {
	let rejectCount = 0;

	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('tags').find({}))
	})
	.then(function(tags) {
		return tags.toArray();
	})
	.then(function(tagArray) {
		const createTags = tagArray.filter((tag)=> {
			
			if (tag.inactive) {
				return false;
			}
			return true;
		}).map((tag, index)=> {
			labelMongoToId[tag._id] = index + 1;
			const title = tag.title.replace(/[^\w\s-]/gi, '').trim().length ? tag.title : 'Empty Collection Title';
			return {
				id: index + 1,
				title: title,
				createdAt: tag.createDate,
				journalId: journalMongoToId[tag.journal],
				isDisplayed: true,
				slug: title.replace(/[^\w\s-]/gi, '').trim().replace(/ /g, '-').toLowerCase(),
				order: (index + 1) * (1 / (tagArray.length + 1))
			};
		});
		console.log('Labels rejected: ', rejectCount);
		console.log('Labels creating: ', createTags.length);
		return Label.bulkCreate(createTags);
	})
	.then(function(newUsers) {
		console.log('Finished migrating Labels');
		console.log('----------');
		return undefined;
	})
	.catch(function(err) {
		console.log('Error migrating Users', err.message, err.errors);
	});
}
