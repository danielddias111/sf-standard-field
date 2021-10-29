const helper = require('./helper.js')
const { parseQuery } = require('soql-parser-js');
const sfRequest				= require('./salesforceCallouts.js')
let soqlMap = new Map();
let url
//let SFobjects
let token

async function getSpecificFields(entryPoint, Body,  SymbolTable, sfObjectsToAnalyse, sfFieldsToAnalyse){
	url 							= entryPoint.url
	token 						= entryPoint.token
	let splitedClass	= helper.splitClass(Body)
	let fieldsToAnalyse 	= helper.getFieldsToAnalyse(SymbolTable, sfObjectsToAnalyse);
	let returnMap 		=  await getSpecificStandardFields(splitedClass, fieldsToAnalyse, sfFieldsToAnalyse, sfObjectsToAnalyse, SymbolTable)
	return returnMap
}

const getSpecificStandardFields = (splitedClass, fieldsToAnalyse, fields, SFobjects, SymbolTable) => {
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
						if(!helper.containsQuery(splitedClass[lineCount]) && includesField(splitedClass[lineCount], fields)){
							tempMap = await checkStandardField(splitedClass[lineCount], referencesArray[i], object, fields)
							standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
						}
					}
				}
		}
		//sObject Field
		await Promise.all(splitedClass.map(async line => {
			tempMap  = helper.checkSpecificBadPractices(line,fields)
			standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
			tempMap  = helper.checkSpecific_sObjectField(line, fields)
			if(tempMap){
				standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
			}
			//inner SOQL might exist that it is not captured in the first loop, where we just search for variables of the type of the object we want to search
			if(helper.containsQuery(line)){
				await Promise.all(SFobjects.map(async obj => {
					tempMap = await checkStandardFieldSOQL(line, obj, fields)
					standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
				}))
			}
			//check parents
			if(includesField(line,fields)){
				tempMap = await checkParentFields(line, fields, SymbolTable)
				standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
			}
		}))

		resolve(standardFieldsMap);
	})
	
}	

const checkParentFields =  (line, fields, SymbolTable) => {
	return new Promise(async (resolve, reject) => {
		let standardFieldsMap = new Map();
		let splitedLine = line.split(' ')
		for(let i=0; i< splitedLine.length; i++){
			let space = splitedLine[i]
			if(!includesField(space,fields)){
				continue
			}
			for(let x=0; x<fields.length; x++){
				let fieldToAnalyse=fields[x]
				if(space.includes(fieldToAnalyse) && space.split('.').length!=2){
					let varsAndProps = SymbolTable.variables
					varsAndProps.concat(SymbolTable.properties)
					for(let c=0; c<varsAndProps.length; c++){
						let variable = varsAndProps[c]
						if(variable.name == space[0]+'.'){
							//means it's a field relationship, we need to iterate all fields until the one we want
							//iterate all relationships
							let parentObj = variable.type
							let previousObj = variable.type
							let objs = space.split('.')
							for(let x=0; x<objs.length-1; x++){
								let allObjFields 	= await sfRequest.getDescribe(parentObj,url, token)	
								//iterate all fields in object to get the parent object
								for(let allObjFieldsCounter = 0; allObjFieldsCounter<allObjFields.length; allObjFieldsCounter++){
									if(allObjFields[allObjFieldsCounter].relationshipName!= null && allObjFields[allObjFieldsCounter].relationshipName.toLowerCase() == objs[x+1]){
										previousObj = parentObj
										parentObj = allObjFields[allObjFieldsCounter].referenceTo[0]
										break
									}
								}
								if(x == objs.length-3){
									let tempArray = []
									//concating the 2 arrays
									tempArray.push(objs[objs.length-1])
									//removing duplicates
									tempArray = [...new Set(tempArray)];
									standardFieldsMap.set(parentObj.toLowerCase(), tempArray)
									return resolve(standardFieldsMap)
								}
							}
						}
					}
				}
			}
		}
		return resolve(null)
	})
	
}

const includesField = (line, fieldsToAnalyse) => {
	let temp = false
	fieldsToAnalyse.forEach(field => {
		if(line.includes(field)){
			temp = true
		}
	})
	return temp
} 

// check in SOQL and basic use
// myLead.name
const checkStandardField = async (line, field, object, fields) => {
	return new Promise(async (resolve, reject) => {
		let standardFieldsMap = new Map()
		if(helper.lineContainsObjReference(line, field)){
			let standardArray = helper.containsStandardVariable(line, field)
			let tempArray = []
			if(standardArray.length>0){
				for(let i=0; i<standardArray.length; i++){
					if(fields.includes(standardArray[i]) && standardArray[i].split('.').length == 1){
							//concating the 2 arrays
							tempArray.push(standardArray[i])
							//removing duplicates
							tempArray = [...new Set(tempArray)];
							standardFieldsMap.set(object.toLowerCase(), tempArray)
						}
				}
			}
			//SOQL check
			//let tempMap = await checkStandardFieldSOQL(line, object, fields)
			//standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap) 
			return resolve(standardFieldsMap)
		}
		return resolve(null)
	})
	
}

const checkStandardFieldSOQL = (line, object, fields) => {
	return new Promise(async (resolve) => {
	//check for SOQL
	if(line.includes('[') && line.includes('select') && line.includes(']')){
		let soqlQuery	= line.split('[')[1].split(']')[0]
		try{
			const query = parseQuery(soqlQuery,{allowApexBindVariables:true});
			let soqlMap = await getSpecificStandardFieldsInSOQL(query, false, object, fields)
			resolve(soqlMap)
		}
		catch(err){
			resolve(null)
		}
	}
	else {
		resolve(null)
	}
	
	})
	
}

const getSpecificStandardFieldsInSOQL =  (parsedQuery, isInnerQuery, mainObject, fields) => {
	return new Promise(async (resolve, reject) => {
		//if(SFobjects.includes(mainObject.toLowerCase())){
			let object
			
			await Promise.all(parsedQuery.fields.map(async field => {
				
				if(field.type === 'Field' && !field.field.endsWith('__c')){
					object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
					if(fields.includes(field.field) && object.toLowerCase()=== mainObject.toLowerCase()){
						
						if(soqlMap.get(mainObject.toLowerCase())){
							soqlMap.get(mainObject.toLowerCase()).push(field.field)
						}
						else {
							let tempArray = [field.field]
							soqlMap.set(mainObject.toLowerCase(), tempArray)
						}	
					}
				}
				else if(field.type === 'FieldSubquery'){
					let tempMap 
					object = field.subquery.relationshipName
					object = await helper.getNameFromPluralName(parsedQuery.sObject, object, url, token)
					tempMap = await getSpecificStandardFieldsInSOQL(field.subquery, true, object, fields)
					soqlMap = helper.joinMaps(soqlMap, tempMap) 
				}
				// FieldRelationship, we need to check the parents to map to the correct object
				else if(field.type === 'FieldRelationship' && !field.field.endsWith('__c') && fields.includes(field.field.toLowerCase())){
					object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
					//missing FieldRelationship in inner queries as name is different
					if(isInnerQuery){
						object = await helper.getNameFromPluralName(parsedQuery.sObject, objec, url, token)
					}
					let allObjFields = await sfRequest.getDescribe(object,url, token)
					//we can go up more than 1 time, so we need to iterate all parents fields
					if(field.relationships){
						tempMap = await helper.getParentObjectName(field, allObjFields)
						soqlMap = helper.joinMaps(soqlMap, tempMap)
					}	 
				}
			}))
			// check where clause
			if(parsedQuery.where && parsedQuery.sObject){
				let tempMap = await helper.getSpecificFieldsInWhereClause(parsedQuery, parsedQuery.sObject.toLowerCase(),fields);
				soqlMap = helper.joinMaps(soqlMap, tempMap)
			}
			if(parsedQuery.orderBy && parsedQuery.sObject){
				let tempMap = await helper.getSpecificFieldsInOrderByClause(parsedQuery, parsedQuery.sObject.toLowerCase(), fields);
				soqlMap = helper.joinMaps(soqlMap, tempMap)
				
			}
		//}
		
		resolve(soqlMap);
	})
}


module.exports =  { getSpecificFields }