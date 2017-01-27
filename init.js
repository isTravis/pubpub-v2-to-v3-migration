require('babel-register')({
	ignore: /(node_modules\/(?!(pubpub-prose|pubpub-render-files)\/).*)|(.*citeproc.*)/
});
require('./migrate');
// require('./test');
