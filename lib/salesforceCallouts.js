const fetch 					= require('node-fetch');

const apiVersion 			= 51.0

/**
 * @description api call (using SF tooling API) to get class information
 * @param {*} entryPoint 
 * @returns 
 */
 async function getClassDetails(entryPoint){
	const {classId,token,url} = entryPoint;
	let endpoint = `${url}/services/data/v${apiVersion}/tooling/sobjects/ApexClass/${classId}`;
	let options = {
			headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				}
	}    
	let response = await fetch(endpoint,options);
	let json = await response.json();
	const {Body,SymbolTable} = json;
	return {Body,SymbolTable};
}


module.exports = {
	getClassDetails
}