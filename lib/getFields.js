const sfRequest				= require('./salesforceCallouts.js')
//const allFields				= require('./getAllFields')
const { getSpecificFields }	= require('./getSpecificFields')
// if to analyse are empty means we want to grab all fields
let sfObjectsToAnalyse	= []
let sfFieldsToAnalyse	= []

/**
 * 
 * @param  EntryPoint token,url, SymbolTable, Body
 * @param options fields: ['Account.Industry','Account.name','Lead.Industry']
 * @returns A promise - Example - Map(3) { 'Account.Industry' => true, 'Account.name' => false, 'Lead.Industry' => false}
 */
const getStandardFields = async (entryPoint, options) => {
		let returnMap					= new Map()
		//If we don't have fields we throw an error
		if(!options.fields || options.fields ==null || options.fields.length === 0){
			throw Exception('Please provide options.fields')
		}

		let { Body, SymbolTable } = entryPoint;
		Body					= removeComments(Body)
		// get object and fields to analyse. We use 2 global variables
		// sfObjectsToAnalyse
		// sfFieldsToAnalyse
		getObjectAndFieldsToAnalyse(options)
		//if class contains no field to analyse we can stop immediatly
		if(!hasFieldsToAnalyse(Body)){
			return returnMap
		}
		try {
			if(sfFieldsToAnalyse.length > 0){
				let returnResult = await getSpecificFields(entryPoint,Body, SymbolTable, sfObjectsToAnalyse, sfFieldsToAnalyse)
				
				let tempArray = []
				for (let object of returnResult.keys()){
					let usedFields = returnResult.get(object)
					usedFields.forEach(field => {
						if(field && object){
							tempArray.push(object.toLowerCase()+'.'+field.toLowerCase())
						}
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
				return returnMap
			}
		} catch (error) {
			console.log('Error on: getStandardFields',error)
		}
		
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

/**
 * 
 * @param options 
 * @returns 
 */
const getObjectAndFieldsToAnalyse = (options) => {
	let temp
	options.fields.forEach(obj => {
		//Account.Industry
		temp 	= obj.split('.')
		if(temp.length === 2){
			//Add Objects to analyse
			if(!sfObjectsToAnalyse.includes(temp[0].toLowerCase())){
				sfObjectsToAnalyse.push(temp[0].toLowerCase())
			}
			//Add Fields to analyse
			if(!sfFieldsToAnalyse.includes(temp[1].toLowerCase())){
				sfFieldsToAnalyse.push(temp[1].toLowerCase())
			}
		}
	})
}
/**
 * 
 *  if we want to analyse name but name is no where in the code it means it is not there
 */
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
		return false
	}
	return hasFieldsToAnalyse
}

module.exports = getStandardFields