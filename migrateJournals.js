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
	const slugToMongoId = {};
	let rejectCount = 0;
	let rejectJournalAdminCount = 0;

	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('journals').find({}))
	})
	.then(function(journals) {
		return journals.toArray();
	})
	.then(function(journalArray) {
		const createJournals = journalArray.filter((journal)=> {
			slugToMongoId[journal.slug] = journal._id;
			return true;
		}).map((journal)=> {
			return { 
				title: journal.journalName,
				slug: journal.slug,
				description: journal.description,
				about: journal.about,
				logo: journal.logo,
				avatar: journal.icon,
				
				website: journal.website,
				twitter: journal.twitter,
				facebook: journal.facebook,
				headerMode: journal.headerMode,
				headerAlign: journal.headerAlign,
				headerColor: journal.headerColor,
				headerImage: journal.headerImage,
				// collections: journal.collections,
				createdAt: journal.createDate,
			};
			// TODO: Migrate admins, migrate feautres, submits, etc
		});
		console.log('Journals rejected: ', rejectCount);
		console.log('Journals creating: ', createJournals.length);
		return Journal.bulkCreate(createJournals, { returning: true });
	})
	.then(function(newJournals) {
		newJournals.map((newJournal)=> {
			const mongoId = slugToMongoId[newJournal.slug];
			journalMongoToId[mongoId] = newJournal.id;
		});
		console.log('Finished migrating Journals');
		console.log('----------');
		return undefined;
	})
	.catch(function(err) {
		console.log('Error migrating Journals', err.message, err.errors);
	});
}
