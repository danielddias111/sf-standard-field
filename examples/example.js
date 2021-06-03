const getStandardFields = require('../src/index');

const options = {
	fields: ['orderitem.id', 'opportunity.name']
}

const entryPoint = {
	classId : '01p0900000HIpun',
	token:'00D09000002VRMG!ARsAQC0yazsn3fwmJBfXdSqCkvEib_N5M9Vzc91bQPHYjVqzH_5_WB..bfLZMjujpLtEKl0KhAZ5IFOaZc0LG9xlTEpHZy.d',
	url:'https://easy-deploy-dev-ed.my.salesforce.com'
}

async function runExample(){

    console.log('Checking standard fields...')
    let response = await getStandardFields(entryPoint, options);
    //let response = await getStandardFields(entryPoint); //options is "optional"
    console.log(response);
}

runExample();