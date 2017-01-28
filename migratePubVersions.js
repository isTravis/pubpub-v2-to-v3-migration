import Promise from 'bluebird';
import SHA1 from 'crypto-js/sha1';
import encHex from 'crypto-js/enc-hex';
import { migrateJSON } from 'pubpub-prose/migrate';
import { Version, File, VersionFile, Highlight } from './models';
import { generateHash } from './generateHash';
import { processFile } from './processFile';


export default function(oldDb, userMongoToId, pubMongoToId, pubMongoToFirstAuthorId) {
	let rejectCount = 0;

	const versionIdToPubFileId = {};
	const versionIdToPubFileHash = {};
	const versionIdToPubFileName = {};
	const embedTypes = new Set();
	const oldURLVersions = {};

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
		}).sort((foo, bar)=> {
			// Sort so earliest link is first
			if (foo.createDate > bar.createDate) { return 1; }
			if (foo.createDate < bar.createDate) { return -1; }
			return 0;
		});
		// }).slice(0, 200);

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


			// Convert to new type of docJSON
			const embedObjects = iterateObject(version.content.docJSON);


			const embedFiles = embedObjects.filter((embed)=> {
				if (!embed.content || !embed.content.url) { return false; }
				if (embed.content.url.indexOf('1470350820769_sw4') > -1) { return false; }
				return (embed.type === 'image' || embed.type === 'video' || embed.type === 'jupyter' || embed.type === 'pdf');
			}).map((embed)=> {
				// For a given oldURL, grab all of the versions it was a part of, so we can later create VersionFile entries
				oldURLVersions[embed.content.url] = oldURLVersions[embed.content.url] ? oldURLVersions[embed.content.url].concat([index + 1]) : [index + 1];
				return {
					type: mimeTypes[embed.content.url.split('.').pop().toLowerCase()] || 'image/jpeg',
					name: embed.parent.title,
					url: embed.content.url,
					createdAt: embed.parent.createDate,
					pubId: pubMongoToId[version.parent],
					oldUrl: embed.content.url,
				};
			});
			oldURLVersions[`version${version._id}`] = [index + 1];
			// if (pubMongoToId[version.parent] === 648) {
			// 	console.log(version.content.markdown);
			// }56da0dfc62eb513d008c8ff9
			

			const migratedJSON = migrateJSON(JSON.parse(JSON.stringify(version.content.docJSON)));
			console.log(index);
			return [...embedFiles, {
				type: 'ppub',
				name: 'main.ppub',
				url: '/temp.ppub',
				createdAt: version.createDate,
				pubId: pubMongoToId[version.parent],
				oldUrl: `version${version._id}`,
				content: migratedJSON.docJSON,
			}];
		});

		// createFiles is an array of arrays. Each inner array represents the files associated with a single version.
		// Merge these arrays so we can do a single bulk create
		const mergedFiles = [].concat.apply([], createFiles);








		// Many files are reused across versions,
		// We don't want to upload identical files, so dedupe based on url.
		const fileURLs = {};
		const dedupedFiles = mergedFiles.filter((file)=> {
			if (file.url !== '/temp.ppub' && fileURLs[file.url]) { return false; }
			fileURLs[file.url] = true;
			return true;
		}).map((file, index)=> {
			// We know the file creation increments the id - but do that explicitly here,
			// so we can generate the fileId necessary for VersionFile creations.
			return {
				...file,
				id: index + 1,
			}
		// }).slice(0, 10);
		});
		console.log('merged file count ', mergedFiles.length);
		console.log('deduped file count ', dedupedFiles.length);

		// Process files to upload content to PubPub when needed, generate hashes, etc
		const statusObject = {};
		const processFilePromises = dedupedFiles.map((file)=> {
			return processFile(file, statusObject);
		});

		return Promise.all([dedupedFiles, filteredVersions, Promise.all(processFilePromises)]);
	})
	.spread(function(dedupedFiles, filteredVersions, processedFileResults) {
		// Merge assembles file objects with processed file objects to get real content, urls, and hashes
		const processedFiles = dedupedFiles.map((file, index)=> {
			if (file.pubId === 648) {
				// console.log('section1');
				// console.log(file);
				// console.log(processedFileResults[index]);
			}
			return {
				...file,
				...processedFileResults[index],
			};
		});

		// console.log(`dedupe length ${dedupedFiles.length} and processedFileLength ${processedFileResults.length}`)


		const versionHashes = {};
		const newVersionFileEntries = processedFiles.map((file)=> {
			return [...new Set(oldURLVersions[file.oldUrl])].map((versionId)=> {
				if (file.type === 'ppub') { 
					versionIdToPubFileId[versionId] = file.id; 
					versionIdToPubFileHash[versionId] = file.hash;
					versionIdToPubFileName[versionId] = file.name;
				}

				// if (file.id === 871) {
				// 	console.log('section2');
				// 	console.log(file);
				// }

				// if (versionId === 635) {
				// 	console.log('section 3');
				// 	console.log(file);
				// }
				// if (file.pubId === 648) {
				// 	console.log('section 4');
				// 	console.log(file);
				// }
				versionHashes[versionId] = versionHashes[versionId] ? versionHashes[versionId].concat([file.hash]) : [file.hash];
				return { versionId: versionId, fileId: file.id, createdAt: file.createdAt };	
			})
		});

		const mergedVersionFiles = [].concat.apply([], newVersionFileEntries);
		const createVersions = filteredVersions.map((version, index)=> {
			// To generate the version hash, take the hash of all the files, sort them alphabetically, concatenate them, and then hash that string.
			const versionFileHashes = versionHashes[index + 1] || [];
			const fileHashString = versionFileHashes.sort((foo, bar)=> {
				if (foo > bar) { return 1; }
				if (foo < bar) { return -1; }
				return 0;
			})
			.reduce((previous, current)=> {
				return previous + current;
			}, '');

			return { 
				id: index + 1,
				message: version.message,
				isPublished: version.isPublished,
				hash: SHA1(fileHashString).toString(encHex), // Need to generate hash. Which means we first need to get all of the files uploaded and ready.
				publishedAt: version.isPublished ? version.publishedDate : null,
				publishedBy: version.isPublished ? userMongoToId[version.publishedBy] : null,
				defaultFile: 'main.ppub',
				pubId: pubMongoToId[version.parent],
				createdAt: version.createDate,
			};
		});






		const createHighlights = filteredVersions.map((version, index)=> {
			// To generate the version hash, take the hash of all the files, sort them alphabetically, concatenate them, and then hash that string.
			const versionFileHashes = versionHashes[index + 1] || [];
			const fileHashString = versionFileHashes.sort((foo, bar)=> {
				if (foo > bar) { return 1; }
				if (foo < bar) { return -1; }
				return 0;
			})
			.reduce((previous, current)=> {
				return previous + current;
			}, '');


			const embedObjects = iterateObject(version.content.docJSON);
			return embedObjects.filter((embed)=> {
				if (embed.type !== 'highlight') { return false; }
				if (!embed.content || !embed.content.text || !embed.content.context) { return false; }
				return true;
			}).map((embed)=> {
				const context = embed.content.context;
				const text = embed.content.text;
				const textStart = context.indexOf(text);
				const textEnd = textStart + text.length;
				const prefixStart = Math.max(textStart - 10, 0);
				const suffixEnd = Math.min(textEnd + 10, context.length);
				const thing = {
					userId: pubMongoToFirstAuthorId[version.parent],
					pubId: pubMongoToId[version.parent],
					versionId: index + 1,
					versionHash: SHA1(fileHashString).toString(encHex),
					
					fileId: versionIdToPubFileId[index + 1],
					fileHash: versionIdToPubFileHash[index + 1],
					fileName: versionIdToPubFileName[index + 1],
					
					prefix: context.substring(prefixStart, textStart),
					exact: embed.content.text,
					suffix: context.substring(textEnd, suffixEnd),
					context: embed.content.context,
				};
				return thing;
			});
		});


		const mergedHighlights = [].concat.apply([], createHighlights);






		console.log('Versions rejected: ', rejectCount);
		console.log('Versions creating: ', createVersions.length);
		return Promise.all([
			Version.bulkCreate(createVersions, { returning: true }),
			processedFiles,
			mergedHighlights,
			mergedVersionFiles,
		]);
	})
	.spread(function(newVersions, processedFiles, mergedHighlights, mergedVersionFiles) {
		// console.log('section 33');
		return Promise.all([
			newVersions,
			File.bulkCreate(processedFiles, { returning: true }),
			mergedHighlights,
			mergedVersionFiles,
		]);
	})
	.spread(function(newVersions, processedFiles, mergedHighlights, mergedVersionFiles) {
		// console.log('section 44');
		return Promise.all([
			newVersions,
			processedFiles,
			mergedHighlights,
			VersionFile.bulkCreate(mergedVersionFiles),
		]);
	})
	.spread(function(newVersions, newFiles, mergedHighlights, mergedVersionFiles) {
		// console.log('section 55');
		return Promise.all([
			Highlight.bulkCreate(mergedHighlights)
			// VersionFile.bulkCreate(mergedVersionFiles),
			
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
		console.log('Error migrating Versions', err.message, err.errors, err);
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
