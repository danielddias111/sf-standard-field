const fetch 					= require('node-fetch');
const apiVersion 			= '51.0'

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
	console.log('API CALL ')
	let response = await fetch(endpoint,options);
	let json = await response.json();
	if(json.Body && json.SymbolTable){
		const {Body,SymbolTable} = json;
		return {Body,SymbolTable};
	}
	else if(json.error){
		return json.error
	}
	else {
		return json
	}
	
}


const getAllStandardObjects = async (entryPoint) => {
	const {token,url} = entryPoint;
	let endpoint = `${url}/services/data/v${apiVersion}/sobjects/`;

	let options = {
			headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				}
	}    
	let standardObjects = []
	console.log('API CALL ')
	let response 					= await fetch(endpoint,options);
	let json 							= await response.json();
	const { sobjects } 		= json
	sobjects.forEach(obj => {
		standardObjects.push(obj.name.toLowerCase())
	})
	return standardObjects
}

const getDescribe = (obj, url, token) => {
	return new Promise((resolve, reject) => {
		let fullurl = `${url}/services/data/v${apiVersion}/sobjects/${obj}/describe`
	console.log('API CALL ')
		fetch(fullurl, {
			headers: {
				"Content-Type":"application/json",
				"Authorization": `Bearer ${token}`
			}
		})
		.then(response => {
			response.json().then(data => {
				//console.log(data.fields)
				resolve(data.fields)
			})
			
		})
		.catch(err => {
			console.log('########',err)
		})
	})
}

module.exports = {
	getClassDetails,
	getAllStandardObjects,
	getDescribe
}