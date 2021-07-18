const { getStandardFields }= require('../src/index.js');

const options = {
	fields: ['Field_to_Track__c.id']
}

const entryPoint = {
	classId : '01p09000000JkNsAAK',
	token:'00D09000002VRMG!ARsAQLYvrK8YxCmG3EJ2DtyB_s5Ho5roLFtiuZN5uBaHvTw0etHRR55jbSonZ.Q31HP_2bGrSpkiN.DJScb9bHggVfsYMa9X',
	url:'https://easy-deploy-dev-ed.my.salesforce.com'
}

async function runExample(){
    console.log('Checking standard fields...')
    let response = await getStandardFields(entryPoint, options);
    //let response = await getStandardFields(entryPoint); //options is "optional"
    console.log(response);
}

runExample();