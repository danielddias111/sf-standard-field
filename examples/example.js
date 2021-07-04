const { getStandardFields }= require('../src/index.js');

const options = {
	fields: ['SBQQ__Quote__c.name','account.id','Authorisation__c.id']
}

const entryPoint = {
	classId : '01p6900000FIQKV',
	token:'00D1j0000004adH!AQsAQCSYFpNG8np0R6arMUSXqRXCwDn5qHUCpWoq1vO9r4XPI_zBhlkFBij3jx5L4Ur7en8zIyz5yhwB0gTsNkYadKsxukDO',
	url:'https://claranet--billingv3.my.salesforce.com'
}

async function runExample(){
    console.log('Checking standard fields...')
    let response = await getStandardFields(entryPoint, options);
    //let response = await getStandardFields(entryPoint); //options is "optional"
    console.log(response);
}

runExample();