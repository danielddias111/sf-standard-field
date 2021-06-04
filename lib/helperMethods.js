const fetch = require('node-fetch');

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

/**
 * 
 * @param {*} classContent 
 * @description this method returns all fields and object instances inside the class that might contains standard SF fields 
 */
 const getFieldsToAnalyse = (symbolTable, standardSFObjects) => {
	
  //Symbol table return properties and variables, we need to analysed both
  let fieldsToAnalysePropsMap	= analyseProps(symbolTable, standardSFObjects)
  let fieldsToAnalyseVarsMap	= analyseVars(symbolTable, standardSFObjects)
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
const analyseProps = (tempVar, standardSFObjects) => {
	let tempProps
	let fieldsToAnalyse	= new Map();
	// check properties - class variables
	tempVar.properties.forEach(prop => {
		tempProps = tempVar.properties
		// check if type contains object name
		standardSFObjects.forEach(obj => {
			if(containsObj(prop.type, 
				obj)){
					let tempArray = []
					if(fieldsToAnalyse.get(obj)){
						tempArray = fieldsToAnalyse.get(obj)
						tempArray.push(prop.name.toLowerCase())
						fieldsToAnalyse.set(obj, tempArray)
					}
					else {
						tempArray.push(prop.name.toLowerCase())
						fieldsToAnalyse.set(obj, tempArray)
					}
			}
		})
	})
	return fieldsToAnalyse
}
/**
 *  @description analyse the methods variables of Symbol Table
 * @param {*} tempVar 
 */
const analyseVars = (tempVar, standardSFObjects) => {
	let tempVars
	let fieldsToAnalyse	= new Map();
	// check variables - methods variables
	tempVar.variables.forEach(variable => {
		tempVars	= tempVar.variables
		// check if type contains object name
		standardSFObjects.forEach(obj => {
			if(containsObj(variable.type, 
				obj)){
			let tempArray = []
			if(fieldsToAnalyse.get(obj)){
				tempArray = fieldsToAnalyse.get(obj)
				tempArray.push(variable.name.toLowerCase())
				fieldsToAnalyse.set(obj, tempArray)
			}
			else {
				tempArray.push(variable.name.toLowerCase())
				fieldsToAnalyse.set(obj, tempArray)
			}
		}
		})
	})
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
	type = type.toLowerCase()
	obj = obj.toLowerCase()
	if(type === obj || 
		type.includes('<'+obj+'>')/*||
		type.includes(obj+'>') ||
		type.includes('<'+obj)*/){
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

/**
 * @description check if line contains standard field, Account acc= new Account(Industry='') or acc.Industry
 */
 const containsStandardField = (line, objReference) => {
	let standardArray = []
	let spaceSplit = line.split(' ');
	//check for a.industry
	spaceSplit.forEach(space => {
		if((space.startsWith('='+objReference) || space.startsWith(objReference+'.') || space.startsWith(objReference+'[')) && !space.endsWith('__c') ){
			standardArray.push(space.split('.')[1])
		}
	})
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


const getDescribe = (obj, url, token) => {
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


const getObjNameFromPluralName = (pluralName, url, token) => {
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

const getNameFromPluralName = async (object, url, token) => {
	let singularName
	let allObjs
	allObjs = await getObjNameFromPluralName(object, url, token)
	allObjs.forEach(obj => {
		if(object === obj.labelPlural.toLowerCase()){
			singularName = obj.label;
			return true
		}
	})
	return singularName
}


const getParentObjectName = async (field, allObjFieldsInput) => {
	let allObjFields = allObjFieldsInput
	let tempSet = []
	let soqlMap = new Map()
	await Promise.all(field.relationships.map(async rel => {
		if(allObjFields){
			for(let x=0; x<allObjFields.length; x++){
				//if its does not have  relationshipName means it is not a lookup
				if(allObjFields[x].relationshipName){
					if(field.relationships[field.relationships.length-1]===allObjFields[x].relationshipName.toLowerCase()){
						tempSet.push(field.field)
						soqlMap.set(allObjFields[x].referenceTo[0].toLowerCase(),tempSet)	
						return true
					}
				}
			}
		}	
	})) 
	return soqlMap
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
	//console.log(parsedQueryRightElement)
	let soqlMap = new Map()
	let tempMap = new Map()
	let tempSep = []
	if(!parsedQueryRightElement.left.field.endsWith('__c')){
		tempSep.push(parsedQueryRightElement.left.field)
		soqlMap.set(object, tempSep)
	}
	if(parsedQueryRightElement.right){
		tempMap = checkRecursiveRightElement(parsedQueryRightElement.right, object)
		soqlMap = helper.joinMaps(soqlMap, tempMap)
	}
	return soqlMap
}

const getSpecificFieldsInWhereClause = async (parsedQuery, object, fields) => {
	let soqlMap = new Map()
	let tempMap = new Map()
	let tempSet = []
	let allObjFields
	let fieldObj = {
		field: '',
		relationships: []
	}
	if(!parsedQuery.where.left.field.endsWith('__c') && fields.includes(parsedQuery.where.left.field)){
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


const getFieldsInOrderByClause = async (parsedQuery, object) => {
	let soqlMap = new Map()
	let tempMap = new Map()
	let tempSet = []
	let allObjFields
	let fieldObj = {
		field: '',
		relationships: []
	}

	await Promise.all(parsedQuery.orderBy.map(async field => {
		if(!field.field.endsWith('__c')){
			if(field.field.includes('.')){
				fieldObj.field = field.field.split('.')[field.field.split('.').length-1]
				fieldObj.relationships = field.field.split('.').splice(0,1)
				allObjFields = await getDescribe(object)
				tempMap = await getParentObjectName(fieldObj, allObjFields)
				soqlMap = joinMaps(soqlMap, tempMap)
			}
			else {
				tempSet.push(field.field)
				tempMap.set(object, tempSet)
				soqlMap = joinMaps(soqlMap, tempMap)
			}
		}
	}))
	
	return soqlMap
} 


const getSpecificFieldsInOrderByClause = async (parsedQuery, object, fields) => {
	let soqlMap = new Map()
	let tempMap = new Map()
	let tempSet = []
	let allObjFields
	let fieldObj = {
		field: '',
		relationships: []
	}
	await Promise.all(parsedQuery.orderBy.map(async field => {
		if(!field.field.endsWith('__c') && fields.includes(field.field)){
			if(field.field.includes('.')){
				fieldObj.field = field.field.split('.')[field.field.split('.').length-1]
				fieldObj.relationships = field.field.split('.').splice(0,1)
				allObjFields = await getDescribe(object)
				tempMap = await getParentObjectName(fieldObj, allObjFields)
				soqlMap = joinMaps(soqlMap, tempMap)
			}
			else {
				tempSet.push(field.field)
				tempMap.set(object, tempSet)
				soqlMap = joinMaps(soqlMap, tempMap)
			}
		}
	}))
	
	return soqlMap
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

const checkSpecific_sObjectField = (line, fields) => {
	let fieldMap = new Map()
	let obj
	let field
	let tempSet = []
	if(line.includes('sobjectfield')){
		if(!line.endsWith('__c') && !line.endsWith('__c ')){
			obj = line.split('=')[1].split('.')[0].replace(/ +/g, '');
			field = line.split('=')[1].split('.')[1].replace(/ +/g, '');
			if(fields.includes(field.toLowerCase())){
				tempSet.push(field)
				fieldMap.set(obj, tempSet)
				return fieldMap
			}
		}
	}
	return null
}

const getAllStandardObjects = async (entryPoint) => {
	const {token,url} = entryPoint;
	let endpoint = `${url}/services/data/v50.0/sobjects/`;

	let options = {
			headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${token}`
				}
	}    
	let standardObjects = []
	let response = await fetch(endpoint,options);
	let json = await response.json();
	const { sobjects } = json
	if(!sobjects){
		throw 'Either your token or endpoint is  incorrect'
	}
	sobjects.forEach(obj => {
		standardObjects.push(obj.name)
	})
	return standardObjects
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

const containsQuery = (line) => {
	return line.includes('[') && line.includes(']') && line.includes('select')
}

//Analyse all lines for [select id, industry from lead][0].industry
const checkSpecificBadPractices = (line, fields) => {
	let standardFieldsMap = new Map()
	if(containsQuery(line) && !line.replace(/ +/g, '').endsWith('__c') && !line.replace(/ +/g, '').endsWith(']')){
		let obj = line.split('from')[1].split(' ')[1].toLowerCase()
		if(obj.includes(']')){
			obj = obj.split(']')[0]
		}
		let field = line.split('.')[line.split('.').length-1]
		if(fields.includes(field.toLowerCase())){
			if(standardFieldsMap.get(obj.toLowerCase())){
				standardFieldsMap.get(obj.toLowerCase()).push(field)
			}
			else {
				standardFieldsMap.set(obj.toLowerCase(), [field])
			}
		}
	}
	return standardFieldsMap
}

module.exports = {
	getClassDetails,
	getFieldsToAnalyse,
	joinMaps,
	lineContainsObjReference,
	containsStandardField,
	getNameFromPluralName,
	getDescribe,
	getParentObjectName,
	getFieldsInWhereClause,
	getSpecificFieldsInWhereClause,
	getFieldsInOrderByClause,
	getSpecificFieldsInOrderByClause,
	check_sObjectField,
	checkSpecific_sObjectField,
	getAllStandardObjects,
	checkBadPractices,
	checkSpecificBadPractices,
	containsQuery
}