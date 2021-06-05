const fetch = require('node-fetch');
const { parseQuery } = require('soql-parser-js');
const specificFields = require('./specificFields.js');
const helper = require("./helperMethods.js");
//const strip = require('strip-comments');
//standardSFObjects contains the objects to check
let standardSFObjects = []
let soqlMap = new Map();
let url;
let token;
let standardFieldsMap

async function getStandardFields(entryPoint, options){
	return new Promise(async (resolve, reject) => {
		url = entryPoint.url;
    token = entryPoint.token;
		if(!options || !options.fields || options.fields.length === 0){
			standardSFObjects = await helper.getAllStandardObjects(entryPoint)
		}
		else {
			let tempStandardSFObjects = await helper.getAllStandardObjects(entryPoint)
			options.fields.forEach(field => {
				let fieldsArray = field.split('.')
				if(fieldsArray.length!=2){
					reject('Wrong arguments passed, please pass an array with ObjectName.FieldName')
					throw 'Wrong arguments passed, please pass an array with ObjectName.FieldName'
				}
				tempStandardSFObjects.map(obj => {
					if(obj.toLowerCase() == fieldsArray[0].toLowerCase()){
						standardSFObjects.push(fieldsArray[0].toLowerCase())
					}
				})
				
			})
		}
    let {Body,SymbolTable} = await helper.getClassDetails(entryPoint);
		if(!Body || !SymbolTable){
			throw 'Something went wrong when getting class body'
		}
		Body = removeComments(Body)

		let splitedClass = Body.split(';')

		let fieldsToAnalyse =helper.getFieldsToAnalyse(SymbolTable, standardSFObjects);
		/*if(!fieldsToAnalyse || fieldsToAnalyse.size === 0){
			resolve('No fields found')
		}*/
		//console.log('Fields to analyse',fieldsToAnalyse)
		//Analyse all fields
		if(!options || !options.fields || options.fields.length === 0){
			standardFieldsMap = await getAllStandardFields(splitedClass, fieldsToAnalyse)
			//console.log('standard Fields used:')
			//console.log(standardFieldsMap)
			resolve(standardFieldsMap)
		}
		else {
			options.initialFields = options.fields.map(value => value.toLowerCase())
			options.fields = options.fields.map(value => value.split('.')[1].toLowerCase())
			options.standardSFObjects = standardSFObjects
			standardFieldsMap = await specificFields(entryPoint, options, splitedClass, fieldsToAnalyse)
			let returnMap = new Map()

			//building map as the standardFieldsMap can return some fields that were not requested
			//eg: 'contact.firstname','lead.ownerid' would return {
  		//'lead' => [ 'firstname', 'ownerid' ],
  		//'contact' => [ 'ownerid', 'firstname' ]
			options.initialFields.forEach(inputOptions => {
				let obj = inputOptions.split('.')[0]

				let field = inputOptions.split('.')[1]
				if(standardFieldsMap.get(obj) && standardFieldsMap.get(obj).includes(field)){
					returnMap.set(inputOptions, true)
				}
				else {
					returnMap.set(inputOptions, false)
				}
			})

			resolve(returnMap)
		}
	})
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
	//iterating every char
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
	//console.log(classWithoutComments)
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
			// Not using for each as we have an await inside
			await Promise.all(referencesArray.map(async ref => {
				await Promise.all(splitedClass.map(async line => {
					tempMap = await checkStandardField(line, ref, object)
					standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
				}))
			}))
		}
		//sObject Field
		splitedClass.forEach(line => {
			tempMap  = helper.checkBadPractices(line)
			standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
			tempMap  = helper.check_sObjectField(line)
			if(tempMap){
				standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
			}
		})

		resolve(standardFieldsMap);
	})

}




// check in SOQL and basic use
// myLead.name
const checkStandardField = (line, field, object) => {
	return new Promise(async (resolve, reject) => {
		let standardFieldsMap = new Map()
		if(helper.lineContainsObjReference(line, field)){
			let standardArray = helper.containsStandardField(line, field)
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
			standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
			resolve(standardFieldsMap)
		}
		resolve(null)
	})

}






const checkStandardFieldSOQL = (line, object) => {
	return new Promise(async (resolve) => {
	//check for SOQL
	if(line.includes('[') && line.includes('select') && line.includes(']')){
		try {
			let soqlQuery	= line.split('[')[1].split(']')[0]
			const query = parseQuery(soqlQuery,{allowApexBindVariables:true});
			let soqlMap = await getStandardFieldsInSOQL(query, false, object)
			resolve(soqlMap)
		}
		catch(err){
			resolve(null)
		}
		
	}
	resolve(null)
	})

}



const getStandardFieldsInSOQL =  (parsedQuery, isInnerQuery, mainObject) => {
	return new Promise(async (resolve) => {

		let object
		await Promise.all(parsedQuery.fields.map(async field => {
			if(field.type === 'Field' && !field.field.endsWith('__c')){
				object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
				if(soqlMap.get(mainObject.toLowerCase())){
					soqlMap.get(mainObject.toLowerCase()).push(field.field)
				}
				else {
					let tempArray = [field.field]
					soqlMap.set(mainObject.toLowerCase(), tempArray)
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
			else if(field.type === 'FieldRelationship' && !field.field.endsWith('__c')){
				object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
				//missing FieldRelationship in inner queries as name is different
				if(isInnerQuery){
					object = await helper.getNameFromPluralName(object, url, token)
				}
				let allObjFields = await helper.getDescribe(object, url, token)
				//we can go up more than 1 time, so we need to iterate all parents fields
				if(field.relationships){
					tempMap = await helper.getParentObjectName(field, allObjFields)
					soqlMap = helper.joinMaps(soqlMap, tempMap)
				}
			}
		}))
		// check where clause
		if(parsedQuery.where){
			let tempMap = await helper.getFieldsInWhereClause(parsedQuery, mainObject.toLowerCase());
			soqlMap = helper.joinMaps(soqlMap, tempMap)
		}
		if(parsedQuery.orderBy){
			let tempMap = await helper.getFieldsInOrderByClause(parsedQuery, mainObject.toLowerCase());
			soqlMap = helper.joinMaps(soqlMap, tempMap)

		}
		resolve(soqlMap);
	})
}




