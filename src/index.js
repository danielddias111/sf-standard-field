const getStandardFields = require('../lib/getStandardFields');

const options = {
	fields: ['test__c.id', 'account.industry', 'account.name', 'LEAD.FIRSTNAME', 'LEAD.industry']
}

const entryPoint = {
	classId : '01p0900000HIpun',
	token:'00D09000002VRMG!ARsAQN7Az1vhs2r6q6PQmudHZAakLpV.pQsjuV4LYuji6h_AEYpQiNdSJEXnxiCU3BAOkOxJQVCEzbWI7URiIAV1EQ5Fonf8',
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