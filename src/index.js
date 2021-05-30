const getStandardFields = require('../lib/getStandardFields');

const options = {
	fields: ['account.name']
}

const entryPoint = {
	classId : '01p0900000HIpun',
	token:'00D09000002VRMG!ARsAQIA8SY9gDMSQxA1CIMjcfU2ouqwgm5bhFBMaS5qOumwTrrl3qumTOXKjjL0mPzlg4sMy9SSTHvLPShBm3KVc3OfDasG7',
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