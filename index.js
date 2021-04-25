//To retrive SOQL metadata
const { parseQuery } = require('soql-parser-js');
//standardSFObjects contains the objects to check
let standardSFObjects		= ['Lead','Account']
//Class splited by ; without comments
let splitedClass
//Objects and Standard fields
let standardFieldsMap	= new Map()
//Map containing standard fields and objects in SOQL
let soqlMap = new Map()

const meta = require('./metadata.js')
let symbolObj	= JSON.parse(meta.symbolTable)
//Fields to analyse
let fieldsToAnalyse			= new Map();

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
const getFieldsToAnalyse = (metadataContent) => {
	let tempVar 
	for(let i=0; i<metadataContent.records.length; i++){
		tempVar = metadataContent.records[i]
		//Symbol table return properties and variables, we need to analysed both
		analyseProps(tempVar)
		analyseVars(tempVar)
	}
}

/**
 *  @description analyse the global variables of Symbol Table
 * @param {*} tempVar 
 */
const analyseProps = (tempVar) => {
	let tempProps
	// check properties - class variables
	for(let propsCount=0; propsCount < tempVar.SymbolTable.properties.length; propsCount++){
		tempProps = tempVar.SymbolTable.properties
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
}
/**
 *  @description analyse the methods variables of Symbol Table
 * @param {*} tempVar 
 */
const analyseVars = (tempVar) => {
	let tempVars
// check variables - methods variables
	for(let varCount=0; varCount < tempVar.SymbolTable.variables.length; varCount++){
		tempVars	= tempVar.SymbolTable.variables
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

const getAllStandardFields = () => {
	let referencesArray
	for (let object of fieldsToAnalyse.keys()){
		// referencesArray contains the array of instances that an object have
		// e.g. {'Account': [accFieldA , accFieldB]} 
		referencesArray = fieldsToAnalyse.get(object)
    for (let i=0;i<referencesArray.length;i++){
			for(let lineCount = 0; lineCount<splitedClass.length; lineCount++){
				if(lineContainsObjReference(splitedClass[lineCount], referencesArray[i])){
					let standardArray = containsStandardField(splitedClass[lineCount], referencesArray[i])
					if(standardArray.length>0){
						if(standardFieldsMap.get(object)){
							//concating the 2 arrays
							tempArray = standardFieldsMap.get(object).concat(standardArray)
							//removing duplicates
							tempArray = [...new Set(tempArray)];
							standardFieldsMap.set(object, tempArray)
						}
						else {
							standardFieldsMap.set(object, standardArray)
						}
					}
					//SOQL check
					checkStandardFieldSOQL(splitedClass[lineCount])
				}
			}
		}
  }
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


const checkStandardFieldSOQL = (line) => {
	//check for SOQL
	if(line.includes('[') && line.includes('select') && line.includes(']')){
		let soqlQuery	= line.split('[')[1].split(']')[0]
		const query = parseQuery(soqlQuery);
		return getStandardFieldsInSOQL(query)
	}
}

const getStandardFieldsInSOQL = (parsedQuery) => {
	for(let i=0; i<parsedQuery.fields.length; i++){
		if(parsedQuery.fields[i].type === 'Field' && !parsedQuery.fields[i].field.endsWith('__c')){
			let object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
			if(soqlMap.get(object)){
				soqlMap.get(object).push(parsedQuery.fields[i].field)
			}
			else {
				let tempArray = [parsedQuery.fields[i].field]
				soqlMap.set(object, tempArray)
			}	
		}
		else if(parsedQuery.fields[i].type === 'FieldSubquery'){
			getStandardFieldsInSOQL(parsedQuery.fields[i].subquery)
		}
	}
}

let classWithoutComments	=	removeComments(meta.apexClass)
splitedClass = classWithoutComments.split(';')
getFieldsToAnalyse(symbolObj);
console.log('Fields to analyse',fieldsToAnalyse)
getAllStandardFields()
console.log('standard Fields used:')
console.log(standardFieldsMap)
console.log('fields inside SOQL used:')
console.log(soqlMap)