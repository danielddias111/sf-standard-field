const getStandardFields = require('./getStandardFields');

const options = {
	fields: []
}

const entryPoint = {
	classId : '01p0900000HIpun',
	token:'00D09000002VRMG!ARsAQCbg9j0mmJRe_NCqqx7pIovn5hlgAYpdr0AoBJiHS3w2qgXIxpGxoQWxX1NgE8lzIdoJo9dsdSfvhFKAhTO7SEY0xgDp',
	url:'https://easy-deploy-dev-ed.my.salesforce.com'
}

getStandardFields(entryPoint, options);

