const getStandardFields = require('./getStandardFields');

const options = {
	fields: ['lead.firstname', 'account.name', 'account.createdby']
}

const entryPoint = {
	classId : '01p0900000HIpun',
	token:'00D09000002VRMG!ARsAQMCmCM7pdqnWtzrPj0RtX7_D.B_fKFIIk5w0k5ILkKW6S3lE2Re7Ei09yWO_lJinryz2u44ha51c.6.I.9_BXVvW0B.S',
	url:'https://easy-deploy-dev-ed.my.salesforce.com'
}

getStandardFields(entryPoint, options);

