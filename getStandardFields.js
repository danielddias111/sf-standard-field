const fetch = require('node-fetch');
const { parseQuery } = require('soql-parser-js');
const specificFields = require('./specificFields.js');
const {
  getClassDetails,
  getFieldsToAnalyse,
  joinMaps,
  lineContainsObjReference,
  containsStandardField,
  getNameFromPluralName,
  getFieldsInWhereClause,
  getFieldsInOrderByClause,
} = require("./helperMethods.js");
//const strip = require('strip-comments');
//standardSFObjects contains the objects to check
let standardSFObjects
let soqlMap = new Map();
let url;
let token;
let standardFieldsMap

async function getStandardFields(entryPoint, options){

    url = entryPoint.url;
    token = entryPoint.token;
		standardSFObjects = options.standardSFObjects
    let {Body,SymbolTable} = await getClassDetails(entryPoint);
		Body = removeComments(Body)

		let splitedClass = Body.split(';')
		
		let fieldsToAnalyse =getFieldsToAnalyse(SymbolTable, standardSFObjects);
		console.log('Fields to analyse',fieldsToAnalyse)
		//Analyse all fields
		if(options.fields.length === 0){
			standardFieldsMap = await getAllStandardFields(splitedClass, fieldsToAnalyse)
			console.log('standard Fields used:')
			console.log(standardFieldsMap)
		}
		else {
			options.fields = options.fields.map(value => value.toLowerCase())
			options.standardSFObjects = options.standardSFObjects.map(value => value.toLowerCase())
			standardFieldsMap = await specificFields(entryPoint, options, splitedClass, fieldsToAnalyse)
			console.log('standard Fields used:')
			console.log(standardFieldsMap)
		}
    
  
}

module.exports =  getStandardFields;

/**
 * 
 * @param {*} line 
 * @description removes comments
 * @returns class content without comments
 */
const removeComments = (classContent) => {
	let classWithoutComments 	= ''
	let notAddingLineComment	= false
	let multipleLinecomment		= false
	for(let i=0; i<classContent.length-1; i++){
		if(classContent.charAt(i)=='\/' && classContent.charAt(i+1)=='\/'){
			notAddingLineComment 		= true
			continue
		}
		else if(classContent.charAt(i)=='\n' && !multipleLinecomment){
			notAddingLineComment = false
		}
		else if(classContent.charAt(i)=='\/' && classContent.charAt(i+1)=='*'){
			multipleLinecomment = true
			continue
		}
		else if(classContent.charAt(i)=='*' && classContent.charAt(i+1)=='\/'){
			multipleLinecomment = false
			i++
			continue
		}
		if(!notAddingLineComment && !multipleLinecomment){
			classWithoutComments+=classContent.charAt(i)
		}
		
	}
	// Adding bracket because we iterate until length - 1
	if(classContent.endsWith('}')){
		classWithoutComments+='}'
	}
	classWithoutComments = classWithoutComments.replace(/(\r?\n)\s*\1+/g, '$1');
	classWithoutComments	= classWithoutComments.toLowerCase()
	classWithoutComments	= classWithoutComments.replace(/\t/g, ' ').replace(/ +/g, ' ')
	console.log(classWithoutComments)
	return classWithoutComments
}



const getAllStandardFields = (splitedClass, fieldsToAnalyse) => {
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
					tempMap = await checkStandardField(splitedClass[lineCount], referencesArray[i], object)
					standardFieldsMap = joinMaps(standardFieldsMap, tempMap)

					tempMap  = checkBadPractices(splitedClass[lineCount])
					standardFieldsMap = joinMaps(standardFieldsMap, tempMap)
				}
			}
		}
		//sObject Field
		for(let lineCount = 0; lineCount<splitedClass.length; lineCount++){
			tempMap  = check_sObjectField(splitedClass[lineCount])
			if(tempMap){
				standardFieldsMap = joinMaps(standardFieldsMap, tempMap)
			}
		}

		resolve(standardFieldsMap);
	})
	
}		
//Analyse all lines for [select id, industry from lead][0].industry
const checkBadPractices = (line) => {
	let standardFieldsMap = new Map()
	if(containsQuery(line) && !line.replace(/ +/g, '').endsWith('__c') && !line.replace(/ +/g, '').endsWith(']')){
		let obj = line.split('from')[1].split(' ')[1].toLowerCase()
		if(obj.includes(']')){
			obj = obj.split(']')[0]
		}
		let field = line.split('.')[line.split('.').length-1]
		if(standardFieldsMap.get(obj.toLowerCase())){
			standardFieldsMap.get(obj.toLowerCase()).push(field)
		}
		else {
			standardFieldsMap.set(obj.toLowerCase(), [field])
		}
	}
	return standardFieldsMap
}

const check_sObjectField = (line) => {
	let fieldMap = new Map()
	let obj
	let field
	let tempSet = []
	if(line.includes('sobjectfield')){
		if(!line.endsWith('__c') && !line.endsWith('__c ')){
			obj = line.split('=')[1].split('.')[0].replace(/ +/g, '');
			field = line.split('=')[1].split('.')[1].replace(/ +/g, '');
			tempSet.push(field)
			fieldMap.set(obj, tempSet)
			return fieldMap
		}
	}
	return null
}

// check in SOQL and basic use
// myLead.name
const checkStandardField = (line, field, object) => {
	return new Promise(async (resolve, reject) => {
		let standardFieldsMap = new Map()
		if(lineContainsObjReference(line, field)){
			let standardArray = containsStandardField(line, field)
			if(standardArray.length>0){
				if(standardFieldsMap.get(object)){
					//concating the 2 arrays
					tempArray = standardFieldsMap.get(object).concat(standardArray)
					//removing duplicates
					tempArray = [...new Set(tempArray)];
					standardFieldsMap.set(object.toLowerCase(), tempArray)
				}
				else {
					standardFieldsMap.set(object.toLowerCase(), standardArray)
				}
			}
			//SOQL check
			let tempMap = await checkStandardFieldSOQL(line, object)
			standardFieldsMap = joinMaps(standardFieldsMap, tempMap) 
			resolve(standardFieldsMap)
		}
		resolve(null)
	})
	
}


const containsQuery = (line) => {
	return line.includes('[') && line.includes(']') && line.includes('select')
}



const checkStandardFieldSOQL = (line, object) => {
	return new Promise(async (resolve) => {
	//check for SOQL
	if(line.includes('[') && line.includes('select') && line.includes(']')){
		let soqlQuery	= line.split('[')[1].split(']')[0]
		const query = parseQuery(soqlQuery,{allowApexBindVariables:true});
		let soqlMap = await getStandardFieldsInSOQL(query, false, object)
		resolve(soqlMap)
	}
	resolve(null)
	})
	
}



const getStandardFieldsInSOQL =  (parsedQuery, isInnerQuery, mainObject) => {
	return new Promise(async (resolve) => {
		
		let object
		for(let i=0; i<parsedQuery.fields.length; i++){
			if(parsedQuery.fields[i].type === 'Field' && !parsedQuery.fields[i].field.endsWith('__c')){
				let object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
				if(soqlMap.get(mainObject.toLowerCase())){
					soqlMap.get(mainObject.toLowerCase()).push(parsedQuery.fields[i].field)
				}
				else {
					let tempArray = [parsedQuery.fields[i].field]
					soqlMap.set(mainObject.toLowerCase(), tempArray)
				}	
			}
			else if(parsedQuery.fields[i].type === 'FieldSubquery'){
				let tempMap 
				object = parsedQuery.fields[i].subquery.relationshipName
				object = await getNameFromPluralName(object, url, token)
				tempMap = await getStandardFieldsInSOQL(parsedQuery.fields[i].subquery, true, object)
				soqlMap = joinMaps(soqlMap, tempMap) 
			}
			// FieldRelationship, we need to check the parents to map to the correct object
			else if(parsedQuery.fields[i].type === 'FieldRelationship' && !parsedQuery.fields[i].field.endsWith('__c')){
				object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
				//missing FieldRelationship in inner queries as name is different
				if(isInnerQuery){
					object = await getNameFromPluralName(object, url, token)
				}
				let allObjFields = await getDescribe(object)
				//we can go up more than 1 time, so we need to iterate all parents fields
				if(parsedQuery.fields[i].relationships){
					//tempMap = await getParentObjectName(parsedQuery.fields[i], allObjFields)
					//soqlMap = joinMaps(soqlMap, tempMap)
				}	 
			}
		}
		// check where clause
		if(parsedQuery.where){
			let tempMap = await getFieldsInWhereClause(parsedQuery, mainObject.toLowerCase());
			soqlMap = joinMaps(soqlMap, tempMap)
		}
		if(parsedQuery.orderBy){
			let tempMap = await getFieldsInOrderByClause(parsedQuery, mainObject.toLowerCase());
			soqlMap = joinMaps(soqlMap, tempMap)
			
		}
		resolve(soqlMap);
	})
}



				




const checkRecursiveRightElement = (parsedQueryRightElement, object) => {
	console.log(parsedQueryRightElement)
	let soqlMap = new Map()
	let tempMap = new Map()
	let tempSep = []
	if(!parsedQueryRightElement.left.field.endsWith('__c')){
		tempSep.push(parsedQueryRightElement.left.field)
		soqlMap.set(object, tempSep)
	}
	if(parsedQueryRightElement.right){
		tempMap = checkRecursiveRightElement(parsedQueryRightElement.right, object)
		soqlMap = joinMaps(soqlMap, tempMap)
	}
	return soqlMap
}




