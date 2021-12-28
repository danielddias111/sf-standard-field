const NodeCache = require( "node-cache" );
const myCache = new NodeCache();
const fetch 					= require('node-fetch');
const apiVersion 			= '51.0'

/**
 * @description api call (using SF tooling API) to get class information
 * @param {*} entryPoint 
 * @returns 
 */
/*
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
}*/

/*
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
	//console.log('#################\nMaking API Call =>getAllStandardObjects\n#################')
	let response 					= await fetch(endpoint,options);
	let json 							= await response.json();
	const { sobjects } 		= json
	sobjects.forEach(obj => {
		standardObjects.push(obj.name.toLowerCase())
	})
	return standardObjects
}*/

const getDescribe = async (obj, url, token) => {
	//return new Promise((resolve, reject) => {
		let fullurl = `${url}/services/data/v${apiVersion}/sobjects/${obj}/describe`
		let fieldsObjKey =obj.toLowerCase()+'fields'
		let value = myCache.get(fieldsObjKey)
		if(value == undefined){
			let value2 = myCache.take('counter')
			if(value2 == undefined){
				value2=1
				const success = myCache.set('counter',1);
			}
			else{
				const success = myCache.set('counter',++value2);
			}
			console.log('total api calls: ', value2)

			console.log(`Making API Call => getDescribe object: => ${obj}`)
			let response = await fetch(fullurl, {
				headers: {
					"Content-Type":"application/json",
					"Authorization": `Bearer ${token}`
				}
			})
			
			let data = await response.json()
			const success = myCache.set( fieldsObjKey.toLowerCase(), { childRelationships: data.childRelationships, fields: data.fields } );
			return { childRelationships: data.childRelationships, fields: data.fields }
		
		}
		else {
			//console.log(`Cached, no need to make API call => ${obj}`)
			return value
		}
		
	//})
}

module.exports = {
	getDescribe
}
/*module.exports = {
	getClassDetails,
	getAllStandardObjects,
	getDescribe
}*/