const sfRequest				= require('./salesforceCallouts.js')

/**
 * 
 * @param {*} classContent 
 * @description this method returns all fields and object instances inside the class that might contains standard SF fields 
 */
 const getFieldsToAnalyse = (symbolTable, allSFObjects) => {
	
  //Symbol table return properties and variables, we need to analysed both
  let fieldsToAnalysePropsMap	= analyseProps(symbolTable, allSFObjects)
  let fieldsToAnalyseVarsMap	= analyseVars(symbolTable, allSFObjects)
	let finalMap 								= joinMaps(fieldsToAnalysePropsMap, fieldsToAnalyseVarsMap)
	
	return finalMap
}

/**
 *  @description analyse the global variables of Symbol Table
 * @param {*} tempVar 
 */
 const analyseProps = (tempVar, allSFObjects) => {
	let fieldsToAnalyse	= new Map();
	// check properties - class variables
	tempVar.properties.forEach(prop => {
		// check if type contains object name
		allSFObjects.forEach(obj => {
			if(containsObj(prop.type, 
				obj)){
					let tempArray = []
					if(fieldsToAnalyse.get(obj)){
						tempArray = fieldsToAnalyse.get(obj)
					}
					if(!tempArray.includes(prop.name.toLowerCase())){
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
const analyseVars = (tempVar, allSFObjects) => {
	let fieldsToAnalyse	= new Map();
	// check variables - methods variables
	tempVar.variables.forEach(variable => {
		// check if type contains object name
		allSFObjects.forEach(obj => {
			if(containsObj(variable.type, 
				obj)){
			let tempArray = []
			if(fieldsToAnalyse.get(obj)){
				tempArray = fieldsToAnalyse.get(obj)
			}
			if(!tempArray.includes(variable.name.toLowerCase())){
				tempArray.push(variable.name.toLowerCase())
				fieldsToAnalyse.set(obj, tempArray)
			}
		}
		})
	})
	return fieldsToAnalyse
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
	 * Map<Lead,sObject>
	 * */ 
	type = type.toLowerCase()
	obj = obj.toLowerCase()
	if(type === obj || 
		type.includes('<'+obj+'>') ||
		type.includes(','+obj+'>')||
		type.includes('<'+obj+',')){
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
 const lineContainsObjReference = (line, ref) => {

	if( (line.includes(' '+ref) || line.includes('('+ref) || line.includes('='+ref)) 
					&& line.includes(ref+'.') && !line.includes(ref+'.get') && !line.includes(ref+'.values')){
		return true
	}

	/*if((line.includes(' '+ref) || line.includes('='+ref)) && (line.includes(ref + '.') || line.includes(ref + ' ') || line.includes(ref + '[')) && !line.includes(ref+'.adderror')){
		return true
	}*/
	return false
}

/**
 * @description check if line contains standard field, Account acc= new Account(Industry='') or acc.Industry
 */
 const containsStandardVariable = (line, objReference) => {
	let standardArray 					= []
	let spaceSplit 							= line.split(' ');
	//check for a.industry
	spaceSplit.forEach(space => {
		let space2 = space.endsWith(',') ? space.substring(0,space.length-1) : space
		if(space2.includes(objReference+'.') && !space2.endsWith('__c')){
			let tempArray	= space2.split(objReference+'.')
			if(tempArray[1]){
				standardArray.push(tempArray[1].split(')').join('').split('get(').join(''))
			}
		}
	})
	// lead a = new lead(industry='auto', cleanstatus='')
	// check for new object instances
	// line only contains one space, so if they have '=    new' becomes '= new'
	if((line.includes(' '+objReference) || line.includes(objReference+'.')) && (line.includes('=new') || line.includes('= new')) && !line.includes('[')){
		let leftOfEquals 				= ''
		if(line.split('=').length > 2){
			for(let i=1; i<line.split('=').length-1; i++){
				leftOfEquals 				= line.split('=')[i]
				leftOfEquals				= leftOfEquals.slice(-1) == '!' ? leftOfEquals.substring(0, leftOfEquals.length-1): leftOfEquals
				if(i===1){
					standardArray.push(leftOfEquals.split('(')[1])
				}
				else {
					// removing spaces so that we can identify duplicates
					standardArray.push(leftOfEquals.split(',')[1].replace(/ +/g, ''))
				}
			}
		}
	}

	return standardArray;
}
//Analyse all lines for [select id, industry from lead][0].industry
const checkBadPractices = (line) => {
	let standardFieldsMap = new Map()
	if(containsQuery(line)  && !line.replace(/ +/g, '').endsWith(']') && !line.replace(/ +/g, '').endsWith('__c')){
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

const check_sObjectField = (line) => {
	let fieldMap = new Map()
	let obj
	let field
	let tempSet = []
	if(line.includes('sobjectfield')){
		if(line.split('=')[1]!=null && !line.endsWith(')')){
			obj = line.split('=')[1].split('.')[0].replace(/ +/g, '');
			field = line.split('=')[1].split('.')[1].replace(/ +/g, '');
			tempSet.push(field)
			fieldMap.set(obj, tempSet)
			return fieldMap
		}
	}
	return null
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

const getFieldsInWhereClause = async (parsedQuery, object, url,token) => {
	let soqlMap = new Map()
	let tempMap = new Map()
	let tempSet = []
	let allObjFields
	let fieldObj = {
		field: '',
		relationships: []
	}
		if(parsedQuery.where.left.field.includes('.')){

			fieldObj.field = parsedQuery.where.left.field.split('.')[parsedQuery.where.left.field.split('.').length-1]
			fieldObj.relationships = parsedQuery.where.left.field.split('.').splice(0,1)
			allObjFields = await sfRequest.getDescribe(object, url,token)
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
	return soqlMap
} 

const checkRecursiveRightElement = (parsedQueryRightElement, object) => {
	//console.log(parsedQueryRightElement)
	let soqlMap = new Map()
	let tempMap = new Map()
	let tempSep = []
	tempSep.push(parsedQueryRightElement.left.field)
	soqlMap.set(object, tempSep)
	if(parsedQueryRightElement.right){
		tempMap = checkRecursiveRightElement(parsedQueryRightElement.right, object)
		soqlMap = joinMaps(soqlMap, tempMap)
	}
	return soqlMap
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
const checkSpecific_sObjectField = (line, fields) => {
	let fieldMap = new Map()
	let obj
	let field
	let tempSet = []
	if(line.includes('sobjectfield')){
		if(line.split('=')[1]!=null && !line.endsWith('__c') && !line.endsWith('__c ')){
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

module.exports = {
	getFieldsToAnalyse,
	joinMaps,
	lineContainsObjReference,
	containsStandardVariable,
	checkBadPractices,
	getParentObjectName,
	check_sObjectField,
	getFieldsInWhereClause,
	containsQuery,
	splitClass,
	getSpecificFieldsInWhereClause,
	getSpecificFieldsInOrderByClause,
	checkSpecificBadPractices,
	getNameFromPluralName,
	checkSpecific_sObjectField
}