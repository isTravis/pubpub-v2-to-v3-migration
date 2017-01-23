import Promise from 'bluebird';
import { PubReaction } from './models';

export default function(oldDb, userMongoToId, pubMongoToId) {
	let rejectCount = 0;
	// const pubIdLabelId = {};

	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('links').find({ type: 'reply' }));
	})
	.then(function(replyLinks) {
		return replyLinks.toArray();
	})
	.then(function(replyLinksArray) {
		const createReactions = replyLinksArray.filter((link)=> {
			if (!link.metadata || !link.metadata.yays || !link.metadata.nays || !link.metadata.rootReply) {
				return false;
			}
			if (!pubMongoToId[link.source] || !pubMongoToId[link.metadata.rootReply]) {
				rejectCount += 1;
				return false;
			}
			return true;
		}).map((link)=> {
			const yays = link.metadata.yays.filter((item)=> {
				if (!userMongoToId[item]) {
					rejectCount += 1;
					return false;
				}
				return true;
			}).map((yay)=> {
				return {
					createdAt: link.createDate,
					userId: userMongoToId[yay],
					pubId: pubMongoToId[link.source],
					reactionId: 1,
					replyRootPubId: pubMongoToId[link.metadata.rootReply],
				};
			});
			const nays = link.metadata.nays.filter((item)=> {
				if (!userMongoToId[item]) {
					rejectCount += 1;
					return false;
				}
				return true;
			}).map((nay)=> {
				return {
					createdAt: link.createDate,
					userId: userMongoToId[nay],
					pubId: pubMongoToId[link.source],
					reactionId: 2,
					replyRootPubId: pubMongoToId[link.metadata.rootReply],
				};
			});
			return yays.concat(nays);
		});
		
		const mergedReactionsArray = [].concat.apply([], createReactions);
		console.log('Reactions rejected: ', rejectCount);
		console.log('Reactions creating: ', mergedReactionsArray.length);
		return PubReaction.bulkCreate(mergedReactionsArray);
	})
	.then(function(newJournalAdmins) {
		console.log('Finished migrating Reaction');
		console.log('----------');
		return undefined;	
	})
	.catch(function(err) {
		console.log('Error migrating Reaction', err.message, err.errors);
	});
}
