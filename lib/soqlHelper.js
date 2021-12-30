const { parseQuery } 	= require('soql-parser-js');
const helper 					= require('./helper.js')
const sfRequest				= require('./salesforceCallouts.js')

const checkStandardFieldSOQL = async (line) => {
	//check for SOQL
	if(line.includes('[') && line.includes('select') && line.includes(']')){
		let soqlQuery	= line.split('[')[1].split(']')[0]
		try{
			const query = parseQuery(soqlQuery,{allowApexBindVariables:true});			
			let soqlMap = await getSpecificStandardFieldsInSOQL(query, null)
			return soqlMap
		}
		catch(err){
			console.log(err)
			return null
		}
	}
	else {
		return null
	}	
}


const getSpecificFieldsInOrderByClause = async (parsedQuery, object) => {
	let soqlMap = new Map()
	let tempMap = new Map()
	let tempSet = []
	await Promise.all(parsedQuery.orderBy.map(async field => {
		if(!field.field.endsWith('__c')){
			if(field.field.includes('.')){
				tempMap 									= await findChildObjectName(field)
				soqlMap 									= helper.joinMaps(soqlMap, tempMap)
			}
			else {
				tempSet.push(field.field)
				tempMap.set(object, tempSet)
				soqlMap = helper.joinMaps(soqlMap, tempMap)
			}
		}
	}))
	
	return soqlMap
} 

const getSpecificStandardFieldsInSOQL = async (parsedQuery, isInnerQuery, mainObject) => {
			let object
			for(let q=0; q<parsedQuery.fields.length; q++){
				let field= parsedQuery.fields[q];
				if(field.type === 'Field' && !field.field.endsWith('__c')){
					object = mainObject ? mainObject : parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName						
						if(soqlMap.get(object.toLowerCase())){
							soqlMap.get(object.toLowerCase()).push(field.field)
						}
						else {
							let tempArray = [field.field]
							soqlMap.set(object.toLowerCase(), tempArray)
						}	
					
				}
				else if(field.type === 'FieldSubquery'){
					let tempMap 
					let childObject 	= field.subquery.relationshipName
					object 						= await helper.getNameFromPluralName(parsedQuery.sObject, childObject)
					tempMap 					= await getSpecificStandardFieldsInSOQL(field.subquery, parsedQuery.sObject, object)
					soqlMap 					= helper.joinMaps(soqlMap, tempMap) 
				}
				// FieldRelationship, we need to check the parents to map to the correct object
				else if(field.type === 'FieldRelationship' && !field.field.endsWith('__c')){
					let object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
					//missing FieldRelationship in inner queries as name is different
					if(isInnerQuery){
						object 				= await helper.getNameFromPluralName(isInnerQuery, object)
					}
					//we can go up more than 1 time, so we need to iterate all parents fields
					if(field.relationships){
						let {fields} = await sfRequest.getDescribe(object)
						let allObjFields 	= fields
						tempMap 					= await helper.getParentObjectName(field, allObjFields)
						soqlMap 					= helper.joinMaps(soqlMap, tempMap)
					}	 
				}
			}
			// check where clause
			if(parsedQuery.where && parsedQuery.sObject){
				let tempMap 		= await getSpecificFieldsInWhereClause(parsedQuery, parsedQuery.sObject.toLowerCase());
				soqlMap 				= helper.joinMaps(soqlMap, tempMap)
			}
			if(parsedQuery.orderBy && parsedQuery.sObject){
				let tempMap 		= await getSpecificFieldsInOrderByClause(parsedQuery, parsedQuery.sObject.toLowerCase());
				soqlMap 				= helper.joinMaps(soqlMap, tempMap)
				
			}
		
		return soqlMap;
}



const checkRecursiveRightElement = async (parsedQueryRightElement, object) => {
	let soqlMap = new Map()
	let tempMap = new Map()
	let tempSep = []
	let field = {field:''}
	if(parsedQueryRightElement.left.field.includes('.')){
		field.field = parsedQueryRightElement.left.field
		tempMap 									= await findChildObjectName(field)
		soqlMap = helper.joinMaps(soqlMap, tempMap)
	}
	else {
		tempSep.push(parsedQueryRightElement.left.field)
		soqlMap.set(object, tempSep)
	}
	
	if(parsedQueryRightElement.right){
		tempMap = checkRecursiveRightElement(parsedQueryRightElement.right, object)
		soqlMap = helper.joinMaps(soqlMap, tempMap)
	}
	return soqlMap
}

const getSpecificFieldsInWhereClause = async (parsedQuery, object) => {
	let soqlMap = new Map()
	let tempMap = new Map()
	let tempSet = []
	let field = {field:''}
	if(!parsedQuery.where.left.field.endsWith('__c')){
		if(parsedQuery.where.left.field.includes('.')){
			field.field 							= parsedQuery.where.left.field
			tempMap 									= await findChildObjectName(field)
			soqlMap 									= helper.joinMaps(soqlMap, tempMap)
		}
		else {
			tempSet.push(parsedQuery.where.left.field)
			soqlMap.set(object, tempSet)
		}
		if(parsedQuery.where.right){
			tempMap = await checkRecursiveRightElement(parsedQuery.where.right, object)
			soqlMap = helper.joinMaps(soqlMap, tempMap)
		}
	}
	return soqlMap
} 

const findChildObjectName = async (field) => {
	let tempMap = new Map()
	let allLookupsBetween			= field.field.split('.')
	let fieldName							= allLookupsBetween.pop()
	let nextObjToDescribe = allLookupsBetween[0]
	for(let i = 0; i< allLookupsBetween.length - 1; i++){
		let { fields } 							= await sfRequest.getDescribe(nextObjToDescribe)
		for(let x = 0 ; x < fields.length ; x ++ ){
			if(fields[x].relationshipName){
				if(allLookupsBetween[i+1] == fields[x].relationshipName.toLowerCase()){
					nextObjToDescribe = fields[x].referenceTo[0]
					break
				}
			}
			
		}
		
	}
	if(allLookupsBetween.length == 1){
		let { fields } 							= await sfRequest.getDescribe(nextObjToDescribe)
		for(let x = 0 ; x < fields.length ; x ++ ){
			if(fields[x].relationshipName){
				if(nextObjToDescribe == fields[x].relationshipName.toLowerCase()){
					nextObjToDescribe = fields[x].referenceTo[0]
					break
				}
			}
		}
	}
	let tempList = []
	tempList.push( fieldName.toLowerCase())
	tempMap.set(nextObjToDescribe.toLowerCase(),tempList)
	return tempMap
}

module.exports = {
	checkStandardFieldSOQL,
	getSpecificStandardFieldsInSOQL
}