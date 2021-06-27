const { getStandardFields }= require('../src/index.js');

const options = {
	fields: []
}

const entryPoint = {
	classId : '01p6900000FIQLF',
	token:'00D1j0000004adH!AQsAQG34Ny6bfYPmF4wREA4EYxB.2fteXloIrfZSBxjzsNv9S6LveyJwMznYwGbCEr8osxi439CrY7cbjh98A.hKLapaQOF3',
	url:'https://claranet--billingv3.my.salesforce.com'
}

async function runExample(){
    console.log('Checking standard fields...')
    let response = await getStandardFields(entryPoint, options);
    //let response = await getStandardFields(entryPoint); //options is "optional"
    console.log(response);
}

runExample();