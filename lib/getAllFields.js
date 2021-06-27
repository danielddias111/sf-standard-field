const sfRequest				= require('./salesforceCallouts.js')
const helper					= require('./helper.js')
const { parseQuery } 	= require('soql-parser-js');

let allSFObjects
let url
let token

const getAllFields =  (entryPoint, Body, SymbolTable) => {
	return new Promise(async (resolve, reject) => {
		url = entryPoint.url
		token = entryPoint.token
		let fieldsMap 						= new Map();
		allSFObjects 							= await sfRequest.getAllStandardObjects(entryPoint)
		let tempMap 								= new Map()
		// we will split the class by <{> , <}> and <;> 
		let splitedClass 					= splitClass(Body)
		let fieldsToAnalyse 			= helper.getFieldsToAnalyse(SymbolTable, allSFObjects);
		for (let object of fieldsToAnalyse.keys()){
			// referencesArray contains the array of instances that an object have
			// e.g. {'Account': [accFieldA , accFieldB]}
			// referencesArray = [accFieldA , accFieldB]
			referencesArray 				= fieldsToAnalyse.get(object)
			await Promise.all(referencesArray.map(async ref => {
				await Promise.all(splitedClass.map(async line => {
					tempMap 						= await checkStandardField(line, ref, object)
					if(tempMap && tempMap.size!=0){
						fieldsMap 	= helper.joinMaps(fieldsMap, tempMap)
					}
				}))
			}))
		}
		//Analyse SOQL
		await Promise.all(splitedClass.map(async line => {
			//SOQL check
			tempMap 							= await checkStandardFieldSOQL(line)
			fieldsMap 						= helper.joinMaps(fieldsMap, tempMap)
		}))
		//Analyse sObject.Field
		splitedClass.forEach(line => {
			tempMap  							= helper.checkBadPractices(line)
			if(tempMap){
				fieldsMap = helper.joinMaps(fieldsMap, tempMap)
			}
			tempMap  							= helper.check_sObjectField(line)
			if(tempMap){
				fieldsMap = helper.joinMaps(fieldsMap, tempMap)
			}
		})
		return resolve(fieldsMap)
	})
}
const checkStandardFieldSOQL = (line) => {
	return new Promise(async (resolve) => {
	//check for SOQL
	if(line.includes('[') && line.includes('select') && line.includes(']')){
		try {
			let soqlQuery	= line.split('[')[1].split(']')[0]
			const query = parseQuery(soqlQuery,{allowApexBindVariables:true});
			let soqlMap = await getStandardFieldsInSOQL(query, false)
			return resolve(soqlMap)
		}
		catch(err){
			return resolve(null)
		}
		
	}
	return resolve(null)
	})
}
const getStandardFieldsInSOQL =  (parsedQuery, isInnerQuery) => {
	return new Promise(async (resolve) => {
		let object
		let soqlMap = new Map()
		await Promise.all(parsedQuery.fields.map(async field => {
			if(field.type === 'Field' && !field.field.endsWith(')')){
				object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
				if(soqlMap.get(parsedQuery.sObject.toLowerCase())){
					soqlMap.get(parsedQuery.sObject.toLowerCase()).push(field.field)
				}
				else {
					let tempArray = [field.field]
					soqlMap.set(parsedQuery.sObject.toLowerCase(), tempArray)
				}
			}
			else if(field.type === 'FieldSubquery'){
				let tempMap
				object = field.subquery.relationshipName
				object = await helper.getNameFromPluralName(object, url, token)
				tempMap = await getStandardFieldsInSOQL(field.subquery, true, object)
				soqlMap = helper.joinMaps(soqlMap, tempMap)
			}
			// FieldRelationship, we need to check the parents to map to the correct object
			else if(field.type === 'FieldRelationship' && !field.field.endsWith(')')){
				object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
				//missing FieldRelationship in inner queries as name is different
				if(isInnerQuery){
					object = await helper.getNameFromPluralName(object, url, token)
				}
				let allObjFields = await sfRequest.getDescribe(object, url, token)
				//we can go up more than 1 time, so we need to iterate all parents fields
				if(field.relationships){
					tempMap = await helper.getParentObjectName(field, allObjFields)
					soqlMap = helper.joinMaps(soqlMap, tempMap)
				}
			}
		}))
		// check where clause
		if(parsedQuery.where){
			let tempMap = await helper.getFieldsInWhereClause(parsedQuery, parsedQuery.sObject.toLowerCase(), url,token);
			soqlMap = helper.joinMaps(soqlMap, tempMap)
		}
		if(parsedQuery.orderBy){
			let tempMap = await helper.getFieldsInOrderByClause(parsedQuery, parsedQuery.sObject.toLowerCase());
			soqlMap = helper.joinMaps(soqlMap, tempMap)

		}
		resolve(soqlMap);
	})
}

const splitClass = (body) => {
	let returnArray = []
	body = body.split('{').join(';').split('}').join(';').split('public').join(';').split('private').join(';').split('protected').join(';').split('global').join(';').split('static').join(';').split('class').join(';').split('void').join(';').split('void').join(';').split(';')
	body.forEach(statement => {
		if(statement.replace(/\s/g, '') != ''){
			returnArray.push(statement.trim())
		}
	})
	return returnArray
}
// check in SOQL and basic use
// myLead.name
const checkStandardField = (line, _variable, object) => {
	return new Promise(async (resolve, reject) => {
		let fieldsMap 			= new Map()
		if(helper.lineContainsObjReference(line, _variable)){
			let standardArray 				= helper.containsStandardVariable(line, _variable)
			if(standardArray.length>0){
				if(fieldsMap.get(object)){
					//concating the 2 arrays
					tempArray 					= fieldsMap.get(object).concat(standardArray)
					//removing duplicates
					tempArray 					= [...new Set(tempArray)];
					fieldsMap.set(object.toLowerCase(), tempArray)
				}
				else {
					fieldsMap.set(object.toLowerCase(), standardArray)
				}
			}
			return resolve(fieldsMap)
		}
		return resolve(null)
	})
}


module.exports = { getAllFields }