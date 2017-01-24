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


const uploadToPubPub = function(pathname, fileUrl) {
	return new Promise(function(resolve, reject) {
		if (fileUrl.indexOf('https://assets.pubpub.org') === -1) {
			resolve(uploadLocalFile(pathname));
		} else {
			resolve(null);	
		}
		
	});
};

const generateHash = function(pathname) {
	return new Promise(function(resolve, reject) {
		hashFiles({ files: [pathname] }, function(error, hash) {
			if (error) { reject(error); }
			resolve(hash);
		});
	});
};

const getContent = function(pathname, fileType) {
	return new Promise(function(resolve, reject) {

		if (fileType === 'text/markdown') { 
			fs.readFile(pathname, 'utf8', function (err, data) {
				if (err) { reject(err); }
				resolve(data);
			});
		} else if (fileType === 'ppub') {
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
	statusObject[file.id] = file;
	let fileUrl = file.url;
	const fileType = file.type;
	const fileContent = file.content; // If file.content is a ppub json and file.url is /temp.ppub, then we stringify and upload.
	const extension = fileUrl ? fileUrl.substr((~-fileUrl.lastIndexOf('.') >>> 0) + 2) : 'jpg';
	
	// console.log('Processing file ', file.id);
	// Grab the file. 
	// If the URL is not a pubpub url, then upload it to pubpub and grab new url
	// Generate the hash
	// If the file is of certain types, pre-generate the content (e.g. grab the markdown)
	return new Promise(function(resolve, reject) {
		setTimeout(function() {
			resolve();
		}, Math.random() * 240 * 1000);
	})
	.then(function() {
		return new Promise(function(resolve, reject) {
			if (fileType === 'ppub' && fileUrl === '/temp.ppub' && fileContent) {
				resolve(tmp.file({ postfix: '.' + extension }));
			}
			resolve(null);
			// Create a file from file.docJSON, 
			// Upload it, 
			// Change fileUrl (make it a let);
			// then proceed as normal
		});
	})
	.then(function(object) {
		if (object) {
			return fsWriteFile(object.path, JSON.stringify(fileContent, null, 2), 'utf-8')
			.then(function() {
				return uploadLocalFile(object.path)
			})
			.then(function(newFileURL) {
				fileUrl = newFileURL;
			})
			.catch(function(err) {
				console.log('Error uploading docJSON', file, err);
			});
		}
		return null
	})
	.then(function() {
		return tmp.file({ postfix: '.' + extension })
	})
	.then(function(object) {
		const pathname = object.path;

		return new Promise(function(resolve, reject) {
			const writeFile = fs.createWriteStream(pathname);
			https.get(fileUrl.replace('http://', 'https://'), function(response) {
				response.pipe(writeFile);
				writeFile.on('finish', function() {
					writeFile.close(function() {

						Promise.all([
							uploadToPubPub(pathname, fileUrl),
							generateHash(pathname),
							getContent(pathname, fileType),
						])
						.then(function(results) {
							resolve(results);
						});
						
					});

				})
				.on('error', function(err) {
					reject(err);

				});
			}).on('error', (e) => {
			  reject(e)
			});
		});
	})
	.then(function(data) {
		delete statusObject[file.id];
		if (Object.keys(statusObject).length < 25) {
			console.log(Object.keys(statusObject).map((key)=> {
				return statusObject[key].oldUrl;
			}));	
		}
		
		return {
			url: data[0] || fileUrl,
			hash: data[1] || null,
			content: data[2] || null,
		};	
	})
	.catch(function(err) {
		delete statusObject[file.id];
		if (Object.keys(statusObject).length < 25) {
			console.log(Object.keys(statusObject).map((key)=> {
				return statusObject[key].oldUrl;
			}));	
		}
		console.log('Eror in process file', file,  err);
	});
}
