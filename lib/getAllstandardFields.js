const helper 					= require('./helper.js')
const initializing		= require('./beforeCheckingFields')
const soqlHelper			= require('./soqlHelper.js')
const sfRequest				= require('./salesforceCallouts.js')

async function getAllstandardFields(entryPoint, Body,  SymbolTable){
	soqlMap 					= new Map();
	global.url 							= entryPoint.url
	global.token 						= entryPoint.token
	global.entryPoint				= entryPoint
	/* get fields in Class to analyse
	Account acc - acc is a field to analyse as it is type account*/
	let variablesToAnalyse 			= await initializing.getvariablesToAnalyse(SymbolTable);
	//get an array separated by _;_
	let splitedClass						= initializing.splitClass(Body, variablesToAnalyse)
	
	let returnMap 							= await getNormalReference(splitedClass, variablesToAnalyse)
	let returnMap2 							= await getSOQLAndSObject(splitedClass, SymbolTable)

	returnMap = helper.joinMaps(returnMap, returnMap2)
	return returnMap
}

const getNormalReference = async (splitedClass, variablesToAnalyse) => {
	let referencesArray;
	let standardFieldsMap = new Map();
	/*Check all variables (Account acc; Opportunity Opp)
		variablesToAnalyse eg:
		(Account => [acc, acc2]; 
		Opportunity => [opp, opp2])*/
		for (let object of variablesToAnalyse.keys()){
			// referencesArray contains the array of instances that an object have
			referencesArray = variablesToAnalyse.get(object)//as above example: if object==Opportunity ? referencesArray=[opp, opp2]
			for (let i=0;i<referencesArray.length;i++){
				for(let lineCount = 0; lineCount<splitedClass.length; lineCount++){
					//includesField - if line contains field. SOQL queries are analysed after so we can skip them.
					if(!helper.containsQuery(splitedClass[lineCount])){
						tempMap 					= checkStandardField(splitedClass[lineCount], referencesArray[i], object)
						standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
					}
				}
			}
	}
	return standardFieldsMap 
}

const getSOQLAndSObject = async (splitedClass, SymbolTable) => {
		let standardFieldsMap = new Map();
		let tempMap = new Map()
	
		//sObject Field
			for(let i = 0; i<splitedClass.length; i++){
				let line 						= splitedClass[i]
				tempMap  						= helper.checkSpecificBadPractices(line)
				standardFieldsMap 	= helper.joinMaps(standardFieldsMap, tempMap)
				tempMap  						= helper.checkSpecific_sObjectField(line)
				standardFieldsMap 	= helper.joinMaps(standardFieldsMap, tempMap)
				
				//inner SOQL might exist that it is not captured in the first loop, where we just search for variables of the type of the object we want to search (Account acc, Opporunity opp)
				if(helper.containsQuery(line)){
						//for(let x=0; x<SFobjects.length; x++){
							//let obj = SFobjects[x]
							tempMap 						= await soqlHelper.checkStandardFieldSOQL(line)
							standardFieldsMap 	= helper.joinMaps(standardFieldsMap, tempMap)
						//}
				}
				//check parents
				tempMap 					= await checkParentFields(line, SymbolTable)
				standardFieldsMap = helper.joinMaps(standardFieldsMap, tempMap)
			}
		return standardFieldsMap;
	//})
	
}	

const checkParentFields =  async (line, SymbolTable) => {
		let standardFieldsMap = new Map();
		let splitedLine = line.split(' ')
		for(let i=0; i< splitedLine.length; i++){
			let space 				= splitedLine[i]			
			if(space.split('.').length!=2){
				let varsAndProps 	= SymbolTable.variables
				varsAndProps.concat(SymbolTable.properties)
				for(let c=0; c<varsAndProps.length; c++){
					let variable 		= varsAndProps[c]
					if(initializing.checkIfPrimativeObject(variable.type)){
						continue
					}
					if(space.includes('.') && (space+'.').startsWith(variable.name+'.')){
						//means it's a field relationship, we need to iterate all fields until the one we want
						//iterate all relationships
						let parentObj = String(variable.type).split("<").join('')
												.split(">").join('')
												.split(",").join('')
												.split("Set").join('')
												.split("List").join('')
												.split("Map").join('')

						let {fields} = await sfRequest.getDescribe(parentObj)
						
						let previousObj 			= parentObj
						let objs 							= space.split('.')
						for(let x=0; x<objs.length-1; x++){
							let allObjFields 	= fields
							//iterate all fields in object to get the parent object
							for(let allObjFieldsCounter = 0; allObjFieldsCounter<allObjFields.length; allObjFieldsCounter++){
								if(allObjFields[allObjFieldsCounter].relationshipName!= null && allObjFields[allObjFieldsCounter].relationshipName.toLowerCase() == objs[x+1]){
									previousObj = parentObj
									parentObj = allObjFields[allObjFieldsCounter].referenceTo[0]
									break
								}
							}
							if(x == objs.length-3){
								let tempArray = []
								//concating the 2 arrays
								tempArray.push(objs[objs.length-1])
								//removing duplicates
								tempArray = [...new Set(tempArray)];
								standardFieldsMap.set(parentObj.toLowerCase(), tempArray)
								return standardFieldsMap
							}
						}
					}
				}
			}
		
		}
		return null	
}

// check in SOQL and basic use
// myLead.name
const checkStandardField = (line, variable, object) => {
		let standardFieldsMap = new Map()
		//check if line contains acc or opp (variable)
		if(helper.lineContainsVariableReference(line, variable)){
			let standardArray = helper.containsSalesforceStandardField(line, variable)
			let tempArray = []
			if(standardArray.length>0){
				for(let i=0; i<standardArray.length; i++){
					if(standardArray[i].split('.').length == 1){
							//concating the 2 arrays
							tempArray.push(standardArray[i])
							//removing duplicates
							tempArray = [...new Set(tempArray)];
							standardFieldsMap.set(object.toLowerCase(), tempArray)
						}
				}
			}
			return standardFieldsMap
		}
		return null	
}




module.exports =  { getAllstandardFields }