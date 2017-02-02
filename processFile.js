/* eslint-disable no-bitwise */

// TODO: This file needs to be moved to a worker dyno and 
// a simple messaging task queue has to be setup.

import https from 'https';
import Promise from 'bluebird';
import fs from 'fs';
import hashFiles from 'hash-files';
import tmp from 'tmp-promise';
import { uploadLocalFile } from './uploadLocalFile';

const fsWriteFile = Promise.promisify(fs.writeFile);
tmp.setGracefulCleanup();

// const setDelay = function() {
// 	// console.log('1a');
// 	return new Promise(function(resolve, reject) {
// 		setTimeout(function() {
// 			// console.log('1b');
// 			resolve();
// 		// }, Math.random() * 360 * 1000);
// 		// }, Math.random() * 60 * 1000);
// 		}, Math.random() * 0 * 1000);
// 	});
// };

const generateAndSaveFile = function(file, debug) {
	if (debug) { return new Promise(function(resolve, reject) { resolve(); }) }
	// Create a file from file.docJSON, 
	// Upload it, 
	// Change fileUrl (make it a let);
	// then proceed as normal
	const fileUrl = file.url;
	const fileType = file.type;
	const fileContent = file.content;
	const extension = fileUrl ? fileUrl.substr((~-fileUrl.lastIndexOf('.') >>> 0) + 2) : 'jpg';
	// console.log('2a');
	return new Promise(function(resolve, reject) {
		// console.log('2b');
		if (fileType === 'ppub' && fileUrl === '/temp.ppub' && fileContent) {
			// console.log('2c');
			resolve(tmp.file({ postfix: '.' + extension }));
		}
		if (fileType === 'text/markdown' && fileUrl === '/temp.md' && fileContent) {
			// console.log('2c');
			resolve(tmp.file({ postfix: '.' + extension }));
		}
		resolve(null);
	})
	.then(function(object) {
		// console.log('2d');
		const storedContent = fileType === 'ppub' ? JSON.stringify(fileContent, null, 2) : fileContent;
		if (object) {
			return fsWriteFile(object.path, storedContent, 'utf-8')
			.then(function() {
				// console.log('2e');
				return uploadLocalFile(object.path, file.id);
			})
			.catch(function(err) {
				console.log('Error generating and saving file', file, err);
			});
		}
		return null;
	});
};

const uploadToPubPub = function(pathname, fileUrl, fileId) {
	// console.log('9a');
	return new Promise(function(resolve, reject) {
		if (fileUrl.indexOf('https://assets.pubpub.org') === -1) {
			// console.log('9aa');
			resolve(uploadLocalFile(pathname, fileId));
		} else {
			resolve(null);	
		}
		
	});
};

const generateHash = function(pathname) {
	// console.log('9b');
	return new Promise(function(resolve, reject) {
		hashFiles({ files: [pathname] }, function(error, hash) {
			// console.log('9bb');
			if (error) { reject(error); }
			resolve(hash);
		});
	});
};

const getContent = function(pathname, fileType) {
	// console.log('9c');
	return new Promise(function(resolve, reject) {

		if (fileType === 'text/markdown') { 
			// console.log('9cc');
			fs.readFile(pathname, 'utf8', function (err, data) {
				if (err) { reject(err); }
				resolve(data);
			});
		} else if (fileType === 'ppub') {
			// console.log('9cc');
			fs.readFile(pathname, 'utf8', function (err, data) {
				if (err) { reject(err); }
				resolve(data);
			});
		} else {
			resolve(null);
		}
	});
};


export function processFile(file, statusObject) {
	// statusObject[file.id] = file;
	let fileUrl = file.url;
	const fileType = file.type;
	const extension = fileUrl ? fileUrl.substr((~-fileUrl.lastIndexOf('.') >>> 0) + 2) : 'jpg';
	const debug = true;
	// Grab the file. 
	// If the URL is not a pubpub url, then upload it to pubpub and grab new url
	// Generate the hash
	// If the file is of certain types, pre-generate the content (e.g. grab the markdown)

	// console.log(1);
	return generateAndSaveFile(file, debug)
	.then(function(newFileUrl) {
		// console.log(3);
		if (newFileUrl) { fileUrl = newFileUrl; }
		return null;
	})
	.then(function() {
		// console.log(4);
		return tmp.file({ prefix: `${file.id}-`, postfix: '.' + extension });
	})
	.then(function(object) {
		// console.log(5);
		const pathname = object.path;

		if (debug) { return ['fakeurl.com', 'fakehash', JSON.stringify(file.content, null, 2)]; }
		
		return new Promise(function(resolve, reject) {
			const writeFile = fs.createWriteStream(pathname);
			// console.log(6);
			https.get(fileUrl.replace('http://', 'https://'), function(response) {
				// console.log(7);
				response.pipe(writeFile);
				writeFile.on('finish', function() {
					// console.log(8);
					writeFile.close(function() {
						// console.log(9);
						Promise.all([
							uploadToPubPub(pathname, fileUrl, file.id),
							generateHash(pathname),
							getContent(pathname, fileType),
						])
						.then(function(results) {
							// console.log(10);
							resolve(results);
						})
						.catch(function(err) {
							console.log('Error in write promises', file, err);
						});
						
					});

				})
				.on('error', function(err) {
					reject(err);
				});
			}).on('error', (err) => {
				reject(err);
			});
		});
	})
	.then(function(data) {
		// console.log(11);
		delete statusObject[file.id];
		if (Object.keys(statusObject).length % 100 === 0 || Object.keys(statusObject).length < 10) {
			console.log(Object.keys(statusObject).length)
			// map((key)=> {
			// 	return statusObject[key].oldUrl;
			// }));	
		}
		return {
			url: data[0] || fileUrl,
			hash: data[1] || null,
			content: data[2] || null,
		};	
	})
	.catch(function(err) {
		// delete statusObject[file.id];
		// if (Object.keys(statusObject).length < 25) {
		// 	console.log(Object.keys(statusObject).map((key)=> {
		// 		return statusObject[key].oldUrl;
		// 	}));	
		// }
		console.log('Error in process file. Trying again', { ...file, content: undefined }, err);
		return processFile(file, statusObject);
		
	});
}
