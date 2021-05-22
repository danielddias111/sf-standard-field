const getStandardFields = require('./getStandardFields');

const options = {
	fields: ['opportunity.stagename']
}

const entryPoint = {
	classId : '01p0900000HIpun',
	token:'00D09000002VRMG!ARsAQL1h1sLb_a43NCmPN0l8l8ETh51FqZwMceBMGwAG97kA.J8uj7wzwe6RcLED72INGUqjS.GpJpQeSw2vRZ6YrtcAv9ph',
	url:'https://easy-deploy-dev-ed.my.salesforce.com'
}

getStandardFields(entryPoint, options);

