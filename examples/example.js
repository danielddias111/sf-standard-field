const fetch 	= require('node-fetch');
const { getStandardFields }= require('../src/index.js');

const options = {
	fields: ['Account.Industry','Account.name','lead.industry']
}
const token = '00D09000007z6rW!ARQAQHP2DrHVJCbu24FetHW5BWmHSCfcbGFs2Wtee8SY4zRSSxpGb1Zwu4qY_NfTUy3Ia7iuGj2rWA8mswJPKgxaal4kSk45'
const url = 'https://dependencypt-dev-ed.my.salesforce.com'

let classes = ['01p0900000O1eD8AAJ','01p0900000O1eDDAAZ','01p0900000O1eDIAAZ','01p0900000O1eDNAAZ','01p0900000O1eQPAAZ','01p0900000O1eQUAAZ','01p0900000O1eI4AAJ','01p0900000O1ehAAAR','01p0900000O1ehFAAR','01p0900000QxguJAAR']
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
		let response = await fetch(endpoint,options2);
		let json = await response.json();
		if(json.Body && json.SymbolTable){
			const {Body,SymbolTable} = json;
			entryPoint = {
				token,
				url,
				SymbolTable,
				Body
			}
			//console.log(`Checking industry field in class:\n${json.Name} - ${json.Id} `)
			let response = await getStandardFields(entryPoint, options);
			if(response != 'Nothing to analyse!!' && response.get('Account.Industry') && !response.get('Account.name') && !response.get('lead.industry')){
				console.log(`All good! ### ${json.Name}`)
			}
			else {
				console.log('#################################################')
				console.log(`Something went wrong ${json.Id} - ${json.Name}`)
				console.log('#################################################')
			}
		}
		else {
			console.log(`Error on class: ${classes[i]}`)
		}
	}
}
	
runExamples();