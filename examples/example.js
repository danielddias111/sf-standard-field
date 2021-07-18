const { getStandardFields }= require('../src/index.js');

const options = {
	fields: ['Field_to_Track__c.id', 'Object_to_Track__c.name','Object_to_Track__c.id','user.name','user.id']
}

const entryPoint = {
	classId : '',
	token:'00D09000002VRMG!ARsAQLYvrK8YxCmG3EJ2DtyB_s5Ho5roLFtiuZN5uBaHvTw0etHRR55jbSonZ.Q31HP_2bGrSpkiN.DJScb9bHggVfsYMa9X',
	url:'https://easy-deploy-dev-ed.my.salesforce.com'
}

let classes = ['01p0900000LfnXDAAZ','01p09000000JkNsAAK']

async function runExample(){
		for(let i=0; i< classes.length; i++){
			console.log('Checking standard fields... ' + classes[i])
			entryPoint.classId = classes[i]
			let response = await getStandardFields(entryPoint, options);
			console.log(response);
		}
}
	
runExample();