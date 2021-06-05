const { getStandardFields }= require('../src/index');

const options = {
	fields: []
}

const entryPoint = {
	classId : '01p0900000HIpun',
	token:'00D09000002VRMG!ARsAQJvpXAUkgk1alaDbCAAQ2J4G.a__fJ46ZBWFmduPHe1gP_FNdb6kmcaHJhqDjNyVQxb8rWTnHCjp38SqKRgVki_aZG8n',
	url:'https://easy-deploy-dev-ed.my.salesforce.com'
}

async function runExample(){

    console.log('Checking standard fields...')
    let response = await getStandardFields(entryPoint, options);
    //let response = await getStandardFields(entryPoint); //options is "optional"
    console.log(response);
}

runExample();