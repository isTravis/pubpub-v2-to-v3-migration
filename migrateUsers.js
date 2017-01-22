import Promise from 'bluebird';
import { User } from './models';

export default function(oldDB) {
	const emailsUsed = new Set();
	let rejectCount = 0;

	return new Promise(function(resolve, reject) {
		resolve(oldDB.collection('users').find({}))
	})
	.then(function(users) {
		return users.toArray();
	})
	.then(function(userArray) {
		const createUsers = userArray.filter((user)=> {
			if (!user.firstName || !user.lastName) {
				console.log('no firstname or lastname')
				console.log(user);
				rejectCount += 1;
				return false;
			}
			if (emailsUsed.has(user.email.trim())) {
				console.log('duplicate email');
				console.log(user);
				rejectCount += 1;
				return false;
			}
			emailsUsed.add(user.email.trim());
			return true;
		}).map((user)=> {
			return {
				username: user.username,
				firstName: user.firstName,
				lastName: user.lastName,
				avatar: user.image,
				email: user.email.trim(),
				bio: user.bio,
				publicEmail: user.publicEmail,
				github: user.github,
				orcid: user.orcid,
				twitter: user.twitter,
				website: user.website,
				googleScholar: user.googleScholar,
				accessToken: 'BLAHBLAH',
				createdAt: user.registerDate,
				hash: user.hash,
				salt: user.salt,
			};
		});
		console.log('User accounts rejected: ', rejectCount);
		return User.bulkCreate(createUsers);
	})
	.then(function() {
		console.log('Finished migrating Users');
	})
	.catch(function(err) {
		console.log('Error migrating Users', err.message, err.errors);
	});
}
