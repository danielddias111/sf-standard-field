const { getStandardFields }= require('../src/index.js');

const options = {
	fields: ['Account.Industry','Account.name','Lead.Industry']
}

const entryPoint = {
	classId : '',
	token:'00D09000007z6rW!ARQAQHcV8Yl11wdPHkZTql19n8zRmiOSayCr0sjS.m3bgzLrHmDr1sK4SeDjiyg28r8ygx_afpWxJ1O3IdHHYYOwkmXQ1.',
	url:'https://dependencypt-dev-ed.my.salesforce.com'
}

let classes = ['01p0900000O1eD8AAJ','01p0900000O1eDDAAZ','01p0900000O1eDIAAZ','01p0900000O1eDNAAZ','01p0900000O1eQPAAZ','01p0900000O1eQUAAZ','01p0900000O1eI4AAJ','01p0900000O1ehAAAR','01p0900000O1ehFAAR']

async function runExample(){
		for(let i=0; i< classes.length; i++){
			console.log('Checking standard fields... ' + classes[i])
			entryPoint.classId = classes[i]
			let response = await getStandardFields(entryPoint, options);
			console.log(response);
		}
}
	
runExample();