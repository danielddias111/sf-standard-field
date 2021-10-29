const { getStandardFields }= require('../src/index.js');

const options = {
	fields: ['Account.Industry','Account.name','Lead.Industry']
}

let classes = ['01p0900000O1eD8AAJ','01p0900000O1eDDAAZ','01p0900000O1eDIAAZ','01p0900000O1eDNAAZ','01p0900000O1eQPAAZ','01p0900000O1eQUAAZ','01p0900000O1eI4AAJ','01p0900000O1ehAAAR','01p0900000O1ehFAAR']

let entryPoint = {
	//classId : '',
	token:'00D09000007z6rW!ARQAQDLyk.mv5G4XLoGkicebSUZTz1_32hQgi162GVtub4uKAupSfWf12.wTe2M3835lDNqtBi1SKwGQilDbeIlL9g0KCyPk',
	url:'https://dependencypt-dev-ed.my.salesforce.com',
	SymbolTable:JSON.parse('{"constructors":[],"externalReferences":[],"id":"SOQLOrder","innerClasses":[],"interfaces":[],"key":"SOQLOrder","methods":[{"annotations":[],"location":{"column":24,"line":2},"modifiers":["static","public"],"name":"test","parameters":[],"references":[],"returnType":"void","type":null}],"name":"SOQLOrder","namespace":null,"parentClass":"","properties":[],"tableDeclaration":{"annotations":[],"location":{"column":14,"line":1},"modifiers":["public"],"name":"SOQLOrder","references":[],"type":"SOQLOrder"},"variables":[{"annotations":[],"location":{"column":23,"line":3},"modifiers":[],"name":"accList","references":[],"type":"List<Account>"}]}'),
	Body:'public class SOQLOrder {\n    public static void test(){\n        List<Account> accList = [select id from account order by industry];\n    }\n}'
}



async function runExample(){
		console.log('Checking standard fields... ' )
		//entryPoint.classId = classes[i]
		let response = await getStandardFields(entryPoint, options);
		console.log(response);
}
	
runExample();