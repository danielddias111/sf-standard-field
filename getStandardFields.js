const fetch = require('node-fetch');
const { parseQuery } = require('soql-parser-js');
const strip = require('strip-comments');
//standardSFObjects contains the objects to check
let standardSFObjects		= ['Lead','Account','Opportunity']
let fieldsToAnalyse	= new Map();
let soqlMap = new Map();
let standardFieldsMap = new Map();
let url;
let token;

async function getStandardFields(entryPoint){

    url = entryPoint.url;
    token = entryPoint.token;

    let {Body,SymbolTable} = await getClassDetails(entryPoint);

    Body = removeComments(Body)
    console.log(Body);
    let splitedClass = Body.split(';')

    getFieldsToAnalyse(SymbolTable);
    console.log('Fields to analyse',fieldsToAnalyse)

    getAllStandardFields(splitedClass)
    .then(() => {
        console.log('standard Fields used:')
        console.log(standardFieldsMap)
        console.log('fields inside SOQL used:')
        console.log(soqlMap)
    })
}

module.exports =  getStandardFields;


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
    analyseProps(symbolTable)
    analyseVars(symbolTable)
	
}

/**
 *  @description analyse the global variables of Symbol Table
 * @param {*} tempVar 
 */
const analyseProps = (tempVar) => {
	let tempProps
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
}
/**
 *  @description analyse the methods variables of Symbol Table
 * @param {*} tempVar 
 */
const analyseVars = (tempVar) => {
	let tempVars
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

const getAllStandardFields = (splitedClass) => {
	return new Promise(async (resolve, reject) => {
		let referencesArray;
        

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
						await checkStandardFieldSOQL(splitedClass[lineCount])

					}
				}
			}
		}
		//Analyse all lines for [select id, industry from lead][0].industry
		for(let lineCount = 0; lineCount<splitedClass.length; lineCount++){
			if(containsQuery(splitedClass[lineCount]) && !splitedClass[lineCount].replace(/ +/g, '').endsWith('__c') && !splitedClass[lineCount].replace(/ +/g, '').endsWith(']')){
				let obj = splitedClass[lineCount].split('from')[1].split(' ')[1].toLowerCase()
				if(obj.includes(']')){
					obj = obj.split(']')[0]
				}
				let field = splitedClass[lineCount].split('.')[splitedClass[lineCount].split('.').length-1]
				if(standardFieldsMap.get(obj)){
					standardFieldsMap.get(obj).push(field)
				}
				else {
					standardFieldsMap.set(obj, [field])
				}
			}
		}
		resolve();
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


const checkStandardFieldSOQL = (line) => {
	//check for SOQL
	if(line.includes('[') && line.includes('select') && line.includes(']')){
		let soqlQuery	= line.split('[')[1].split(']')[0]
		const query = parseQuery(soqlQuery,{allowApexBindVariables:true});
		return getStandardFieldsInSOQL(query, false)
	}
}



const getStandardFieldsInSOQL = async (parsedQuery, isInnerQuery) => {

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
			getStandardFieldsInSOQL(parsedQuery.fields[i].subquery, true)
		}
		// FieldRelationship, we need to check the parents to map to the correct object
		else if(parsedQuery.fields[i].type === 'FieldRelationship' && !parsedQuery.fields[i].field.endsWith('__c')){
			let object = parsedQuery.sObject != null ? parsedQuery.sObject : parsedQuery.relationshipName
			//missing FieldRelationship in inner queries as name is different
			if(isInnerQuery){
				let allObjs = await getObjNameFromPluralName(object)
				for(let objs=0; objs<allObjs.length; objs++){
					if(object === allObjs[objs].labelPlural){
						object = allObjs[objs].label;
						break
					}
				}
			}
			let allObjFields = await getDescribe(object)
			//we can go up more than 1 time, so we need to iterate all parents fields
			for(let relationshipsCount = 0; relationshipsCount<parsedQuery.fields[i].relationships.length; relationshipsCount++){
				if(allObjFields){
					for(let x=0; x<allObjFields.length; x++){
						//if its does not have  relationshipName means it is not a lookup
						if(allObjFields[x].relationshipName){
							if(parsedQuery.fields[i].relationships[relationshipsCount]===allObjFields[x].relationshipName.toLowerCase()){
								if(relationshipsCount+1 === parsedQuery.fields[i].relationships.length){
									if(soqlMap.get(allObjFields[x].referenceTo[0])){
										soqlMap.get(allObjFields[x].referenceTo[0]).push(parsedQuery.fields[i].field)
									}
									else {
										soqlMap.set(allObjFields[x].referenceTo[0],[parsedQuery.fields[i].field])
										//console.log(soqlMap)
									}
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
			
		}
	}

    return soqlMap;
}

const getDescribe = (obj) => {
	return new Promise((resolve, reject) => {
        url = `${url}/services/data/v50.0/sobjects/${obj}/describe`;
       
		fetch(url, {
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
		fetch(url, {
			headers: {
				"Content-Type":"application/json",
				"Authorization": token
			}
		})
		.then(response => {
			response.json().then(data => {
				resolve(data.sobjects)
			})
			
		})
	})
}


