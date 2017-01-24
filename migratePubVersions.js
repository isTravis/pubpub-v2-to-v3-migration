import Promise from 'bluebird';
import { Version, File } from './models';
import { generateHash } from './generateHash';

export default function(oldDb, userMongoToId, pubMongoToId) {
	let rejectCount = 0;

	const embedTypes = new Set();

	return new Promise(function(resolve, reject) {
		resolve(oldDb.collection('versions').find({ type: 'document' }))
	})
	.then(function(versions) {
		return versions.toArray();
	})
	.then(function(versionArray) {

		// Iterate through version.content.docJSON and pull out all embed file URLs
		// Upload all those files and get their final assets.pubpub.org URL
		// Transform the docJSON to use relative paths
		// Create a json file from the docJSON and upload that. 
		// Make objects out of those files (keep track of these objects and their file ids - or, after bulkCreate, iterate over them (..but they'll be lost?))
		// Create fileObjects (needs to know pub ID) and upload
		// Create version objects and upload
		// Create VersionFiles (need to have listing of file to version id)

		const mimeTypes = {
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			gif: 'image/gif',
			tif: 'image/tiff',
			tiff: 'image/tiff',
			bmp: 'image/bmp',
			mp4: 'video/mp4',
			m4v: 'video/mp4',
			mov: 'video/quicktime',
			avi: 'video/avi',
			pdf: 'application/pdf',
			ipynb: 'jupyter',

		};
		const filteredVersions = versionArray.filter((version)=> {
			if (!version.createDate) {
				rejectCount += 1;
				return false;
			}
			if (!pubMongoToId[version.parent]) {
				rejectCount += 1;
				return false;
			}
			return true;
		});
		const createFiles = filteredVersions.map((version, index)=> {
			// Create all the file objects
			// restructure docJSON to have relative paths to filenames of objects from previous step
			// Create a file for the docJSON (and upload somewhere?)
			// Using that docJSON url, create a file object for the docJSON
			// Be sure to deduplicate files before upload
			// For each of these files, push to an array, fileParentVersions the current version id (index).
				// This array will be as long as the number of files we are creating in bulk.
				// The index of each newly created file will correspond to the index in fileParentVersions
			// process() all those files.
			// Create processed file objects
			// Create Versions

			// .then, create VersionFiles using fileParentVersions

			const embedObjects = iterateObject(version.content.docJSON);
			return embedObjects.filter((embed)=> {
				if (!embed.content || !embed.content.url) { return false; }
				return (embed.type === 'image' || embed.type === 'video' || embed.type === 'jupyter' || embed.type === 'pdf');
			}).map((embed)=> {
				if (!mimeTypes[embed.content.url.split('.').pop().toLowerCase()]) {
					console.log(embed.content.url);
				}
				return {
					type: mimeTypes[embed.content.url.split('.').pop().toLowerCase()] || 'image/jpeg',
					name: embed.parent.title,
					url: embed.content.url,
					createdAt: embed.parent.createDate,
					pubId: pubMongoToId[version.parent],
				};
			});
		});

		const mergedFiles = [].concat.apply([], createFiles);

		const fileURLs = {};
		const dedupedFiles = mergedFiles.filter((file)=> {
			if (fileURLs[file.url]) { return false; }
			fileURLs[file.url] = true;
			return true;
		});
		console.log('merged file count ', mergedFiles.length);
		console.log('deduped file count ', dedupedFiles.length);


		// console.log(mergedFiles);
		const createVersions = filteredVersions.filter((version)=> {
			if (!pubMongoToId[version.parent]) {
				rejectCount += 1; // Likely versions associated with deleted/inactive pubs. 
				return false;
			}
			return true;
		}).map((version, index)=> {
			return { 
				message: version.message,
				isPublished: version.isPublished,
				hash: null, // Need to generate hash. Which means we first need to get all of the files uploaded and ready.
				publishedAt: version.isPublished ? version.publishedDate : null,
				publishedBy: userMongoToId[version.publishedBy],
				defaultFile: 'main.pub',
				pubId: pubMongoToId[version.parent],
				createdAt: version.createDate,
			};
		});
		console.log('Versions rejected: ', rejectCount);
		console.log('Versions creating: ', createVersions.length);
		return Promise.all([
			Version.bulkCreate(createVersions, { returning: true }),
			File.bulkCreate(dedupedFiles, { returning: true })
		]);
	})
	.then(function(newVersions) {
		// newJournals.map((newJournal)=> {
		// 	const mongoId = slugToMongoId[newJournal.slug];
		// 	journalMongoToId[mongoId] = newJournal.id;
		// });
		console.log('Finished migrating Versions');
		console.log('----------');
		return undefined;
	})
	.catch(function(err) {
		console.log('Error migrating Versions', err.message, err.errors);
	});
}

const iterateObject = function(object, array) {
	const tempArray = array || [];
	if (object.type === 'embed') { tempArray.push(object.attrs.data); }
	
	if (object.content) {
		const newContent = Array.isArray(object.content) ? object.content : [object.content];
		newContent.forEach((content)=> {
			iterateObject(content, tempArray);
		});
	}

	return tempArray;
};
