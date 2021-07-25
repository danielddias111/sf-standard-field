const { getStandardFields }= require('../src/index.js');

const options = {
	fields: ['Billing_Information__c.id']
}

const entryPoint = {
	classId : '',
	token:'00D1j0000004adH!ADWbfAqvh4UZUyNCqkCOgmmv8pKeLHBi5pbN3Quosig75W8Rw5DY1a5B3Eg2kkHhOV4Q5aUCMKAWY9afj5e1y2yO456w',
	url:'https://claranet--billingv3.my.salesforce.com'
}

let classes = ['01p1j000006wwUd','01p6900000FIQLF']

async function runExample(){
		for(let i=0; i< classes.length; i++){
			console.log('Checking standard fields... ' + classes[i])
			entryPoint.classId = classes[i]
			let response = await getStandardFields(entryPoint, options);
			console.log(response);
		}
}
	
runExample();