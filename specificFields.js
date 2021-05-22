const {
  lineContainsObjReference,
  joinMaps,
  containsStandardField,
  getNameFromPluralName,
  getDescribe,
  getParentObjectName,
  getSpecificFieldsInWhereClause,
  getSpecificFieldsInOrderByClause,
	checkSpecific_sObjectField,
	checkSpecificBadPractices,
	containsQuery
} = require("./helperMethods.js");
const { parseQuery } = require('soql-parser-js');


let soqlMap = new Map();
let url
let SFobjects
let token
async function specificFields(entryPoint, options, splitedClass, fieldsToAnalyse){
		url = entryPoint.url
		SFobjects = options.standardSFObjects
		token = entryPoint.token
		let returnMap =  await getSpecificStandardFields(splitedClass, fieldsToAnalyse, options.fields)
		return returnMap
}


const getSpecificStandardFields = (splitedClass, fieldsToAnalyse, fields) => {
	return new Promise(async (resolve, reject) => {
		let standardFieldsMap = new Map();
		let referencesArray;
		let tempMap = new Map()
		for (let object of fieldsToAnalyse.keys()){
			// referencesArray contains the array of instances that an object have
			// e.g. {'Account': [accFieldA , accFieldB]} 
			referencesArray = fieldsToAnalyse.get(object)
			for (let i=0;i<referencesArray.length;i++){
				for(let lineCount = 0; lineCount<splitedClass.length; lineCount++){
					tempMap = await checkStandardField(splitedClass[lineCount], referencesArray[i], object, fields)
					standardFieldsMap = joinMaps(standardFieldsMap, tempMap)
				}
			}
		}
		//sObject Field
		for(let lineCount = 0; lineCount<splitedClass.length; lineCount++){
			tempMap  = checkSpecificBadPractices(splitedClass[lineCount],fields)
			standardFieldsMap = joinMaps(standardFieldsMap, tempMap)
			tempMap  = checkSpecific_sObjectField(splitedClass[lineCount], fields)
			if(tempMap){
				standardFieldsMap = joinMaps(standardFieldsMap, tempMap)
			}
			//inner SOQL might exist that it is not captured in the first loop, where we just search for variables of the type of the object we want to search
			if(containsQuery(splitedClass[lineCount])){
				for(let standardCount = 0 ; standardCount<SFobjects.length; standardCount++){
					tempMap = await checkStandardFieldSOQL(splitedClass[lineCount], SFobjects[standardCount], fields)
					standardFieldsMap = joinMaps(standardFieldsMap, tempMap)
				}
				
			}
		}

		resolve(standardFieldsMap);
	})
	
}		


// check in SOQL and basic use
// myLead.name
const checkStandardField = (line, field, object, fields) => {
	return new Promise(async (resolve, reject) => {
		let standardFieldsMap = new Map()
		if(lineContainsObjReference(line, field)){
			let standardArray = containsStandardField(line, field)
			let tempArray = []
			if(standardArray.length>0){
				for(let i=0; i<standardArray.length; i++){
					if(fields.includes(standardArray[i])){
						//concating the 2 arrays
						tempArray.push(standardArray[i])
						//removing duplicates
						tempArray = [...new Set(tempArray)];
						standardFieldsMap.set(object.toLowerCase(), tempArray)
					}
				}
				
			}
			//SOQL check
			let tempMap = await checkStandardFieldSOQL(line, object, fields)
			standardFieldsMap = joinMaps(standardFieldsMap, tempMap) 
			resolve(standardFieldsMap)
		}
		resolve(null)
	})
	
}
const checkStandardFieldSOQL = (line, object, fields) => {
	return new Promise(async (resolve) => {
	//check for SOQL
	if(line.includes('[') && line.includes('select') && line.includes(']')){
		let soqlQuery	= line.split('[')[1].split(']')[0]
		const query = parseQuery(soqlQuery,{allowApexBindVariables:true});
		let soqlMap = await getSpecificStandardFieldsInSOQL(query, false, object, fields)
		resolve(soqlMap)
	}
	resolve(null)
	})
	
}


const getSpecificStandardFieldsInSOQL =  (parsedQuery, isInnerQuery, mainObject, fields) => {
	return new Promise(async (resolve, reject) => {
		//if(SFobjects.includes(mainObject.toLowerCase())){
			let object
			for(let i=0; i<parsedQuery.fields.length; i++){
				if(parsedQuery.fields[i].type === 'Field' && !parsedQuery.fields[i].field.endsWith('__c')){
					if(fields.includes(parsedQuery.fields[i].field)){
						object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
						if(soqlMap.get(mainObject.toLowerCase())){
							soqlMap.get(mainObject.toLowerCase()).push(parsedQuery.fields[i].field)
						}
						else {
							let tempArray = [parsedQuery.fields[i].field]
							soqlMap.set(mainObject.toLowerCase(), tempArray)
						}	
					}
				}
				else if(parsedQuery.fields[i].type === 'FieldSubquery'){
					let tempMap 
					object = parsedQuery.fields[i].subquery.relationshipName
					object = await getNameFromPluralName(object, url, token)
					tempMap = await getSpecificStandardFieldsInSOQL(parsedQuery.fields[i].subquery, true, object, fields)
					soqlMap = joinMaps(soqlMap, tempMap) 
				}
				// FieldRelationship, we need to check the parents to map to the correct object
				else if(parsedQuery.fields[i].type === 'FieldRelationship' && !parsedQuery.fields[i].field.endsWith('__c') && fields.includes(parsedQuery.fields[i].field.toLowerCase())){
					object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
					//missing FieldRelationship in inner queries as name is different
					if(isInnerQuery){
						object = await getNameFromPluralName(object, url, token)
					}
					let allObjFields = await getDescribe(object,url, token)
					//we can go up more than 1 time, so we need to iterate all parents fields
					if(parsedQuery.fields[i].relationships){
						tempMap = await getParentObjectName(parsedQuery.fields[i], allObjFields)
						soqlMap = joinMaps(soqlMap, tempMap)
					}	 
				}
			}
			// check where clause
			if(parsedQuery.where){
				let tempMap = await getSpecificFieldsInWhereClause(parsedQuery, mainObject.toLowerCase(),fields);
				soqlMap = joinMaps(soqlMap, tempMap)
			}
			if(parsedQuery.orderBy){
				let tempMap = await getSpecificFieldsInOrderByClause(parsedQuery, mainObject.toLowerCase(), fields);
				soqlMap = joinMaps(soqlMap, tempMap)
				
			}
		//}
		
		resolve(soqlMap);
	})
}

module.exports =  specificFields;
