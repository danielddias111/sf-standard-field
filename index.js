//standardSFObjects contains the objects to check
let standardSFObjects		= ['Lead','Account']
//Class splited by ; without comments
let splitedClass
//Objects and Standard fields
let standardFieldsMap	= new Map()
//field to analyse
let fields
const meta = require('./metadata.js')
console.log('#########')
console.log('Apex class to analyse:')
console.log(meta.apexClass)
let symbolObj	= JSON.parse(meta.symbolTable)
console.log('#########')

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
 * @description this method returns all fields inside the class that might contains standard SF fields 
 */
const getFieldsToAnalyse = (metadataContent) => {
	let fieldsToAnalyse			= new Map();
	let tempProps
	let tempVars
	for(let i=0; i<metadataContent.records.length; i++){
		// check properties - class variables
		for(let propsCount=0; propsCount < metadataContent.records[i].SymbolTable.properties.length; propsCount++){
			tempProps = metadataContent.records[i].SymbolTable.properties
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
		// check variables - methods variables
		for(let varCount=0; varCount < metadataContent.records[i].SymbolTable.variables.length; varCount++){
			tempVars	= metadataContent.records[i].SymbolTable.variables
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
	return fieldsToAnalyse;
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
	if(line.includes(' '+standardField) && (line.includes(standardField + '.') || line.includes(standardField + ' ')) ){
		return true
	}
	return false
}

const getAllStandardFields = () => {
	let line
	let field
	let referencesArray

	for (let object of fields.keys()){
		referencesArray = fields.get(object)
    for (let i=0;i<referencesArray.length;i++){
			for(let lineCount = 0; lineCount<splitedClass.length; lineCount++){
				if(lineContainsObjReference(splitedClass[lineCount], referencesArray[i])){
					console.log('This field -' + referencesArray[i] + '- is used in line -' + lineCount + '- !!')
					console.log(splitedClass[lineCount])
					console.log('###')
					let standardArray = containsStandardField(splitedClass[lineCount], referencesArray[i])
					if(standardArray.length>0){
						if(standardFieldsMap.get(object)){
							let tempArray = standardFieldsMap.get(object)
							tempArray = tempArray.concat(standardArray)
							standardFieldsMap.set(object, tempArray)
						}
						else {
							let tempArray = standardArray
							standardFieldsMap.set(object, tempArray)
						}
					}
				}
			}
		}
  }
}		

/**
 * @description check if contains standard field
 */
const containsStandardField = (line, objReference) => {
	let standardArray = []
	let spaceSplit = line.split(' ');
	for(let i=0; i<spaceSplit.length; i++){
		if(spaceSplit[i].startsWith(objReference+'.') && !spaceSplit[i].endsWith('__c') ){
			standardArray.push(spaceSplit[i].split('.')[1])
		}
	}
	return standardArray;
}

let classWithoutComments	=	removeComments(meta.apexClass)
splitedClass = classWithoutComments.split(';')
console.log(splitedClass)
fields	= getFieldsToAnalyse(symbolObj);
console.log('Fields to analyse',fields)
getAllStandardFields()
console.log('standard Fields used:')
console.log(standardFieldsMap)