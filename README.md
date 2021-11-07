This library allows to check which standard fields are used in your apex code.

You need to pass an `entryPoint` with your token, url, SymbolTable and Class Body (You are able to fetch SymbolTable and Body calling `https://login.salesforce.com/services/data/v52.0/tooling/sobjects/ApexClass/classID`). And an `options` object with a `fields` array with the object name and field name. 

The response returns a map of field => boolean eg `{ 'orderitem.id' => false, 'opportunity.name' => true }`

```Javascript
const {getStandardFields} = require('sf-standard-field-dependency')
const fetch 	= require('node-fetch');
const { getStandardFields }= require('../src/index.js');

const options = {
	fields: ['Account.Industry','Account.name','Lead.Industry']
}
const token = '00D09000007z6rW!ARQAQPCbHOmZyQZBZLS0tuz8_410nSjfE0_Cw4blNOa2Yddv1_Oa9uWtEyNqvadfNr_fIZGtr1jwunNvflVEkMUNWFBi8GX'
const url = 'https://dependencypt-dev-ed.my.salesforce.com'

let classes = ['01p0900000O1eD8AAJ','01p0900000O1eDDAAZ','01p0900000O1eDIAAZ','01p0900000O1eDNAAZ','01p0900000O1eQPAAZ','01p0900000O1eQUAAZ','01p0900000O1eI4AAJ','01p0900000O1ehAAAR','01p0900000O1ehFAAR']
let entryPoint

async function runExamples(){
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
			console.log(`Checking industry field in class: ${json.Name}`)
			let response = await getStandardFields(entryPoint, options);
			if(response != 'Nothing to analyse!!' && response.get('Account.Industry') && !response.get('Account.name') && !response.get('Lead.Industry')){
				console.log('All good!')
			}
			else {
				console.log(`Something went wrong ${entryPoint.classId}`)
			}
		}
		else {
			console.log(`Error on class: ${classes[i]}`)
		}
	}
}
	
runExamples();