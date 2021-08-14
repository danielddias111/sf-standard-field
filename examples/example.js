const { getStandardFields }= require('../src/index.js');

const options = {
	fields: ['SBQQ__BundleRoot__c.Id']
}

const entryPoint = {
	classId : '',
	token:'00D1j0000004adH!AQsAQDmLF_VRYiRsbrpKagnsJAn19WnKYOU2PwcBsKaa3l9H4e.pXdDalBw1H6PAYJ48h7m7RFJg2TtcEaFl_LVcFWcEta9a',
	url:'https://claranet--billingv3.my.salesforce.com'
}

let classes = ['01p1j000006wwUeAAI']

async function runExample(){
		for(let i=0; i< classes.length; i++){
			console.log('Checking standard fields... ' + classes[i])
			entryPoint.classId = classes[i]
			let response = await getStandardFields(entryPoint, options);
			console.log(response);
		}
}
	
runExample();