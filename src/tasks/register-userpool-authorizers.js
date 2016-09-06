/*global module, require */
var aws = require('aws-sdk'),
	Promise = require('bluebird'),
	promiseWrap = require('../util/promise-wrap'),
	retriableWrap = require('../util/retriable-wrap'),
	allowApiInvocation = require('./allow-api-invocation'),
	NullLogger = require('../util/null-logger'),
	getOwnerId = require('./get-owner-account-id');
module.exports = function registerUserPoolAuthorizers(authorizerMap, apiId, awsRegion, functionVersion, optionalLogger) {
	'use strict';
	var logger = optionalLogger || new NullLogger(),
		ownerId,
		apiGateway = retriableWrap(
			promiseWrap(
				new aws.APIGateway({region: awsRegion}),
				{log: logger.logApiCall, logName: 'apigateway', suffix: 'Async'}
			),
			function () {
				logger.logApiCall('rate-limited by AWS, waiting before retry');
			},
			/Async$/
		),
		removeAuthorizer = function (authConfig) {
			return apiGateway.deleteAuthorizerAsync({
				authorizerId: authConfig.id,
				restApiId: apiId
			});
		},
		configureAuthorizer = function (authConfig, authName) {
			var params = {
				identitySource: 'method.request.header.' + (authConfig.headerName || 'Authorization'),
				name: authName,
				restApiId: apiId,
				type: 'COGNITO_USER_POOLS',
			};
			if (authConfig.validationExpression) {
				params.identityValidationExpression = authConfig.validationExpression;
			}
			if (authConfig.credentials) {
				params.authorizerCredentials = authConfig.credentials;
			}
			if (authConfig.resultTtl) {
				params.authorizerResultTtlInSeconds = authConfig.resultTtl;
			}
			return params;
		},
		addAuthorizer = function (authName) {
			var authConfig = authorizerMap[authName];
      return apiGateway.createAuthorizerAsync(configureAuthorizer(authConfig, authName)).then(function (result) {
				return result.id;
			});
		},
		authorizerNames = Object.keys(authorizerMap);


	return apiGateway.getAuthorizersAsync({
		restApiId: apiId
	}).then(function (existingAuthorizers) {
		return Promise.map(existingAuthorizers.items, removeAuthorizer, {concurrency: 1});
	}).then(function () {
		return getOwnerId();
	}).then(function (accountId) {
		ownerId = accountId;
	}).then(function () {
		return Promise.map(authorizerNames, addAuthorizer, {concurrency: 1});
	}).then(function (creationResults) {
		var index,
			result = {};
		for (index = 0; index < authorizerNames.length; index++) {
			result[authorizerNames[index]] = creationResults[index];
		}
		return result;
	});
};
