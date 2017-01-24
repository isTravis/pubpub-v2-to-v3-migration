const iterateObject = function(object, array) {
	const tempArray = array || [];
	if (object.url) { tempArray.push(object.url); }
	
	if (object.content) {
		const newContent = Array.isArray(object.content) ? object.content : [object.content];
		newContent.forEach((content)=> {
			iterateObject(content, tempArray);
		});
	}
	
	return tempArray;
};

const y = {
	content: {
		url: 'blahblah1', 
		content: [
			{
				url: 'blahblah1.1'
			},
			{
				url: 'blahblah1.2'
			},
			{
				url: 'blahblah1.3',
				content: {
					url: 'blahblah 1.3.1',
				},
			},
			{
				url: 'blahblah 1.4',
			},
		]

	}
}
console.log(iterateObject(y));
