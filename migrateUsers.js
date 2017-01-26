import Promise from 'bluebird';
import { User } from './models';
import { generateHash } from './generateHash';

export default function(oldDb, userMongoToId) {
	const emailToMongoId = {};
	let rejectCount = 0;

	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('users').find({}))
	})
	.then(function(users) {
		return users.toArray();
	})
	.then(function(userArray) {
		const createUsers = userArray.filter((user)=> {
			// if (!user.firstName || !user.lastName) {
			// 	// console.log('no firstname or lastname')
			// 	// console.log(user);
			// 	rejectCount += 1;
			// 	return false;
			// }
			if (emailToMongoId[user.email.trim()]) {
				// console.log('duplicate email');
				// console.log(user);
				rejectCount += 1;
				return false;
			}

			emailToMongoId[user.email.trim()] = user._id;
			return true;
		}).map((user)=> {
			return {
				username: user.username,
				firstName: user.firstName || 'undefined', // Note, this decision will leave some people's names with 'Undefined Johnson'
				lastName: user.lastName || 'undefined', // Note, this decision will leave some people's names with 'Mary Undefined'
				avatar: user.image || 'https://assets.pubpub.org/_site/happyPub.png',
				email: user.email.trim(),
				bio: user.bio,
				publicEmail: user.publicEmail,
				github: user.github,
				orcid: user.orcid,
				twitter: user.twitter,
				website: user.website,
				googleScholar: user.googleScholar,
				accessToken: generateHash(),
				createdAt: user.registerDate,
				hash: user.hash,
				salt: user.salt,
			};
		});
		console.log('Users rejected: ', rejectCount);
		console.log('Users creating: ', createUsers.length);
		return User.bulkCreate(createUsers, { returning: true });
	})
	.then(function(newUsers) {
		newUsers.map((newUser)=> {
			const mongoId = emailToMongoId[newUser.email];
			userMongoToId[mongoId] = newUser.id;
		});
		console.log('Finished migrating Users');
		console.log('----------');
		return undefined;
	})
	.catch(function(err) {
		console.log('Error migrating Users', err.message, err.errors);
	});
}
