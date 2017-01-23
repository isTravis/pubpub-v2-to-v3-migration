import Promise from 'bluebird';
import { FollowsPub, FollowsJournal, FollowsUser } from './models';
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

export default function(oldDb, userMongoToId, pubMongoToId, journalMongoToId) {
	let rejectFollowsPubCount = 0;
	let rejectFollowsUserCount = 0;
	let rejectFollowsJournalCount = 0;

	const followerIdPubId = {};
	const followerIdJournalId = {};
	const followerIdUserId = {};


	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('links').find({
			$or: [
				{ type: 'followsAtom' },
				{ type: 'followsUser' },
				{ type: 'followsJournal' },
			]
		}));
	})
	.then(function(followsLinks) {
		return followsLinks.toArray();
	})
	.then(function(followsLinksArray) {
		/* Follows Atoms */
		const createFollowsPub = followsLinksArray.filter((link)=> {
			if (link.type !== 'followsAtom') {
				return false;
			}

			if (followerIdPubId[`s${link.source}d${link.destination}`]) {
				rejectFollowsPubCount += 1;
				return false;
			}

			if (!link.source || !userMongoToId[link.source] || !link.destination || !pubMongoToId[link.destination]) {
				// Likely due to inactive pub.
				rejectFollowsPubCount += 1;
				return false;
			}
			followerIdPubId[`s${link.source}d${link.destination}`] = true;
			return true;
		}).map((link)=> {
			return {
				createdAt: link.createDate,
				followerId: userMongoToId[link.source],
				pubId: pubMongoToId[link.destination],
			};
		});

		/* Follows Journals */
		const createFollowsJournal = followsLinksArray.filter((link)=> {
			if (link.type !== 'followsJournal') {
				return false;
			}

			if (followerIdJournalId[`s${link.source}d${link.destination}`]) {
				rejectFollowsJournalCount += 1;
				return false;
			}

			if (!link.source || !userMongoToId[link.source] || !link.destination || !journalMongoToId[link.destination]) {
				rejectFollowsJournalCount += 1;
				return false;
			}
			followerIdJournalId[`s${link.source}d${link.destination}`] = true;
			return true;
		}).map((link)=> {
			return {
				createdAt: link.createDate,
				followerId: userMongoToId[link.source],
				journalId: journalMongoToId[link.destination],
			};
		});

		/* Follows User */
		const createFollowsUser = followsLinksArray.filter((link)=> {
			if (link.type !== 'followsUser') {
				return false;
			}

			if (followerIdUserId[`s${link.source}d${link.destination}`]) {
				rejectFollowsUserCount += 1;
				return false;
			}

			if (!link.source || !userMongoToId[link.source] || !link.destination || !userMongoToId[link.destination]) {
				rejectFollowsUserCount += 1;
				return false;
			}
			followerIdUserId[`s${link.source}d${link.destination}`] = true;
			return true;
		}).map((link)=> {
			return {
				createdAt: link.createDate,
				followerId: userMongoToId[link.source],
				userId: userMongoToId[link.destination],
			};
		});

		console.log('FollowsPub rejected: ', rejectFollowsPubCount);
		console.log('FollowsPub  creating: ', createFollowsPub.length);
		console.log('FollowsJournal rejected: ', rejectFollowsJournalCount);
		console.log('FollowsJournal  creating: ', createFollowsJournal.length);
		console.log('FollowsUser rejected: ', rejectFollowsUserCount);
		console.log('FollowsUser  creating: ', createFollowsUser.length);

		return Promise.all([
			FollowsPub.bulkCreate(createFollowsPub), 
			FollowsJournal.bulkCreate(createFollowsJournal), 
			FollowsUser.bulkCreate(createFollowsUser), 
		]);
	})
	.then(function(newJournalAdmins) {
		console.log('Finished migrating Follows');
		console.log('----------');
		return undefined;	
	})
	.catch(function(err) {
		console.log('Error migrating Follows', err.message, err.errors);
	});
}
