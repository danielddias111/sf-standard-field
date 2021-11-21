const helper = require('./helper.js')
const { parseQuery } = require('soql-parser-js');
const sfRequest				= require('./salesforceCallouts.js')
let soqlMap = new Map();
let url
let token

async function getSpecificFields(entryPoint, Body,  SymbolTable, sfObjectsToAnalyse, sfFieldsToAnalyse){
	url 							= entryPoint.url
	token 						= entryPoint.token
	//get an array separated by _;_
	let splitedClass	= helper.splitClass(Body)
	/* get fields in Class to analyse
	Account acc - acc is a field to analyse as it is type account*/
	let fieldsToAnalyse 	= helper.getFieldsToAnalyse(SymbolTable, sfObjectsToAnalyse);
	let returnMap 				=  await getSpecificStandardFields(splitedClass, fieldsToAnalyse, sfFieldsToAnalyse, sfObjectsToAnalyse, SymbolTable)
	return returnMap
}

const getSpecificStandardFields = async (splitedClass, fieldsToAnalyse, fields, SFobjects, SymbolTable) => {
		let standardFieldsMap = new Map();
		let referencesArray;
		let tempMap = new Map()
		//Check all variables (Account acc; Opportunity Opp)
		for (let object of fieldsToAnalyse.keys()){
				// referencesArray contains the array of instances that an object have
				// e.g. {'Account': [accA]; 'Opportunity: [opp, opp2]} 
				referencesArray = fieldsToAnalyse.get(object)//as above example: if object==Opportunity ? referencesArray=[opp, opp2]
				for (let i=0;i<referencesArray.length;i++){
					for(let lineCount = 0; lineCount<splitedClass.length; lineCount++){
						//includesField - if line contains field. SOQL queries are analysed after so we can skip them.
						if(!helper.containsQuery(splitedClass[lineCount]) && includesField(splitedClass[lineCount], fields)){
							tempMap = await checkStandardField(splitedClass[lineCount], referencesArray[i], object, fields)
							standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
						}
					}
				}
		}
		//sObject Field
			for(let i = 0; i<splitedClass.length; i++){
				let line = splitedClass[i]
				tempMap  						= helper.checkSpecificBadPractices(line,fields)
				standardFieldsMap 	= helper.joinMaps(standardFieldsMap, tempMap)
				tempMap  						= helper.checkSpecific_sObjectField(line, fields)
				if(tempMap){
					standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
				}
				//inner SOQL might exist that it is not captured in the first loop, where we just search for variables of the type of the object we want to search (Account acc, Opporunity opp)
				if(helper.containsQuery(line)){
					//await Promise.all(SFobjects.map(async obj => {
						for(let x=0; x<SFobjects.length; x++){
							let obj = SFobjects[x]
							tempMap 						= await checkStandardFieldSOQL(line, obj, fields)
							standardFieldsMap 	= helper.joinMaps(standardFieldsMap, tempMap)
						}
				}
				//check parents
				if(includesField(line,fields)){
					tempMap = await checkParentFields(line, fields, SymbolTable)
					standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
				}
			}
		return standardFieldsMap;
	//})
	
}	

const checkParentFields =  async (line, fields, SymbolTable) => {
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
							let {fields} = await sfRequest.getDescribe(parentObj,url, token)
							
							let previousObj = variable.type
							let objs = space.split('.')
							for(let x=0; x<objs.length-1; x++){
								let allObjFields 	= fields
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
									return standardFieldsMap
								}
							}
						}
					}
				}
			}
		}
		return null	
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
		let standardFieldsMap = new Map()
		//check if line contains acc or opp (variable)
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
			return standardFieldsMap
		}
		return null	
}

const checkStandardFieldSOQL = async (line, object, fields) => {
	//check for SOQL
	if(line.includes('[') && line.includes('select') && line.includes(']')){
		let soqlQuery	= line.split('[')[1].split(']')[0]
		try{
			const query = parseQuery(soqlQuery,{allowApexBindVariables:true});			
			let soqlMap = await getSpecificStandardFieldsInSOQL(query, null, object, fields)
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

const getSpecificStandardFieldsInSOQL = async (parsedQuery, isInnerQuery, mainObject, fieldsInput) => {
			let object
			for(let q=0; q<parsedQuery.fields.length; q++){
				let field= parsedQuery.fields[q];
				if(field.type === 'Field' && !field.field.endsWith('__c')){
					object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
					if(fieldsInput.includes(field.field) && object.toLowerCase()=== mainObject.toLowerCase()){
						
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
					let childObject = field.subquery.relationshipName
					object = await helper.getNameFromPluralName(parsedQuery.sObject, childObject, url, token)
					tempMap = await getSpecificStandardFieldsInSOQL(field.subquery, parsedQuery.sObject, object, fieldsInput)
					soqlMap = helper.joinMaps(soqlMap, tempMap) 
				}
				// FieldRelationship, we need to check the parents to map to the correct object
				else if(field.type === 'FieldRelationship' && !field.field.endsWith('__c') && fieldsInput.includes(field.field.toLowerCase())){
					let object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
					//missing FieldRelationship in inner queries as name is different
					let fields2
					if(isInnerQuery){
						object = await helper.getNameFromPluralName(isInnerQuery, object, url, token)
					}
					//we can go up more than 1 time, so we need to iterate all parents fields
					if(field.relationships){
						let {fields} = await sfRequest.getDescribe(object,url, token)
						let allObjFields = fields
						tempMap = await helper.getParentObjectName(field, allObjFields)
						soqlMap = helper.joinMaps(soqlMap, tempMap)
					}	 
				}
			}
			// check where clause
			if(parsedQuery.where && parsedQuery.sObject){
				let tempMap = await helper.getSpecificFieldsInWhereClause(parsedQuery, parsedQuery.sObject.toLowerCase(),fieldsInput);
				soqlMap = helper.joinMaps(soqlMap, tempMap)
			}
			if(parsedQuery.orderBy && parsedQuery.sObject){
				let tempMap = await helper.getSpecificFieldsInOrderByClause(parsedQuery, parsedQuery.sObject.toLowerCase(), fieldsInput);
				soqlMap = helper.joinMaps(soqlMap, tempMap)
				
			}
		
		return soqlMap;
}


module.exports =  { getSpecificFields }