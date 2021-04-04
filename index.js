const fs = require('fs')




const fieldInClass = async (filePath, objName, fieldName) => {
	objName							= objName.toLowerCase()
	fieldName						= fieldName.toLowerCase()		
	let classContent 		= await readFile(filePath);
	removeComments(classContent)
	
	const lines = classContent.split(/\n/);
	//console.log(classContent)
	// print all lines
	lines.forEach((line) => {});
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
	console.log(classWithoutComments)
	return classWithoutComments
}

const readFile = (filePath) => {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, 'utf8' , (err, data) => {
			if (err) {
				console.error(err)
				reject
			}
			resolve(data.toLowerCase())
		})
	})
	
}



fieldInClass('./MyClass.cls','Lead','Industry');