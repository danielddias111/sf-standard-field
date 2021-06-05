This library allows to check which standard fields are used in your apex code.

You need to pass an `entryPoint` with your class id, token and url and also you can pass an `options` object with a `fields` array with the object name and field name. 

If the `options` array is empty or not passed it will return a `Map` with the object name and the respective list of used fields. 
If the `options` object is passed it returns a map of field => boolean eg `{ 'orderitem.id' => false, 'opportunity.name' => true }`

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
    //let response = await getStandardFields(entryPoint); //options is "optional"
    console.log(response);
}

runExample();