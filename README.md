This library allows to check which standard fields are used in your apex code.

You need to pass an `entryPoint` with your token, url, SymbolTable and Class Body (You are able to fetch SymbolTable and Body calling `https://login.salesforce.com/services/data/v52.0/tooling/sobjects/ApexClass/classID`).

The response returns a map of fields used eg 
```Javascript
Map(3) {
  'lead' => [ 'industry' ],
  'account' => [ 'id', 'industry' ],
  'opportunity' => [ 'id' ]
}```

```Javascript
const {getStandardFields} = require('sf-standard-field-dependency')
const fetch 	= require('node-fetch');
const { getStandardFields }= require('../src/index.js');

const token = '00D09000007z6rW!ARQAQPCbHOmZyQZBZLS0tuz8_410nSjfE0_Cw4blNOa2Yddv1_Oa9uWtEyNqvadfNr_fIZGtr1jwunNvflVEkMUNW8GX'
const url = 'https://login.my.salesforce.com'

let classes = ['01p0900000O1eD8AAJ','01p0900000O1eDDAAZ']
let entryPoint

async function runExamples(){
	for(let i =0; i<classes.length; i++){
		let endpoint = `${url}/services/data/v52.0/tooling/sobjects/ApexClass/${classes[i]}`;
		let options = {
				headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${token}`
					}
		}    
		let response = await fetch(endpoint,options);
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
			let response = await getStandardFields(entryPoint);
			console.log(response)
		}
		else {
			console.log(`Error on class: ${classes[i]}`)
		}
	}
}
	
runExamples();