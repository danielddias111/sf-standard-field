const getStandardFields = require('../src/index');

const options = {
	fields: ['testPablo__c.Id', 'account.industry', 'account.name', 'LEAD.FIRSTNAME', 'LEAD.industry','Lead.NotARealField']
}

const entryPoint = {
	classId : '01p3h00000FHIq5',
	token:'00D3h000005XLUw!AQkAQPdMhTi3H94c4TYQHg1VSq_eU2dKw9pOrjXv0YuXN4tIeVEi_J0W8SPpg.1Ulr81IE1jHUQJMRypuNYgmmXNIOhntpxv',
	url:'https://brave-raccoon-mm7crl-dev-ed.my.salesforce.com'
}

async function runExample(){

    console.log('Checking standard fields...')
    //let response = await getStandardFields(entryPoint, options);
    let response = await getStandardFields(entryPoint); //options is "optional"
    console.log(response);
}

runExample();