const fetch = require('node-fetch');
const { parseQuery } = require('soql-parser-js');
const strip = require('strip-comments');
//standardSFObjects contains the objects to check
let standardSFObjects		= ['Lead','Account','Contact','Contract','Product2']
let soqlMap = new Map();
let url;
let token;

async function getStandardFields(entryPoint){

    url = entryPoint.url;
    token = entryPoint.token;

    let {Body,SymbolTable} = await getClassDetails(entryPoint);

    Body = removeComments(Body)
    //console.log(Body);
    let splitedClass = Body.split(';')

    let fieldsToAnalyse =getFieldsToAnalyse(SymbolTable);
    console.log('Fields to analyse',fieldsToAnalyse)

    let standardFieldsMap = await getAllStandardFields(splitedClass, fieldsToAnalyse)
    
		console.log('standard Fields used:')
		console.log(standardFieldsMap)
  
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

/**
 * 
 * @param {*} classContent 
 * @description this method returns all fields and object instances inside the class that might contains standard SF fields 
 */
const getFieldsToAnalyse = (symbolTable) => {
	
  //Symbol table return properties and variables, we need to analysed both
  let fieldsToAnalysePropsMap	= analyseProps(symbolTable)
  let fieldsToAnalyseVarsMap	= analyseVars(symbolTable)
	let finalMap 								= joinMaps(fieldsToAnalysePropsMap, fieldsToAnalyseVarsMap)
	
	return finalMap
}

// join maps with key and lists as values
const joinMaps = (map1, map2) => {
	if(!map2){
		return map1
	}
	let temp
	let finalMap = new Map()
	for(const [key, value] of map1){
		temp = map2.get(key)
		if(temp){
			let tempSet = value.concat(map2.get(key))
			//Remove duplicates
			tempSet = [... new Set(tempSet)]
			finalMap.set(key, tempSet)
		}
		else{
			finalMap.set(key, value)
		}
	}
	if(map2){
		for(const [key, value] of map2){
			temp = finalMap.get(key)
			if(!temp){
				finalMap.set(key, value)
			}
		}
	}
	return finalMap
}

/**
 *  @description analyse the global variables of Symbol Table
 * @param {*} tempVar 
 */
const analyseProps = (tempVar) => {
	let tempProps
	let fieldsToAnalyse	= new Map();
	// check properties - class variables
	for(let propsCount=0; propsCount < tempVar.properties.length; propsCount++){
		tempProps = tempVar.properties
		// check if type contains object name
		for(let standardFieldsCount = 0; standardFieldsCount < standardSFObjects.length; standardFieldsCount++){
			if(containsObj(tempProps[propsCount].type, 
				standardSFObjects[standardFieldsCount])){
					let tempArray = []
					if(fieldsToAnalyse.get(standardSFObjects[standardFieldsCount])){
						tempArray = fieldsToAnalyse.get(standardSFObjects[standardFieldsCount])
						tempArray.push(tempProps[propsCount].name.toLowerCase())
						fieldsToAnalyse.set(standardSFObjects[standardFieldsCount], tempArray)
					}
					else {
						tempArray.push(tempProps[propsCount].name.toLowerCase())
						fieldsToAnalyse.set(standardSFObjects[standardFieldsCount], tempArray)
					}
			}
		}
	}
	return fieldsToAnalyse
}
/**
 *  @description analyse the methods variables of Symbol Table
 * @param {*} tempVar 
 */
const analyseVars = (tempVar) => {
	let tempVars
	let fieldsToAnalyse	= new Map();
	// check variables - methods variables
	for(let varCount=0; varCount < tempVar.variables.length; varCount++){
		tempVars	= tempVar.variables
		// check if type contains object name 
		for(let standardFieldsCount = 0; standardFieldsCount < standardSFObjects.length; standardFieldsCount++){
			if(containsObj(tempVars[varCount].type, 
					standardSFObjects[standardFieldsCount])){
				let tempArray = []
				if(fieldsToAnalyse.get(standardSFObjects[standardFieldsCount])){
					tempArray = fieldsToAnalyse.get(standardSFObjects[standardFieldsCount])
					tempArray.push(tempVars[varCount].name.toLowerCase())
					fieldsToAnalyse.set(standardSFObjects[standardFieldsCount], tempArray)
				}
				else {
					tempArray.push(tempVars[varCount].name.toLowerCase())
					fieldsToAnalyse.set(standardSFObjects[standardFieldsCount], tempArray)
				}
			}
		}
	}
	return fieldsToAnalyse
}

/**
 * @param {type} type type of object to analyse 
 * @param {obj} obj object type
 * @returns if type is of type obj
 */
const containsObj = (type, obj) => {
	/** 
	 * Valid examples
	 * Lead
	 * Map<Id, Lead>
	 * List<Lead>
	 * Set<Lead>
	 * Map<Lead, sObject>
	 * */ 

	if(type === obj || 
		type.includes('<'+obj+'>')||
		type.includes(obj+'>') ||
		type.includes('<'+obj)){
		return true
	}

	return false;
}

/**
 * 
 * @param {*} line 
 * @param {*} standardField 
 * @param {*} objInstance 
 * @returns 
 */
const lineContainsObjReference = (line, standardField) => {
	if((line.includes(' '+standardField) || line.includes('='+standardField)) && (line.includes(standardField + '.') || line.includes(standardField + ' ') || line.includes(standardField + '[')) ){
		return true
	}
	return false
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

/**
 * @description check if line contains standard field, Account acc= new Account(Industry='') or acc.Industry
 */
const containsStandardField = (line, objReference) => {
	let standardArray = []
	let spaceSplit = line.split(' ');
	//check for a.industry
	for(let i=0; i<spaceSplit.length; i++){
		if((spaceSplit[i].startsWith('='+objReference) || spaceSplit[i].startsWith(objReference+'.') || spaceSplit[i].startsWith(objReference+'[')) && !spaceSplit[i].endsWith('__c') ){
			standardArray.push(spaceSplit[i].split('.')[1])
		}
	}
	//lead a = new lead(industry='auto', cleanstatus='')
	//check for new object instances
	// line only contains one space, so if they have '=    new' becomes '= new'
	if((line.includes(' '+objReference) || line.includes(objReference+'.')) && (line.includes('=new') || line.includes('= new'))){
		let leftOfEquals = ''
		if(line.split('=').length > 2){
			for(let i=1; i<line.split('=').length-1; i++){
				leftOfEquals = line.split('=')[i]
				if(i===1){
					if(!leftOfEquals.split('(')[1].endsWith('__c')){
						standardArray.push(leftOfEquals.split('(')[1])
					}
				}
				else {
					if(!leftOfEquals.split(',')[1].endsWith('__c')){
						// removing spaces so that we can identify duplicates
						standardArray.push(leftOfEquals.split(',')[1].replace(/ +/g, ''))
					}
				}
			}
		}
	}

	return standardArray;
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
				object = await getNameFromPluralName(object)
				tempMap = await getStandardFieldsInSOQL(parsedQuery.fields[i].subquery, true, object)
				soqlMap = joinMaps(soqlMap, tempMap) 
			}
			// FieldRelationship, we need to check the parents to map to the correct object
			else if(parsedQuery.fields[i].type === 'FieldRelationship' && !parsedQuery.fields[i].field.endsWith('__c')){
				object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
				//missing FieldRelationship in inner queries as name is different
				if(isInnerQuery){
					object = await getNameFromPluralName(object)
				}
				let allObjFields = await getDescribe(object)
				//we can go up more than 1 time, so we need to iterate all parents fields
				if(parsedQuery.fields[i].relationships){
					tempMap = await getParentObjectName(parsedQuery.fields[i], allObjFields)
					soqlMap = joinMaps(soqlMap, tempMap)
				}	 
			}
		}
		// check where clause
		if(parsedQuery.where){
			let tempMap = await getFieldsInWhereClause(parsedQuery, mainObject.toLowerCase());
			soqlMap = joinMaps(soqlMap, tempMap)
		}
		resolve(soqlMap);
	})
}

const getParentObjectName = async (field, allObjFieldsInput) => {
	let allObjFields = allObjFieldsInput
	let tempSet = []
	let soqlMap = new Map()
	for(let relationshipsCount = 0; relationshipsCount<field.relationships.length; relationshipsCount++){
		if(allObjFields){
			for(let x=0; x<allObjFields.length; x++){
				//if its does not have  relationshipName means it is not a lookup
				if(allObjFields[x].relationshipName){
					if(field.relationships[relationshipsCount]===allObjFields[x].relationshipName.toLowerCase()){
						if(relationshipsCount+1 === field.relationships.length){
							tempSet.push(field.field)
							soqlMap.set(allObjFields[x].referenceTo[0].toLowerCase(),tempSet)	
						}
						else {
							allObjFields = await getDescribe(allObjFields[x].referenceTo[0])
							break
						}
					}
				}
			}
		}	
	}
	return soqlMap
}

const getNameFromPluralName = async (object) => {
	let singularName
	let allObjs
	allObjs = await getObjNameFromPluralName(object)
		for(let objs=0; objs<allObjs.length; objs++){
			if(object === allObjs[objs].labelPlural.toLowerCase()){
				singularName = allObjs[objs].label;
					break
			}
		}
	return singularName
}
				

const getFieldsInWhereClause = async (parsedQuery, object) => {
	let soqlMap = new Map()
	let tempMap = new Map()
	let tempSet = []
	let allObjFields
	let fieldObj = {
		field: '',
		relationships: []
	}
	if(!parsedQuery.where.left.field.endsWith('__c')){
		if(parsedQuery.where.left.field.includes('.')){

			fieldObj.field = parsedQuery.where.left.field.split('.')[parsedQuery.where.left.field.split('.').length-1]
			fieldObj.relationships = parsedQuery.where.left.field.split('.').splice(0,1)
			allObjFields = await getDescribe(object)
			soqlMap = await getParentObjectName(fieldObj, allObjFields)
		}
		else {
			tempSet.push(parsedQuery.where.left.field)
			soqlMap.set(object, tempSet)
		}
		if(parsedQuery.where.right){
			tempMap = checkRecursiveRightElement(parsedQuery.where.right, object)
			soqlMap = joinMaps(soqlMap, tempMap)
		}
	}
	return soqlMap
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


const getDescribe = (obj) => {
	return new Promise((resolve, reject) => {
		fetch(`${url}/services/data/v50.0/sobjects/${obj}/describe`, {
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
	})
}

const getObjNameFromPluralName = (pluralName) => {
	return new Promise((resolve, reject) => {
		fetch(url+'/services/data/v50.0/sobjects/', {
			headers: {
				"Content-Type":"application/json",
				"Authorization": `Bearer ${token}`
			}
		})
		.then(response => {
			response.json().then(data => {
				resolve(data.sobjects)
			})
			
		})
	})
}


/**
 * @description api call (using SF tooling API) to get class information
 * @param {*} entryPoint 
 * @returns 
 */
 async function getClassDetails(entryPoint){

	const {classId,token,url} = entryPoint;
	let endpoint = `${url}/services/data/v51.0/tooling/sobjects/ApexClass/${classId}`;

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