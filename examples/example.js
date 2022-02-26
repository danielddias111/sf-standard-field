const fetch 								= require('node-fetch');
const { getStandardFields }	= require('../src/index.js');

/*const options = {
	fields: ['Account.Industry','Account.name','lead.industry']
}*/
const token = '00D09000007z6rW!ARQAQDA17Ioy_8FK3ngzfOFq2wKkV0YxVyPFuU9n34HsfXF9ck67IgDfNRuKB4HN1rfofweL7KFlMv2EEEU'
const url = 'https://dependencypt-dev-ed.my.salesforce.com'
/*
"01p0900000O1eDIAAZ","SOQLBasic"
"01p0900000O1eDNAAZ","SOQLString"
"01p0900000O1eQPAAZ","SOQLParent"
"01p0900000O1eQUAAZ","Parent"
"01p0900000O1eD8AAJ","initializingObj"
"01p0900000O1eDDAAZ","sObjectTest"
"01p0900000O1eI4AAJ","SOQLInner"
"01p0900000O1ehAAAR","SOQLWhere"
"01p0900000O1ehFAAR","SOQLOrder"
"01p0900000QxguJAAR","SOQLInnerParent"
"01p0900000Qy3uDAAR","ComplexClass"
*/
let classes = ['01p0900000O1eD8AAJ','01p0900000O1eDDAAZ','01p0900000O1eQUAAZ','01p0900000O1eDIAAZ','01p0900000O1eDNAAZ','01p0900000O1eQPAAZ','01p0900000O1eI4AAJ','01p0900000O1ehAAAR','01p0900000O1ehFAAR','01p0900000QxguJAAR','01p0900000Qy3uDAAR']
let entryPoint

async function runExamples(){
	console.log('Sarting...\n#######')
	for(let i =0; i<classes.length; i++){

		let endpoint = `${url}/services/data/v52.0/tooling/sobjects/ApexClass/${classes[i]}`;
		let options2 = {
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
					}
		}    
		let response 			= await fetch(endpoint,options2);
		let json 					= await response.json();
		if(json.Body && json.SymbolTable){
			const {Body,SymbolTable} = json;
			entryPoint = {
				token,
				url,
				SymbolTable,
				Body
			}
			//console.log(`Checking industry field in class:\n${json.Name} - ${json.Id} `)
			let response = await getStandardFields(entryPoint);
			
			if(validateResponse(json.FullName, response)){
				console.log(response)
				
				console.log(`-${json.FullName} => All Good`)
			}
			else {
				console.log(`-${json.FullName} => Something went wrong! ########### ERROR ##############`)
			}
			
		}
		else {
			console.log(`Error on class: ${classes[i]}`)
		}

	}
}

const validateResponse = (className, responseValue) =>{
	if(className == 'initializingObj'){
		return responseValue.size == 2 && responseValue.get('account').length == 1 && responseValue.get('lead').length == 1 && responseValue.get('account')[0] == 'industry' && responseValue.get('lead')[0] == 'industry'
	}
	if(className == 'sObjectTest'){
		return responseValue.size == 2 && responseValue.get('account').length == 1 && responseValue.get('lead').length == 2 && responseValue.get('account')[0] == 'industry' && responseValue.get('lead')[0] == 'industry' && responseValue.get('lead')[1] == 'name'
	}
	if(className == 'Parent'){
		return responseValue.size == 1 && responseValue.get('account').length == 1 && responseValue.get('account')[0] == 'industry'
	}
	if(className == 'SOQLBasic'){
		return responseValue.size == 2 && responseValue.get('account').length == 1 && responseValue.get('lead').length == 2 && responseValue.get('account')[0] == 'industry' && responseValue.get('lead')[0] == 'name' && responseValue.get('lead')[1] == 'industry'
	}
	if(className == 'SOQLString'){
		return responseValue.size == 2 && responseValue.get('account').length == 2 && responseValue.get('lead').length == 2 && responseValue.get('account')[0] == 'industry' && responseValue.get('account')[1] == 'id' && responseValue.get('lead')[0] == 'industry' && responseValue.get('lead')[1] == 'id'
	}
	if(className == 'SOQLParent'){
		return responseValue.size == 1 && responseValue.get('account').length == 1 && responseValue.get('account')[0] == 'industry'
	}
	if(className == 'SOQLInner'){
		return responseValue.size == 2 && responseValue.get('account').length == 2 && responseValue.get('opportunity').length == 1 && responseValue.get('account')[0] == 'id' && responseValue.get('account')[1] == 'industry' && responseValue.get('opportunity')[0] == 'id'
	}
	if(className == 'SOQLWhere'){
		return responseValue.size == 1 && responseValue.get('account').length == 2 && responseValue.get('account')[0] == 'id' && responseValue.get('account')[1] == 'industry'
	}
	if(className == 'SOQLOrder'){
		return responseValue.size == 1 && responseValue.get('account').length == 2 && responseValue.get('account')[0] == 'id' && responseValue.get('account')[1] == 'industry'
	}
	if(className == 'SOQLInnerParent'){
		return responseValue.size == 3 && responseValue.get('account').length == 2 && responseValue.get('lead').length == 1 && responseValue.get('opportunity').length == 1 && responseValue.get('account')[0] == 'id' && responseValue.get('lead')[0] == 'industry' && responseValue.get('account')[1] == 'industry' && responseValue.get('opportunity')[0] == 'id'
	}
	console.log(responseValue)
	return true
}

runExamples();