import Promise from 'bluebird';
import { Role } from './models';

export default function(rolesTitleToId) {

	const roles = [
		{title: 'Conceptualization'},
		{title: 'Methodology'},
		{title: 'Software'},
		{title: 'Validation'},
		{title: 'Formal Analysis'},
		{title: 'Investigation'},
		{title: 'Resources'},
		{title: 'Data Curation'},
		{title: 'Writing – Original Draft Preparation'},
		{title: 'Writing – Review & Editing'},
		{title: 'Visualization'},
		{title: 'Supervision'},
		{title: 'Project Administration'},
		{title: 'Funding Acquisition'},
	];

	Role.bulkCreate(roles, { returning: true })
	.then(function(newRoles) {
		newRoles.map((role)=> {
			rolesTitleToId[role.title] = role.id;
		});
		return undefined;
	})
	.then(function() {
		console.log('Finished initializing postgres');
		console.log('----------');
		return undefined;
	})
	.catch(function(err) {
		console.log('Error initialized postgres', err.message, err.errors);
	});
}
