This library allows to check which standard fields are used in your apex code.

You need to pass an `entryPoint` with your class id, token and url and an `options` object with a `fields` array with the object name and field name. 

The response returns a map of field => boolean eg `{ 'orderitem.id' => false, 'opportunity.name' => true }`

```Javascript
const {getStandardFields} = require('sf-standard-field-dependency')

const options = {
	fields: ['orderitem.id', 'opportunity.name']
}

const entryPoint = {
	classId : 'myClassId',
	token:'myToken',
	url:'https://myCustomURL.my.salesforce.com'
}

async function runExample(){
    console.log('Checking standard fields...')
    let response = await getStandardFields(entryPoint, options);
    console.log(response);
}

runExample();