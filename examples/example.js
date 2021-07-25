const { getStandardFields }= require('../src/index.js');

const options = {
	fields: ['Field_to_Track__c.name', 'Object_to_Track__c.name']
}

const entryPoint = {
	classId : '',
	token:'00D09000002VRMG!ARsAQKhrW2y86Da2VqazV7sw_wYfpUUmupjZSiEvfaJFMu_fXZcSgJWYqfJqTduFf1TT21SBhv6AJ40P6e6eb5FvDqYjJ_oG',
	url:'https://easy-deploy-dev-ed.my.salesforce.com'
}

let classes = ['01p0900000LfnXDAAZ','01p09000000JkNsAAK']

async function runExample(){
		for(let i=0; i< classes.length; i++){
			console.log('Checking standard fields... ' + classes[i])
			entryPoint.classId = classes[i]
			let response = await getStandardFields(entryPoint, options);
			console.log(response);
		}
}
	
runExample();