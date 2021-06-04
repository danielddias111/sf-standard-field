const { getStandardFields }= require('../src/index');

const options = {
	fields: []
}

const entryPoint = {
	classId : '01p0900000HIpun',
	token:'00D09000002VRMG!ARsAQB1_l0hS3cDMNt5RuIA0a.gUKgw7erw9PpJWnD5fJMqh7F1g3D4L5S_lJkb5OmgxDXxkmBU0zCCMS9.4wd8Wubuv3wpB',
	url:'https://easy-deploy-dev-ed.my.salesforce.com'
}

async function runExample(){

    console.log('Checking standard fields...')
    let response = await getStandardFields(entryPoint, options);
    //let response = await getStandardFields(entryPoint); //options is "optional"
    console.log(response);
}

runExample();