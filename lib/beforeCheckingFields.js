const helper = require('./helper')

/**
 *
 * @param {*} line
 * @description removes comments
 * @returns class content without comments and in lower case
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
	classWithoutComments 	= classWithoutComments.replace(/(\r?\n)\s*\1+/g, '$1');
	classWithoutComments	= classWithoutComments.replace(/\t/g, ' ').replace(/ +/g, ' ')
	classWithoutComments	= classWithoutComments.split('\n').join(' ')
	classWithoutComments	= classWithoutComments.toLowerCase()
	return classWithoutComments
}

const splitClass = (body, variablesToAnalyse) => {
	let returnArray = []
	let allVariables = []
	//get all variables in a list to know which ones to keep in our splitClass Array
	for (let object of variablesToAnalyse.keys()){
		let referencesArray 	= variablesToAnalyse.get(object)
		for (let i=0 ; i < referencesArray.length ; i++){
			allVariables.push(referencesArray[i])
		}
	}
	let uniqueVariables = [...new Set(allVariables)];

	body = body.split('{').join(';').split('}').join(';').split(' static ').join(';').split(' class ').join(';').split(';')
	body.forEach(statement => {
		let statementWithoutSpaces = statement.replace(/\s/g, '')
		if( statementWithoutSpaces != ''  && lineToanalyse(uniqueVariables, statementWithoutSpaces)){
			returnArray.push(statement.trim())
		}
	})
	return returnArray
}

//if it contains variable or SOQL is to analyse
const lineToanalyse = (uniqueVariables, statement) => {
	for(let i = 0 ; i<uniqueVariables.length ; i++){
		if(statement.includes(uniqueVariables[i]+'.') || 
		statement.includes(uniqueVariables[i]+'=') || 
		statement.includes('='+uniqueVariables[i])){
			return true
		}
	}
	if(statement.toLowerCase().includes('sobjectfield')){
		return true
	}
	if(helper.containsQuery(statement)){
		return true
	}
	return false
}

/**
 * 
 * @param {*} classContent 
 * @description this method returns all fields and object instances inside the class that might contains standard SF fields 
 */
 const getvariablesToAnalyse = (symbolTable) => {
	
  //Symbol table return properties and variables, we need to analysed both
  let fieldsToAnalysePropsMap	= analyseProps(symbolTable)
  let fieldsToAnalyseVarsMap	= analyseVars(symbolTable)
	let finalMap 								= helper.joinMaps(fieldsToAnalysePropsMap, fieldsToAnalyseVarsMap)
	
	return finalMap
}


/**
 *  @description analyse the global variables of Symbol Table
 * @param {*} tempVar 
 */
 const analyseProps = (tempVar) => {
	let fieldsToAnalyse	= new Map();
	tempVar.properties.forEach(variable => {
		let tempArray = []	
		let curObj 		= String(variable.type).split("<").join('')
																					.split(">").join('')
																					.split(",").join('')
																					.split("Set").join('')
																					.split("List").join('')
																					.split("Map").join('')
			if(checkIfPrimativeObject(curObj)){
				return //continue
			}
			if(fieldsToAnalyse.get(curObj)){
				tempArray = fieldsToAnalyse.get(curObj.toLowerCase())
			}
			if(!tempArray.includes(variable.name.toLowerCase())){
				tempArray.push(variable.name.toLowerCase())
				fieldsToAnalyse.set(curObj, tempArray)
			}
	})
	return fieldsToAnalyse
}
/**
 *  @description analyse the methods variables of Symbol Table
 * @param {*} tempVar 
 */
const analyseVars = (tempVar) => {
	let fieldsToAnalyse	= new Map();
	tempVar.variables.forEach(variable => {
		let tempArray = []	
		let curObj 		= String(variable.type).split("<").join('')
															.split(">").join('')
															.split(",").join('')
															.split("Set").join('')
															.split("List").join('')
															.split("Map").join('')
			if(checkIfPrimativeObject(curObj)){
				return //continue
			}
			if(fieldsToAnalyse.get(curObj)){
				tempArray = fieldsToAnalyse.get(curObj.toLowerCase())
			}
			if(!tempArray.includes(variable.name.toLowerCase())){
				tempArray.push(variable.name.toLowerCase())
				fieldsToAnalyse.set(curObj.toLowerCase(), tempArray)
			}
	})
	return fieldsToAnalyse
}

const checkIfPrimativeObject = (curObj) => {
	let curObj2 = curObj.toLowerCase()
	return (curObj2.toLowerCase() == 'base64' ||
					curObj2.toLowerCase() == 'boolean' ||
					curObj2.toLowerCase() == 'byte' ||
					curObj2.toLowerCase() == 'date' ||
					curObj2.toLowerCase() == 'datetime' ||
					curObj2.toLowerCase() == 'double' ||
					curObj2.toLowerCase() == 'int' ||
					curObj2.toLowerCase() == 'integer' ||
					curObj2.toLowerCase() == 'long' ||
					curObj2.toLowerCase() == 'string' ||
					curObj2.toLowerCase() == 'schema.sobjectfield' ||
					curObj2.toLowerCase() == 'time')
					
}

module.exports = { 
	removeComments, 
	splitClass,
	getvariablesToAnalyse,
	checkIfPrimativeObject
}