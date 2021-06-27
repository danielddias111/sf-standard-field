const { getStandardFields }= require('../src/index.js');

const options = {
	fields: []
}

const entryPoint = {
	classId : '01p1j000006wwUd',
	token:'00D1j0000004adH!AQsAQIQH8UnVmNPAT1LDPdwd1kmXT7MTaNEa.fziqy668fDYs8XoFnK9GpTQ16RdqRKJnON_d2vgzMRIY7z16HJhlESuMuO6',
	url:'https://claranet--billingv3.my.salesforce.com'
}

async function runExample(){
    console.log('Checking standard fields...')
    let response = await getStandardFields(entryPoint, options);
    //let response = await getStandardFields(entryPoint); //options is "optional"
    console.log(response);
}

runExample();