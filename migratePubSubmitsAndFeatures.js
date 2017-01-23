import Promise from 'bluebird';
import { PubFeature, PubSubmit } from './models';
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
	let rejectFeatureCount = 0;
	let rejectSubmitCount = 0;
	const sourceIdDestinationId = {};
	const featuredPubMongoIds = {};

	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('links').find({
			$or: [
				{ type: 'featured' },
				{ type: 'submitted' },
			]
		}));
	})
	.then(function(pubSubmitAndFeatureLinks) {
		return pubSubmitAndFeatureLinks.toArray();
	})
	.then(function(pubSubmitAndFeatureLinksArray) {
		const createdFeatures = pubSubmitAndFeatureLinksArray.filter((link)=> {
			if (link.type !== 'featured') {
				return false;
			}

			if (sourceIdDestinationId[`s${link.source}d${link.destination}`]) {
				rejectFeatureCount += 1;
				return false;
			}

			if (!link.destination || !pubMongoToId[link.destination]) {
				// Likely due to inactive pub.
				rejectSubmitCount += 1;
				return false;
			}

			sourceIdDestinationId[`s${link.source}d${link.destination}`] = true;
			return true;
		}).map((link)=> {
			featuredPubMongoIds[link.destination] = true;
			return {
				isDisplayed: true,
				createdAt: link.createDate,
				createdBy: userMongoToId[link.createBy],
				pubId: pubMongoToId[link.destination],
				journalId: journalMongoToId[link.source],
				versionId: null, // Get most recent version? Or get first public version? 
			};
		});
		

		const createdSubmits = pubSubmitAndFeatureLinksArray.filter((link)=> {
			if (link.type !== 'submitted') {
				return false;
			}
			if (sourceIdDestinationId[`s${link.source}d${link.destination}`]) {
				rejectSubmitCount += 1;
				return false;
			}
			if (!link.source || !pubMongoToId[link.source]) {
				rejectSubmitCount += 1;
				return false;
			}
			sourceIdDestinationId[`s${link.source}d${link.destination}`] = true;
			return true;
		}).map((link)=> {
			featuredPubMongoIds[link.destination] = true;
			return {
				isRejected: false,
				isFeatured: !!featuredPubMongoIds[link.source],
				createdAt: link.createDate,
				createdBy: userMongoToId[link.createBy],
				pubId: pubMongoToId[link.source],
				journalId: journalMongoToId[link.destination],
			};
		});

		console.log('Pub Featured rejected: ', rejectFeatureCount);
		console.log('Pub Featured creating: ', createdFeatures.length);
		console.log('Pub Submits rejected: ', rejectSubmitCount);
		console.log('Pub Submits creating: ', createdSubmits.length);
		return Promise.all([
			PubFeature.bulkCreate(createdFeatures), 
			PubSubmit.bulkCreate(createdSubmits),
		]);
	})
	.then(function(newJournalAdmins) {
		console.log('Finished migrating Pub Submits and Features');
		console.log('----------');
		return undefined;	
	})
	.catch(function(err) {
		console.log('Error migrating Pub Submits and Features', err.message, err.errors);
	});
}
