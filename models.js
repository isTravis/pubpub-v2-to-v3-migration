import Promise from 'bluebird';
const Sequelize = require('sequelize');
const passportLocalSequelize = require('passport-local-sequelize');

require('./config.js');

const updatePubCache = function(pubId) {
	return null;
};

const updateUserCache = function(userId) {
	return null;
};

const updateJournalCache = function(journalId) {
	return null;
};

const updateLabelCache = function(labelId) {
	return null;
};


const useSSL = process.env.POSTGRES_URL.indexOf('localhost:') === -1;
const sequelize = new Sequelize(process.env.POSTGRES_URL, { logging: false, dialectOptions: { ssl: useSSL } });

// Change to true to update the model in the database.
// NOTE: This being set to true will erase your data.
// sequelize.sync({ force: true });

// Used to collect emails to create user accounts with.
// Trigger is attached such that emails are sent when a new row is added.
const SignUp = sequelize.define('SignUp', {
	email: { 
		type: Sequelize.STRING, 
		allowNull: false, 
		unique: true,
		validate: {
			isEmail: true
		} 
	},
	hash: { type: Sequelize.TEXT },
	count: { type: Sequelize.INTEGER },
	completed: { type: Sequelize.BOOLEAN },
});

const User = sequelize.define('User', {
	username: {
		type: Sequelize.TEXT, 
		unique: true, 
		allowNull: false,
		validate: {
			isLowercase: true,
			len: [1, 280],
			is: /^(?=.*[a-zA-Z])[a-zA-Z0-9\-_]+$/, // Must contain at least one letter, alphanumberic and underscores and hyphens
		},
	},
	firstName: { type: Sequelize.TEXT, allowNull: false },
	lastName: { type: Sequelize.TEXT, allowNull: false },
	avatar: { type: Sequelize.TEXT, allowNull: false },
	email: { 
		type: Sequelize.TEXT, 
		allowNull: false, 
		unique: true,
		validate: {
			isEmail: true,
			isLowercase: true,
		} 
	},
	isUnclaimed: { type: Sequelize.BOOLEAN }, // Used to add a user/author to a pub that isn't in the system. When claimed, the foreign keys are changed/merged with the real account.
	bio: { 
		type: Sequelize.TEXT,
		validate: {
			len: [0, 280],
		},
	},
	publicEmail: { 
		type: Sequelize.TEXT, 
		validate: {
			isEmail: true,
		} 
	},
	github: { type: Sequelize.TEXT },
	orcid: { type: Sequelize.TEXT },
	twitter: { type: Sequelize.TEXT },
	website: { type: Sequelize.TEXT },
	googleScholar: { type: Sequelize.TEXT },
	accessToken: { type: Sequelize.TEXT },
	resetHashExpiration: Sequelize.DATE,
	resetHash: { type: Sequelize.TEXT },
	inactive: { type: Sequelize.BOOLEAN },
	hash: { type: Sequelize.TEXT, allowNull: false },
	salt: { type: Sequelize.TEXT, allowNull: false },
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { updateUserCache(updatedItem.id); },
		afterUpdate: function(updatedItem, options) { updateUserCache(updatedItem.id); },
		afterDelete: function(updatedItem, options) { updateUserCache(updatedItem.id); },
	}
});

passportLocalSequelize.attachToUser(User, {
	usernameField: 'email',
	hashField: 'hash',
	saltField: 'salt'
});

const Pub = sequelize.define('Pub', {
	slug: {
		type: Sequelize.TEXT, 
		unique: true, 
		allowNull: false,
		validate: {
			isLowercase: true,
			len: [1, 280],
			is: /^(?=.*[a-zA-Z])[a-zA-Z0-9\-_]+$/, // Must contain at least one letter, alphanumberic and underscores and hyphens
		},
	},
	title: { type: Sequelize.TEXT, allowNull: false },
	description: { 
		type: Sequelize.TEXT,
		validate: {
			len: [0, 280],
		}, 
	},
	avatar: { type: Sequelize.TEXT, allowNull: false }, 
	// isReply: { type: Sequelize.BOOLEAN }, // May not be necessary. Presence of rootReplyPubId dictates isReply
	isClosed: { type: Sequelize.BOOLEAN }, // Used for replies.
	hideAuthorsList: { type: Sequelize.BOOLEAN },
	// customAuthorList: { type: Sequelize.TEXT }, I don't think we need this... We can store custom names in the contributor
	distinguishedClone: { type: Sequelize.BOOLEAN }, 
	inactive: { type: Sequelize.BOOLEAN },
	isPublished: { type: Sequelize.BOOLEAN },
	isRestricted: { type: Sequelize.BOOLEAN },
	threadNumber: { type: Sequelize.INTEGER }, // Used for discussions, to mark top-level discussion with a unique (per-pub , per published/unpublished) number
	headerColor: { type: Sequelize.STRING },
	headerImage: { type: Sequelize.TEXT },
	// cloneParentPubId
	// cloneParentVersionId
	// rootReplyPubId
	// parentReplyPubId
	// pullRequestVersionId
	// licenseId
	// defaultContext
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updatePubCache(updatedItem.id); 
			updatePubCache(updatedItem.replyRootPubId);
		},
		afterUpdate: function(updatedItem, options) { 
			updatePubCache(updatedItem.id); 
			updatePubCache(updatedItem.replyRootPubId);
		},
		afterDelete: function(updatedItem, options) { 
			updatePubCache(updatedItem.id); 
			updatePubCache(updatedItem.replyRootPubId);
		},
	}
});

const File = sequelize.define('File', {
	type: { type: Sequelize.STRING, allowNull: false },
	name: { type: Sequelize.STRING, allowNull: false },
	url: { type: Sequelize.TEXT, allowNull: false },
	content: { type: Sequelize.TEXT },
	hash: { type: Sequelize.TEXT, allowNull: false },
	originalDate: { type: Sequelize.DATE },
});

const Version = sequelize.define('Version', {
	message: { type: Sequelize.TEXT, allowNull: false },
	isPublished: { type: Sequelize.BOOLEAN },
	isRestricted: { type: Sequelize.BOOLEAN },
	hash: { type: Sequelize.TEXT, allowNull: false },
	publishedAt: { type: Sequelize.DATE }, 
	doi: { type: Sequelize.TEXT },
	defaultFile: { type: Sequelize.TEXT, allowNull: false },
	// pubId
	// publishedBy
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { updatePubCache(updatedItem.pubId); },
		afterUpdate: function(updatedItem, options) { updatePubCache(updatedItem.pubId); },
	}
});

const Journal = sequelize.define('Journal', {
	title: {
		type: Sequelize.TEXT,
		allowNull: false,
	},
	slug: { 
		type: Sequelize.TEXT, 
		unique: true, 
		allowNull: false,
		validate: {
			isLowercase: true,
			len: [1, 280],
			is: /^(?=.*[a-zA-Z])[a-zA-Z0-9\-_]+$/, // Must contain at least one letter, alphanumberic and underscores and hyphens
		},
	},
	description: { 
		type: Sequelize.TEXT,
		validate: {
			len: [0, 280],
		}, 
	},
	about: { type: Sequelize.TEXT },
	customDomain: { type: Sequelize.TEXT },
	logo: { type: Sequelize.TEXT },
	avatar: { type: Sequelize.TEXT, allowNull: false },
	website: { type: Sequelize.TEXT },
	twitter: { type: Sequelize.TEXT },
	facebook: { type: Sequelize.TEXT },
	headerColor: { type: Sequelize.STRING },
	headerMode: { type: Sequelize.STRING },
	headerAlign: { type: Sequelize.STRING },
	headerImage: { type: Sequelize.TEXT },
	inactive: { type: Sequelize.BOOLEAN },
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { updateJournalCache(updatedItem.id); },
		afterUpdate: function(updatedItem, options) { updateJournalCache(updatedItem.id); },
		afterDestroy: function(updatedItem, options) { updateJournalCache(updatedItem.id); },
	}
});

const Activity = sequelize.define('Activity', {
	verb: { type: Sequelize.TEXT, allowNull: false },
	// actorJournalId
	// actorUserId
	// targetPubId
	// targetUserId
	// targetJournalId
	// targetLabelId
	// objectPubId
	// objectUserId
	// objectJournalId
	// objectLabelId
});

const License = sequelize.define('License', {
	title: { type: Sequelize.TEXT },
	description: { type: Sequelize.TEXT },
	url: { type: Sequelize.TEXT },
	avatar: { type: Sequelize.TEXT },
});

const Label = sequelize.define('Label', {
	title: { 
		type: Sequelize.TEXT,
		allowNull: false,
		validate: {
			len: [1, 140],
		},
	},
	slug: { type: Sequelize.TEXT },
	color: { type: Sequelize.STRING },
	description: { type: Sequelize.TEXT },
	isDisplayed: { type: Sequelize.BOOLEAN }, // Used for some labels to mark whether they are rendered in special places, e.g. in a Journal's nav as pages
	order: { type: Sequelize.DOUBLE }, // Used for some labels to mark their order, e.g. in a Journal's nav. Doubles in the range of (0-1) exclusive.
	// journalId: journalId is used if a label is owned by a particular journal. These labels are used for pages
	// pubId: pubId is used to allow a pub to set it's own list of privately-editable labels for discussions.
	// userId: userId is used and private to a user to allow them to organize pubs that they follow
	// If there is no pubId and no journalId and no userId, it is a pubic label that can be used by anyone. These must be managed by the community.
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			if (updatedItem.pubId) { updatePubCache(updatedItem.pubId); }
			if (updatedItem.userId) { updateUserCache(updatedItem.userId); }
			if (updatedItem.journalId) { updateJournalCache(updatedItem.journalId); }
		},
		afterUpdate: function(updatedItem, options) {
			if (updatedItem.pubId) { updatePubCache(updatedItem.pubId); }
			if (updatedItem.userId) { updateUserCache(updatedItem.userId); }
			if (updatedItem.journalId) { updateJournalCache(updatedItem.journalId); }
		},
		afterDestroy: function(updatedItem, options) {
			if (updatedItem.pubId) { updatePubCache(updatedItem.pubId); }
			if (updatedItem.userId) { updateUserCache(updatedItem.userId); }
			if (updatedItem.journalId) { updateJournalCache(updatedItem.journalId); }
		},
	}
});

const Role = sequelize.define('Role', {
	title: { type: Sequelize.TEXT },
});

const Highlight = sequelize.define('Highlight', {
	// userId: { type: Sequelize.INTEGER },
	// pubId: { type: Sequelize.INTEGER },
	// versionId: { type: Sequelize.INTEGER },
	// fileId: { type: Sequelize.INTEGER },
	versionHash: { type: Sequelize.TEXT },	
	fileHash: { type: Sequelize.TEXT },
	fileName: { type: Sequelize.TEXT },
	prefix: { type: Sequelize.TEXT },
	exact: { type: Sequelize.TEXT },
	suffix: { type: Sequelize.TEXT },
	context: { type: Sequelize.TEXT },
});


const UserLastReadPub = sequelize.define('UserLastReadPub', {
	lastRead: { type: Sequelize.DATE },
});

const Contributor = sequelize.define('Contributor', {
	id: { 
		type: Sequelize.INTEGER, 
		primaryKey: true, 
		autoIncrement: true 
	},
	canEdit: { type: Sequelize.BOOLEAN },
	canRead: { type: Sequelize.BOOLEAN },
	customName: { type: Sequelize.TEXT },
	isAuthor: { type: Sequelize.BOOLEAN },
	isHidden: { type: Sequelize.BOOLEAN }, // Whether the contributor shows up on the 'Contributors' list. isAuthor=true forces isHidden false (or isHidden is ignored at least)
	inactive: { type: Sequelize.BOOLEAN }, // Used when a contributor is removed so we have a history of contributors and how they were applied/removed
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateUserCache(updatedItem.userId);
		},
		afterUpdate: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateUserCache(updatedItem.userId);
		},
		afterDestroy: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateUserCache(updatedItem.userId);
		},
	}
});

const InvitedReviewer = sequelize.define('InvitedReviewer', {
	// email and name only used if not tied to an existing pubpub user
	email: { 
		type: Sequelize.TEXT,  
		validate: {
			isEmail: true,
		} 
	},
	name: { type: Sequelize.TEXT },
	invitationAccepted: { type: Sequelize.BOOLEAN },
	invitationRejected: { type: Sequelize.BOOLEAN },
	rejectionReason: { type: Sequelize.TEXT },
	// invitedUserId: used to mark which user has been invited
	// inviterUserId: used to mark which user created the invitiation
	// inviterJournalId: used to mark which journal the invitation is on behalf of
	// pubId: used to mark which pub they have been invited to.
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateUserCache(updatedItem.invitedUserId);
			updateUserCache(updatedItem.inviterUserId);
			updateJournalCache(updatedItem.inviterJournalId);
		},
		afterUpdate: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateUserCache(updatedItem.invitedUserId);
			updateUserCache(updatedItem.inviterUserId);
			updateJournalCache(updatedItem.inviterJournalId);
		},
		afterDestroy: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateUserCache(updatedItem.invitedUserId);
			updateUserCache(updatedItem.inviterUserId);
			updateJournalCache(updatedItem.inviterJournalId);
		},
	}
});

const ApiKey = sequelize.define('ApiKey', {
	title: { type: Sequelize.TEXT },
	keyId: { type: Sequelize.TEXT },
	keySecret: { type: Sequelize.TEXT },
	//userId: the associated user that this authenticates.
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { updateUserCache(updatedItem.userId); },
		afterDestroy: function(updatedItem, options) { updateUserCache(updatedItem.userId); },
	}
});

// Used on a Pub (typically a discussion pub)
const Reaction = sequelize.define('Reaction', {
	title: { type: Sequelize.TEXT },
	keywords: { type: Sequelize.TEXT },
	icon: { type: Sequelize.TEXT },
});

const JournalAdmin = sequelize.define('JournalAdmin', {
	id: { 
		type: Sequelize.INTEGER, 
		primaryKey: true, 
		autoIncrement: true 
	},
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updateUserCache(updatedItem.userId);
			updateJournalCache(updatedItem.journalId);
		},
		afterUpdate: function(updatedItem, options) { 
			updateUserCache(updatedItem.userId);
			updateJournalCache(updatedItem.journalId);
		},
		afterDestroy: function(updatedItem, options) { 
			updateUserCache(updatedItem.userId);
			updateJournalCache(updatedItem.journalId);
		},
	}
}); // Used to connect specific users to a specific journal as admin

const VersionFile = sequelize.define('VersionFile', {}); // Used to connect specific files to a specific version
const FileAttribution = sequelize.define('FileAttribution', {
	// fileId
	// userId
	// pubId
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updateUserCache(updatedItem.userId);
			updatePubCache(updatedItem.pubId);
		},
		afterUpdate: function(updatedItem, options) { 
			updateUserCache(updatedItem.userId);
			updatePubCache(updatedItem.pubId);
		},
		afterDestroy: function(updatedItem, options) { 
			updateUserCache(updatedItem.userId);
			updatePubCache(updatedItem.pubId);
		},
	}
}); // Used to connect specific users to a specific journal as admin// Used to connect specific users to a specific file

// Used to connect specific user to a specific pub as follower
const FollowsPub = sequelize.define('FollowsPub', {
	// followerId
	// pubId
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updatePubCache(updatedItem.pubId);
		},
		afterUpdate: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updatePubCache(updatedItem.pubId);
		},
		afterDestroy: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updatePubCache(updatedItem.pubId);
		},
	}
});

// Used to connect specific user to a specific journal as follower
const FollowsJournal = sequelize.define('FollowsJournal', {
	// followerId
	// journalId
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updateJournalCache(updatedItem.journalId);
		},
		afterUpdate: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updateJournalCache(updatedItem.journalId);
		},
		afterDestroy: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updateJournalCache(updatedItem.journalId);
		},
	}
});

// Used to connect specific user to a specific user as follower
const FollowsUser = sequelize.define('FollowsUser', {
	// followerId
	// userId
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updateUserCache(updatedItem.userId);
		},
		afterUpdate: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updateUserCache(updatedItem.userId);
		},
		afterDestroy: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updateUserCache(updatedItem.userId);
		},
	}
});

// Used to connect specific user to a specific label as follower
const FollowsLabel = sequelize.define('FollowsLabel', {
	// followerId
	// labelId
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updateLabelCache(updatedItem.labelId);
		},
		afterUpdate: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updateLabelCache(updatedItem.labelId);
		},
		afterDestroy: function(updatedItem, options) { 
			updateUserCache(updatedItem.followerId);
			updateLabelCache(updatedItem.labelId);
		},
	}
});

	
const ContributorRole = sequelize.define('ContributorRole', {
	inactive: Sequelize.BOOLEAN, // Used when a contributor is removed so we have a history of contributors and how they were applied/removed
	// pubID: used so we can grab all roles when querying for pubs. Needed because we can't 'include' on a through table. Issue here: https://github.com/sequelize/sequelize/issues/5358
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { updatePubCache(updatedItem.pubId); },
		afterDestroy: function(updatedItem, options) { updatePubCache(updatedItem.pubId); }
	}
}); // Used to connect specific role to a specific contributor


const PubFeature = sequelize.define('PubFeature', { // Used to connect specific journal to specific pub as featurer
	isDisplayed: Sequelize.BOOLEAN, // Whether the feature tag is displayed on the front of the pub
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateJournalCache(updatedItem.journalId);
		},
		afterUpdate: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateJournalCache(updatedItem.journalId);
		},
		afterDestroy: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateJournalCache(updatedItem.journalId);
		},
	}
});

// Used to connect specific journal to specific pub as submit destination
const PubSubmit = sequelize.define('PubSubmit', {
	isRejected: Sequelize.BOOLEAN,
	isFeatured: Sequelize.BOOLEAN,
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateJournalCache(updatedItem.journalId);
		},
		afterUpdate: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateJournalCache(updatedItem.journalId);
		},
		afterDestroy: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateJournalCache(updatedItem.journalId);
		},
	}
});

// Used to connect specific reaction to specific pub (typicaly discussion pub)
const PubReaction = sequelize.define('PubReaction', {
	inactive: { type: Sequelize.BOOLEAN }, // Used when a reaction is removed so we have a history of reactions and how they were applied/removed
	// userId
	// pubId
	// replyRootPubId
	// reactionId
}, {
	indexes: [
		{
			name: 'PubReactions_pkey',
			method: 'BTREE',
			fields: ['userId', 'pubId', 'reactionId'],
			unique: true,
		}
	],
	hooks: {
		afterCreate: function(updatedItem, options) { updatePubCache(updatedItem.replyRootPubId); },
		afterDestroy: function(updatedItem, options) { updatePubCache(updatedItem.replyRootPubId); },
	}
});
PubReaction.removeAttribute('id'); // This feels a bit stranger, but sequelize is overwriting our index defined above unless we add this.

// Used to connect specific label to specific pub
const PubLabel = sequelize.define('PubLabel', {
	inactive: { type: Sequelize.BOOLEAN }, // Used when a label is removed so we have a history of labels and how they were applied/removed
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateJournalCache(updatedItem.journalId);
			updateLabelCache(updatedItem.labelId);
		},
		afterDestroy: function(updatedItem, options) { 
			updatePubCache(updatedItem.pubId);
			updateJournalCache(updatedItem.journalId);
			updateLabelCache(updatedItem.labelId);
		},
	}
});

// Used to connect specific file to specific file
const FileRelation = sequelize.define('FileRelation', {
	id: { 
		type: Sequelize.INTEGER, 
		primaryKey: true, 
		autoIncrement: true 
	},
	type: { type: Sequelize.TEXT }, // Used to describe the relationship between to files
}, {
	hooks: {
		afterCreate: function(updatedItem, options) { updatePubCache(updatedItem.pubId); },
		afterDestroy: function(updatedItem, options) { updatePubCache(updatedItem.pubId); },
	}
});

// A user can be an author on many pubs, and a pub can have many authors
User.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubs', through: 'Contributor', foreignKey: 'userId' });
Pub.belongsToMany(User, { onDelete: 'CASCADE', as: 'contributors', through: 'Contributor', foreignKey: 'pubId' });

// A pub can have many contributors, but a contributor belongs to only a single pub
Pub.hasMany(Contributor, { onDelete: 'CASCADE', as: 'contributors', foreignKey: 'pubId' });
User.hasMany(Contributor, { onDelete: 'CASCADE', as: 'contributions', foreignKey: 'userId' });
// Roles can belong to many contributors, and contributors can have many roles
Contributor.belongsToMany(Role, { onDelete: 'CASCADE', as: 'roles', through: 'ContributorRole', foreignKey: 'contributorId' });
Role.belongsToMany(Contributor, { onDelete: 'CASCADE', as: 'contributors', through: 'ContributorRole', foreignKey: 'roleId' });
ContributorRole.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });

// A contributor has a single user
Contributor.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'userId' });
Contributor.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });

// A file can be in many versions, and a version can have many files
File.belongsToMany(Version, { onDelete: 'CASCADE', as: 'versions', through: 'VersionFile', foreignKey: 'fileId' });
Version.belongsToMany(File, { onDelete: 'CASCADE', as: 'files', through: 'VersionFile', foreignKey: 'versionId' });

// A file can belong to a single pub, but a pub can have many files
Pub.hasMany(File, { onDelete: 'CASCADE', as: 'files', foreignKey: 'pubId' });

// A user can be attributed with many files, and a file may attribute many users
File.belongsToMany(User, { onDelete: 'CASCADE', as: 'attributions', through: 'FileAttribution', foreignKey: 'fileId' });
User.belongsToMany(File, { onDelete: 'CASCADE', as: 'files', through: 'FileAttribution', foreignKey: 'userId' });
FileAttribution.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });

// A version belongs to a single pub, but a pub can have many versions
Pub.hasMany(Version, { onDelete: 'CASCADE', as: 'versions', foreignKey: 'pubId' });
Version.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'publishedBy' });

// A user can be an admin on many journals, and a journal can have many admins
User.belongsToMany(Journal, { onDelete: 'CASCADE', as: 'journals', through: 'JournalAdmin', foreignKey: 'userId' });
Journal.belongsToMany(User, { onDelete: 'CASCADE', as: 'admins', through: 'JournalAdmin', foreignKey: 'journalId' });

JournalAdmin.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'userId' });
JournalAdmin.belongsTo(Journal, { onDelete: 'CASCADE', as: 'journal', foreignKey: 'journalId' });
Journal.hasMany(JournalAdmin, { onDelete: 'CASCADE', as: 'admins', foreignKey: 'journalId' });
User.hasMany(JournalAdmin, { onDelete: 'CASCADE', as: 'journalAdmins', foreignKey: 'userId' });

// A user can follow many users, and a user can be followed by many users
User.belongsToMany(User, { onDelete: 'CASCADE', as: 'followsUsers', through: 'FollowsUser', foreignKey: 'followerId' });
User.belongsToMany(User, { onDelete: 'CASCADE', as: 'followers', through: 'FollowsUser', foreignKey: 'userId' });
FollowsUser.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'followerId' });
User.hasMany(FollowsUser, { onDelete: 'CASCADE', as: 'FollowsUsers', foreignKey: 'followerId' });

// A user can follow many journals, and a journal can be followed by many users
User.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'followsPubs', through: 'FollowsPub', foreignKey: 'followerId' });
Pub.belongsToMany(User, { onDelete: 'CASCADE', as: 'followers', through: 'FollowsPub', foreignKey: 'pubId' });
FollowsPub.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'followerId' });
User.hasMany(FollowsPub, { onDelete: 'CASCADE', as: 'FollowsPubs', foreignKey: 'followerId' });
Pub.hasMany(FollowsPub, { onDelete: 'CASCADE', as: 'FollowsPubs', foreignKey: 'followerId' });

// A user can follow many journals, and a journal can be followed by many users
User.belongsToMany(Journal, { onDelete: 'CASCADE', as: 'followsJournals', through: 'FollowsJournal', foreignKey: 'followerId' });
Journal.belongsToMany(User, { onDelete: 'CASCADE', as: 'followers', through: 'FollowsJournal', foreignKey: 'journalId' });
FollowsJournal.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'followerId' });
User.hasMany(FollowsJournal, { onDelete: 'CASCADE', as: 'FollowsJournals', foreignKey: 'followerId' });

// A user can follow many labels, and a label can be followed by many users
User.belongsToMany(Label, { onDelete: 'CASCADE', as: 'followsLabels', through: 'FollowsLabel', foreignKey: 'followerId' });
Label.belongsToMany(User, { onDelete: 'CASCADE', as: 'followers', through: 'FollowsLabel', foreignKey: 'labelId' });
FollowsLabel.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'followerId' });
User.hasMany(FollowsLabel, { onDelete: 'CASCADE', as: 'FollowsLabels', foreignKey: 'followerId' });

// A pub can have many discussions, but a discussion belongs to only a single parent pub
Pub.hasMany(Pub, { onDelete: 'CASCADE', as: 'discussions', foreignKey: 'replyRootPubId' });
Pub.belongsTo(Pub, { onDelete: 'CASCADE', as: 'replyRootPub', foreignKey: 'replyRootPubId' });
// A discussion can have many children, but only has a single parent
Pub.hasMany(Pub, { onDelete: 'CASCADE', as: 'childDiscussions', foreignKey: 'replyParentPubId' });

// A journal can own many labels (used to build pages), but a label can have only one Journal
Journal.hasMany(Label, { onDelete: 'CASCADE', as: 'pages', foreignKey: 'journalId' });
// A user can have many labels, but a label can have only one User
User.hasMany(Label, { onDelete: 'CASCADE', as: 'userLabels', foreignKey: 'userId' });
// A pub can own many (custom discussion) labels, but a label can have only one Pub
Pub.hasMany(Label, { onDelete: 'CASCADE', as: 'pubLabels', foreignKey: 'pubId' });

// A Pub can have many Labels and a Label can apply to many pubs
Pub.belongsToMany(Label, { onDelete: 'CASCADE', as: 'labels', through: 'PubLabel', foreignKey: 'pubId' });
Label.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubs', through: 'PubLabel', foreignKey: 'labelId' });
PubLabel.belongsTo(Journal, { onDelete: 'CASCADE', as: 'journal', foreignKey: 'journalId' });

// A Contributor can have many roles and a Role can be used for many contributors
// Role.belongsToMany(Contributor, { onDelete: 'CASCADE', as: 'contributors', through: 'ContributorRole', foreignKey: 'roleId' });
// Contributor.belongsToMany(Role, { onDelete: 'CASCADE', as: 'roles', through: 'ContributorRole', foreignKey: 'contributorId' });
// Pub.hasMany(ContributorRole, { onDelete: 'CASCADE', as: 'contributorRoles', foreignKey: 'pubId' });
// ContributorRole.belongsTo(Role, { onDelete: 'CASCADE', as: 'role', foreignKey: 'roleId' });

// A Pub can be featured by many journals, and a Journal can feature many pubs
Pub.belongsToMany(Journal, { onDelete: 'CASCADE', as: 'journalsFeatured', through: 'PubFeature', foreignKey: 'pubId' });
Journal.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubsFeatured', through: 'PubFeature', foreignKey: 'journalId' });
PubFeature.belongsTo(Journal, { onDelete: 'CASCADE', as: 'journal', foreignKey: 'journalId' });
PubFeature.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });
PubFeature.belongsTo(Version, { onDelete: 'CASCADE', as: 'version', foreignKey: 'versionId' });
PubFeature.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'createdBy' });
Pub.hasMany(PubFeature, { onDelete: 'CASCADE', as: 'pubFeatures', foreignKey: 'pubId' });
Journal.hasMany(PubFeature, { onDelete: 'CASCADE', as: 'pubFeatures', foreignKey: 'journalId' });

// A Pub can be submitted to many journals, and a Journal can have many submitted pubs
Pub.belongsToMany(Journal, { onDelete: 'CASCADE', as: 'journalsSubmitted', through: 'PubSubmit', foreignKey: 'pubId' });
Journal.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubsSubmitted', through: 'PubSubmit', foreignKey: 'journalId' });
PubSubmit.belongsTo(Journal, { onDelete: 'CASCADE', as: 'journal', foreignKey: 'journalId' });
PubSubmit.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });
PubSubmit.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'createdBy' });
Pub.hasMany(PubSubmit, { onDelete: 'CASCADE', as: 'pubSubmits', foreignKey: 'pubId' });
Journal.hasMany(PubSubmit, { onDelete: 'CASCADE', as: 'pubSubmits', foreignKey: 'journalId' });

// A Pub can be lastRead by many users, and a User can have many lastRead dates for different pubs
Pub.belongsToMany(User, { onDelete: 'CASCADE', as: 'usersRead', through: 'UserLastReadPub', foreignKey: 'pubId' });
User.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubsRead', through: 'UserLastReadPub', foreignKey: 'userId' });

// A Pub can have many reactions, and a Reaction can be used on many Pubs.
// Pub.belongsToMany(Reaction, { onDelete: 'CASCADE', as: 'reactions', through: 'PubReaction', foreignKey: 'pubId' });
// Reaction.belongsToMany(Pub, { onDelete: 'CASCADE', as: 'pubs', through: 'PubReaction', foreignKey: 'reactionId' });
// Reactions need to be tied to a user. We probably want to do something similar to how contributors is structured
PubReaction.belongsTo(User, { onDelete: 'CASCADE', as: 'user', foreignKey: 'userId' });
PubReaction.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });
PubReaction.belongsTo(Reaction, { onDelete: 'CASCADE', as: 'reaction', foreignKey: 'reactionId' });
PubReaction.belongsTo(Pub, { onDelete: 'CASCADE', as: 'replyRootPub', foreignKey: 'replyRootPubId' });
Pub.hasMany(PubReaction, { onDelete: 'CASCADE', as: 'pubReactions', foreignKey: 'pubId' });


// A File can be related to many other files
File.belongsToMany(File, { onDelete: 'CASCADE', as: 'destinations', through: 'FileRelation', foreignKey: 'sourceFileId' });
File.belongsToMany(File, { onDelete: 'CASCADE', as: 'sources', through: 'FileRelation', foreignKey: 'destinationFileId' });
FileRelation.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });

// A pub can have many highlights, but a highlight belongs to only a single pub
Pub.hasMany(Highlight, { onDelete: 'CASCADE', as: 'highlights', foreignKey: 'pubId' });
// A version can have many highlights, but a highlight belongs to only a single version
Version.hasMany(Highlight, { onDelete: 'CASCADE', as: 'highlights', foreignKey: 'versionId' });
// A user can have many highlights, but a highlight belongs to only a single user
User.hasMany(Highlight, { onDelete: 'CASCADE', as: 'highlights', foreignKey: 'userId' });
File.hasMany(Highlight, { onDelete: 'CASCADE', as: 'highlights', foreignKey: 'fileId' });

// A license can be used on many pubs, but a pub belongs to only a single license
License.hasMany(Pub, { onDelete: 'CASCADE', as: 'pubs', foreignKey: 'licenseId' });
// A pub can have one license
Pub.belongsTo(License, { onDelete: 'CASCADE', as: 'license', foreignKey: 'licenseId' });

// A pub can have one default context
Pub.belongsTo(Journal, { onDelete: 'CASCADE', as: 'defaultContextJournal', foreignKey: 'defaultContext' });

// A pub can have many clones, but a clone belongs to only a single parent pub
Pub.hasMany(Pub, { onDelete: 'CASCADE', as: 'clones', foreignKey: 'cloneParentPubId' });
Pub.belongsTo(Pub, { onDelete: 'CASCADE', as: 'cloneParent', foreignKey: 'cloneParentPubId' });

// TODO: These were causing cyclic dependency issues. Find the right structure for what a clone/pr is.
// A version can have many clones, but a clone belongs to only a single parent version
// Version.hasMany(Pub, { onDelete: 'CASCADE', as: 'clones', foreignKey: 'cloneParentVersionId' });
// A discussion Pub can have a single PR
// Pub.belongsTo(Version, { onDelete: 'CASCADE', as: 'pullRequest', foreignKey: 'pullRequestVersionId' });

// A pub can have many invited reviewers, but an invited reviewer belongs to only a single pub
Pub.hasMany(InvitedReviewer, { onDelete: 'CASCADE', as: 'invitedReviewers', foreignKey: 'pubId' });
InvitedReviewer.belongsTo(Pub, { onDelete: 'CASCADE', as: 'pub', foreignKey: 'pubId' });

// A user can be an invited as a reviewer many times, but a review invitation can only have a single user
User.hasMany(InvitedReviewer, { onDelete: 'CASCADE', as: 'invitations', foreignKey: 'invitedUserId' });
InvitedReviewer.belongsTo(User, { onDelete: 'CASCADE', as: 'invitedUser', foreignKey: 'invitedUserId' });

// A user can be an the invitor many times, but a review invitation can only have a single inviter
User.hasMany(InvitedReviewer, { onDelete: 'CASCADE', as: 'invitationsCreated', foreignKey: 'inviterUserId' });
InvitedReviewer.belongsTo(User, { onDelete: 'CASCADE', as: 'inviterUser', foreignKey: 'inviterUserId' });

// A journal can be an the invitor many times, but a review invitation can only have a single journal
Journal.hasMany(InvitedReviewer, { onDelete: 'CASCADE', as: 'invitationsCreated', foreignKey: 'inviterJournalId' });
InvitedReviewer.belongsTo(Journal, { onDelete: 'CASCADE', as: 'inviterJournal', foreignKey: 'inviterJournalId' });

// A user can have many apiKeys, but a key belongs to only a single user
User.hasMany(ApiKey, { onDelete: 'CASCADE', as: 'apiKeys', foreignKey: 'userId' });

// An activity can have a single User or Journal as the actor. No realuse for Pub or Label actors yet, but added for consistency
Activity.belongsTo(Pub, { onDelete: 'CASCADE', as: 'actorPub', foreignKey: 'actorPubId' });
Activity.belongsTo(User, { onDelete: 'CASCADE', as: 'actorUser', foreignKey: 'actorUserId' });
Activity.belongsTo(Journal, { onDelete: 'CASCADE', as: 'actorJournal', foreignKey: 'actorJournalId' });
Activity.belongsTo(Label, { onDelete: 'CASCADE', as: 'actorLabel', foreignKey: 'actorLabelId' });
// An activity can have a single Pub, User, Journal, or Label as the target
Activity.belongsTo(Pub, { onDelete: 'CASCADE', as: 'targetPub', foreignKey: 'targetPubId' });
Activity.belongsTo(User, { onDelete: 'CASCADE', as: 'targetUser', foreignKey: 'targetUserId' });
Activity.belongsTo(Journal, { onDelete: 'CASCADE', as: 'targetJournal', foreignKey: 'targetJournalId' });
Activity.belongsTo(Label, { onDelete: 'CASCADE', as: 'targetLabel', foreignKey: 'targetLabelId' });
// An activity can have a single Pub, User, Journal, or Label as the object
Activity.belongsTo(Pub, { onDelete: 'CASCADE', as: 'objectPub', foreignKey: 'objectPubId' });
Activity.belongsTo(User, { onDelete: 'CASCADE', as: 'objectUser', foreignKey: 'objectUserId' });
Activity.belongsTo(Journal, { onDelete: 'CASCADE', as: 'objectJournal', foreignKey: 'objectJournalId' });
Activity.belongsTo(Label, { onDelete: 'CASCADE', as: 'objectLabel', foreignKey: 'objectLabelId' });

const db = {
	SignUp: SignUp,
	User: User,
	Pub: Pub,
	File: File,
	Version: Version,
	Reaction: Reaction,
	Label: Label,
	Role: Role,
	Highlight: Highlight,
	Journal: Journal,
	JournalAdmin: JournalAdmin,
	ApiKey: ApiKey,
	License: License,
	UserLastReadPub: UserLastReadPub,
	Contributor: Contributor,
	VersionFile: VersionFile,
	FileAttribution: FileAttribution,
	FollowsPub: FollowsPub,
	FollowsJournal: FollowsJournal,
	FollowsUser: FollowsUser,
	FollowsLabel: FollowsLabel,
	ContributorRole: ContributorRole,
	PubFeature: PubFeature,
	PubSubmit: PubSubmit,
	PubLabel: PubLabel,
	PubReaction: PubReaction,
	FileRelation: FileRelation,
	InvitedReviewer: InvitedReviewer,
	Activity: Activity,
};

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
