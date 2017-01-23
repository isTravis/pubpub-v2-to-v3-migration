import Promise from 'bluebird';
import { Pub, Version, File } from './models';
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

export default function(oldDb, userMongoToId, journalMongoToId, pubMongoToId) {
	const slugToMongoId = {};
	let rejectCount = 0;

	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('atoms').find({
			$and: [ 
				{ title: /^((?!Reply).)*$/ }, 
				{ title: /^((?!Highlight:).)*$/ } ,
				{ type: 'document' },
				{ inactive: { $ne: true } },
			]
		}));
	})
	.then(function(atoms) {
		return atoms.toArray();
	})
	.then(function(atomsArray) {
		const createPubs = atomsArray.filter((atom)=> {
			slugToMongoId[atom.slug] = atom._id;
			return true;
		}).map((atom)=> {
			return { 
				slug: atom.slug,
				title: atom.title,
				description: atom.description,
				avatar: atom.previewImage,
				isPublished: atom.isPublished,
				createdAt: atom.createDate,
			};
			// TODO: Migrate authors, discussions, versions
		});
		console.log('Pubs rejected: ', rejectCount);
		console.log('Pubs creating: ', createPubs.length);
		return Pub.bulkCreate(createPubs, { returning: true });
	})
	.then(function(newPubs) {
		newPubs.map((newPub)=> {
			const mongoId = slugToMongoId[newPub.slug];
			pubMongoToId[mongoId] = newPub.id;
		});
		console.log('Finished migrating Pubs');
		console.log('----------');
		return undefined;
	})
	.catch(function(err) {
		console.log('Error migrating Pubs', err.message, err.errors);
	});
}
