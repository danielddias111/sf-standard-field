const sfRequest				= require('./salesforceCallouts.js')

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
 * @description needs to have all scenarios on how a field can be used
 * ' acc'
 * '(acc'
 * '=acc'
 * 'acc.'
 * ' new '
 * @returns 
 */
 const lineContainsVariableReference = (line, ref) => {

	if( (line.includes(' '+ref) || line.includes('('+ref) || line.includes('='+ref) || line.startsWith(ref+'.')) 
					&& (line.includes(ref+'.') || line.includes(' new ')) && !line.includes(ref+'.get') && !line.includes(ref+'.values')){
		return true
	}
	return false
}

/**
 * @description check if line contains standard field, Account acc= new Account(Industry='') or acc.Industry
 */
 const containsSalesforceStandardField = (line, objReference) => {
	let standardArray 					= []
	let spaceSplit 							= line.split(' ');
	//check for a.industry
	spaceSplit.forEach(space => {
		let space2 = 
					space.endsWith(',') ? space.substring(0,space.length-1) : 
					space.endsWith(']') ? space.split(')')[0] : 
					space
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
					let value = leftOfEquals.split(',');
					if(value[1]){
						standardArray.push(value[1].replace(/ +/g, ''));
					}
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

const getNameFromPluralName = async (parentObject, childObject) => {
	let singularName
	let {childRelationships} = await sfRequest.getDescribe(parentObject)
	//let { childRelationships } = await sfRequest.getDescribe(parentObject, url, token)
	childRelationships.forEach(obj => {
		if(obj.relationshipName && childObject === obj.relationshipName.toLowerCase()){
			singularName = obj.childSObject;
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

const getFieldsInWhereClause = async (parsedQuery, object) => {
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
			allObjFields = await sfRequest.getDescribe(object)
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










//Analyse all lines for [select id, industry from lead][0].industry
const checkSpecificBadPractices = (line) => {
	let standardFieldsMap = new Map()
	if(containsQuery(line) && !line.replace(/ +/g, '').endsWith('__c') && !line.replace(/ +/g, '').endsWith(']') && line.split('from')[1].split(' ')){
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
const checkSpecific_sObjectField = (line) => {
	let fieldMap = new Map()
	let obj
	let field
	let tempSet = []
	if(line.includes('sobjectfield')){
		if(line.split('=')[1]!=null && !line.endsWith('__c') && !line.endsWith('__c ')){
			obj = line.split('=')[1].split('.')[0].replace(/ +/g, '');
			field = line.split('=')[1].split('.')[1].replace(/ +/g, '');
				tempSet.push(field)
				fieldMap.set(obj, tempSet)
				return fieldMap
		}
	}
	return null
}

module.exports = {
	joinMaps,
	lineContainsVariableReference,
	containsSalesforceStandardField,
	checkBadPractices,
	getParentObjectName,
	check_sObjectField,
	getFieldsInWhereClause,
	containsQuery,
	checkSpecificBadPractices,
	getNameFromPluralName,
	checkSpecific_sObjectField
}