const fetch 					= require('node-fetch');
const sfRequest				= require('./salesforceCallouts.js')


const getStandardFields = async (entryPoint, options) => {
	return new Promise(async (resolve, reject) => {
		//Check if entry point is valid
		if(isEntryPointValid(entryPoint)){
			return reject('Wrong arguments passed. Please the url, token and class id.')
		}
		//Grab class by id
		let { Body, SymbolTable} 	= await sfRequest.getClassDetails(entryPoint);
		console.log(Body)
		return resolve('ok!')
	})
}

const isEntryPointValid = (entryPoint) => {
	return (entryPoint.url == null || entryPoint.url == '' || entryPoint.token == null || entryPoint.token == '' || entryPoint.classId == null || entryPoint.classId == '')
}

module.exports = {
	getStandardFields
}