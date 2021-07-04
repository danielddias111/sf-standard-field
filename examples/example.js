const { getStandardFields }= require('../src/index.js');

const options = {
	fields: ['SBQQ__Quote__c.name','account.id','Authorisation__c.id']
}

const entryPoint = {
	classId : '01p6900000FIQKV',
	token:'00D1j0000004adH!AQsAQCMpVw78lJIFXacBQsPj08JgTRwdlCvygDdGFShre32oBYvm5Pl9ANTthtN7GevcrUIP.SI9Nz5OTDCmSGI_ArZsuBff',
	url:'https://claranet--billingv3.my.salesforce.com'
}

async function runExample(){
    console.log('Checking standard fields...')
    let response = await getStandardFields(entryPoint, options);
    //let response = await getStandardFields(entryPoint); //options is "optional"
    console.log(response);
}

runExample();