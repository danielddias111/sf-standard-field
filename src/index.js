const getStandardFields = require('../lib/getStandardFields');

const options = {
	fields: ['testqqq__c.id', 'account.industry', 'account.name', 'LEAD.FIRSTNAME', 'LEAD.industry']
}

const entryPoint = {
	classId : '01p0900000HIpun',
	token:'00D09000002VRMG!ARsAQC0yazsn3fwmJBfXdSqCkvEib_N5M9Vzc91bQPHYjVqzH_5_WB..bfLZMjujpLtEKl0KhAZ5IFOaZc0LG9xlTEpHZy.d',
	url:'https://easy-deploy-dev-ed.my.salesforce.com'
}

const getClassStandardField = (entryPoint, options) => {
	return new Promise(async(resolve, reject) => {
		let returnMap
		if(options){
			returnMap = await getStandardFields(entryPoint, options);
		}
		else {
			returnMap = await getStandardFields(entryPoint);
		}
		resolve(returnMap)
	}) 
	
}

getClassStandardField(entryPoint, options)
.then(result => {
	console.log(result)
})

module.exports = {
	getClassStandardField
}