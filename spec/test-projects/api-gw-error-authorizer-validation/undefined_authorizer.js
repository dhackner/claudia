/*global exports*/
exports.apiConfig = function () {
	'use strict';
	return {
		version: 2,
		authorizers: { first: { lambdaName: 'ln' } },
		routes: { echo: { 'GET' : { customAuthorizer: 'customA' } }}
	};
};
exports.router = function (event, context) {
	'use strict';
	context.succeed(event);
};
