const sfRequest				= require('./salesforceCallouts.js')
//const allFields				= require('./getAllFields')
const { getSpecificFields }	= require('./getSpecificFields')
// if to analyse are empty means we want to grab all fields
let sfObjectsToAnalyse	= []
let sfFieldsToAnalyse	= []

const getStandardFields = async (entryPoint, options) => {
	return new Promise(async (resolve, reject) => {
		//Check if entry point is valid
		if(isEntryPointValid(entryPoint)){
			return reject('Wrong arguments passed. Please the url, token and class id.')
		}
		else if(!options.fields || options.fields ==null || options.fields.length === 0){
			return reject('Please provide options.fields')
		}
		//Grab class body and SymbolTable
		let classDetails 					= await sfRequest.getClassDetails(entryPoint);
		let  { Body, SymbolTable } = classDetails
		if(classDetails.error){
			return reject('Something went wrong => ',classDetails.error)
		}
		else if(!Body || !SymbolTable){
			return reject('Something went wrong => ', classDetails)
		}
		Body 											= removeComments(Body)
		// get object and fields to analyse
		await getObjectAndFieldsToAnalyse(options, entryPoint)
		//if class contains no field we can stop
		if(!hasFieldsToAnalyse(Body)){
			return resolve('Nothing to analyse!!')
		}
		if(sfFieldsToAnalyse.length > 0){
			let returnResult = await getSpecificFields(entryPoint,Body, SymbolTable, sfObjectsToAnalyse, sfFieldsToAnalyse)
			let returnMap = new Map()
			let tempArray = []
			for (let object of returnResult.keys()){
				let usedFields = returnResult.get(object)
				usedFields.forEach(field => {
					tempArray.push(object.toLowerCase()+'.'+field.toLowerCase())
				})
			}
			options.fields.forEach(value => {
				if(tempArray.includes(value.toLowerCase())){
					returnMap.set(value, true)
				}
				else{
					returnMap.set(value, false)
				}
			})
			return resolve(returnMap)
		}
	})
}

const isEntryPointValid = (entryPoint) => {
	return (entryPoint.url == null || entryPoint.url == '' || entryPoint.token == null || entryPoint.token == '' || entryPoint.classId == null || entryPoint.classId == '')
}

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

const getObjectAndFieldsToAnalyse = async (options, entryPoint) => {
	if(!options && !options.fields && options.fields.length === 0){
		return
	}
	let temp
	options.fields.forEach(obj => {
		temp 	= obj.split('.')
		if(temp.length === 2){
			if(!sfObjectsToAnalyse.includes(temp[0].toLowerCase())){
				sfObjectsToAnalyse.push(temp[0].toLowerCase())
			}
			if(!sfFieldsToAnalyse.includes(temp[1].toLowerCase())){
				sfFieldsToAnalyse.push(temp[1].toLowerCase())
			}
		}
	})

	//sfObjectsToAnalyse = await sfRequest.getAllStandardObjects(entryPoint)
}

const hasFieldsToAnalyse = (body) =>{
	let hasFieldsToAnalyse = false
	if(sfFieldsToAnalyse.length > 0){
		sfFieldsToAnalyse.every(field => {
			if(body.includes(field)){
				hasFieldsToAnalyse = true
				// return false = break
				return false 
			}
			//return true = continue
			return true
		})
	}
	else {
		return true
	}
	return hasFieldsToAnalyse
}

module.exports = getStandardFields