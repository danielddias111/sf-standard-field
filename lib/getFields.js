const { getAllstandardFields }		= require('./getAllstandardFields')
const { removeComments }		= require('./beforeCheckingFields')

/**
 * @param  EntryPoint token,url, SymbolTable, Body
 * @param options fields: ['Account.Industry','Account.name','Lead.Industry']
 * @returns A promise - Example - Map(3) { 'Account.Industry' => true, 'Account.name' => false, 'Lead.Industry' => false}
 */
const getStandardFields = async (entryPoint) => {
		let { Body, SymbolTable } 		= entryPoint;
		Body													= removeComments(Body)
		try {
				let returnResult = null
				returnResult 		= await getAllstandardFields(entryPoint,
																										Body, 
																										SymbolTable)
				return returnResult
		} catch (error) {
			console.log('Error on: getStandardFields',error)
		}
		
}




module.exports = getStandardFields