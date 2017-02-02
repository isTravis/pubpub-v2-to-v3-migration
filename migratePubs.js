import Promise from 'bluebird';
import { Pub, Version, File, Label } from './models';
import { generateHash } from './generateHash';
import dateFormat from 'dateformat';


// Migrate Pubs (top level)
// Migrate versions (upload files, create files)

// Migrate discussions

// Migrate contributors

export default function(oldDb, userMongoToId, pubMongoToId, labelMongoToId) {
	let rejectCount = 0;

	const isPub = {};
	const replyParent = {};
	const replyRoot = {};
	const replyThreadNumber = {};

	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('links').find({
			$and: [
				{ inactive: { $ne: true } },
				{ type: 'reply' },
			]
		}));
	})
	.then(function(replyLinks) {
		return replyLinks.toArray();
	})
	.then(function(replyLinksArray) {
		replyLinksArray.sort((foo, bar)=> {
			// Sort so earliest link is first
			if (foo.createDate > bar.createDate) { return 1; }
			if (foo.createDate < bar.createDate) { return -1; }
			return 0;
		}).map((replyLink)=> {
			if (String(replyLink.metadata.rootReply) === String(replyLink.destination)) {
				isPub[replyLink.metadata.rootReply] = (isPub[replyLink.metadata.rootReply] + 1) || 1;
			}
			replyThreadNumber[replyLink.source] = replyThreadNumber[replyLink.destination] || isPub[replyLink.destination];
			replyParent[replyLink.source] = replyLink.destination;
			replyRoot[replyLink.source] = replyLink.metadata.rootReply;
		});
		return undefined;
	})
	.then(function() {
		return oldDb.collection('atoms').find({
			$and: [ 
				{ title: /^((?!Highlight:).)*$/ },
				{ type: 'document' },
				// { $or: [
				// 	{ type: 'document' },
				// 	{ type: 'pdf' },
				// 	{ type: 'markdown' },
				// ]},
				{ inactive: { $ne: true } },
			]
		});
	})
	.then(function(atoms) {
		return atoms.toArray();
	})
	.then(function(atomsArray) {
		const filteredAtoms = atomsArray.filter((atom, index)=> {
			// const replyRootPubId = replyRoot[atom._id] ? pubMongoToId[replyRoot[atom._id]] : null;
			// const replyParentPubId = replyParent[atom._id] ? pubMongoToId[replyParent[atom._id]] : null;
			// if (!isPub[atom._id] && (!replyRootPubId || !replyParentPubId)) {
			// 	// These seem to be mostly discussions that were linked to spam pubs.
			// 	// False - this is removing pubs that have no discussions...
			// 	rejectCount += 1;
			// 	return false;
			// }

			pubMongoToId[atom._id] = index + 1;
			return true;
		});

		const createPubs = filteredAtoms.map((atom)=> {
			return { 
				id: pubMongoToId[atom._id],
				slug: atom.slug,
				title: atom.title.substring(0, 5) === 'Reply' ? `Discussion on ${dateFormat(atom.createDate, "mmm dd, yyyy")}` : atom.title,
				description: atom.description,
				avatar: atom.previewImage,
				isPublished: atom.isPublished,
				createdAt: atom.createDate,
				threadNumber: replyThreadNumber[atom._id],
				replyRootPubId: replyRoot[atom._id] ? pubMongoToId[replyRoot[atom._id]] : null,
				replyParentPubId: replyParent[atom._id] ? pubMongoToId[replyParent[atom._id]] : null,
				licenseId: 1,

			};
		});


		console.log('Pubs rejected: ', rejectCount);
		console.log('Pubs creating: ', createPubs.length);
		return Promise.all([
			Pub.bulkCreate(createPubs, { returning: true }),
			filteredAtoms,
		]);
	})
	.spread(function(newPubs, filteredAtoms) {
		const createPubLabels = filteredAtoms.map((atom)=> {
			return [
				{ pubId: pubMongoToId[atom._id], title: 'Question', color: '#ED5565' },
				{ pubId: pubMongoToId[atom._id], title: 'Review', color: '#8CC152' },
				{ pubId: pubMongoToId[atom._id], title: 'Copy editing', color: '#AC92EC' },
			];
		});

		const existingLabelCount = Object.keys(labelMongoToId).length;
		const mergedLabels = [].concat.apply([], createPubLabels).map((item, index)=> {
			return {
				...item,
				id: existingLabelCount + index + 1,
			};
		});
		return Label.bulkCreate(mergedLabels);
	})
	.then(function(newLabels) {
		// newPubs.map((newPub)=> {
		// 	const mongoId = slugToMongoId[newPub.slug];
		// 	pubMongoToId[mongoId] = newPub.id;
		// });
		console.log('Finished migrating Pubs');
		console.log('----------');
		return undefined;
	})
	.catch(function(err) {
		console.log('Error migrating Pubs', err.message, err.errors);
	});
}
