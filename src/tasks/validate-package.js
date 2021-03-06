/*global module, require, console */
var path = require('path'),
	validAuthType = require('../util/valid-auth-type'),
	validCredentials = require('../util/valid-credentials');
module.exports = function validatePackage(dir, functionHandler, restApiModule) {
	'use strict';
	var handlerComponents = functionHandler && functionHandler.split('.'),
		apiModulePath = handlerComponents && handlerComponents[0],
		handlerMethod = handlerComponents && handlerComponents[1],
		apiModule, apiConfig;
	if (restApiModule) {
		apiModulePath = restApiModule;
		handlerMethod = 'router';
	}
	try {
		apiModule = require(path.join(dir, apiModulePath));
	} catch (e) {
		console.error(e.stack || e);
		throw 'cannot require ./' + apiModulePath + ' after npm install --production. Check your dependencies.';
	}
	if (!apiModule[handlerMethod]) {
		if (restApiModule) {
			throw apiModulePath + '.js does not export a Claudia API Builder instance';
		} else {
			throw apiModulePath + '.js does not export method ' + handlerMethod;
		}
	}
	if (restApiModule) {
		try {
			apiConfig = apiModule.apiConfig && apiModule.apiConfig();
		} catch (e) {
			throw apiModulePath + '.js does not configure any API methods -- loading error';
		}
		if (!apiConfig || !apiConfig.routes || !Object.keys(apiConfig.routes).length) {
			throw apiModulePath + '.js does not configure any API methods';
		}
		if (apiConfig.version && apiConfig.version > 2) {
			throw apiModulePath + '.js uses an unsupported API version. Upgrade your claudia installation';
		}
		Object.keys(apiConfig.routes).forEach(function (route) {
			var routeConfig = apiConfig.routes[route];
			Object.keys(routeConfig).forEach(function (method) {
				var methodConfig = routeConfig[method], routeMessage = apiModulePath + '.js ' + method + ' /' + route + ' ';
				if (methodConfig.success && methodConfig.success.headers) {
					if (Object.keys(methodConfig.success.headers).length === 0) {
						throw routeMessage + 'requests custom headers but does not enumerate any headers';
					}
				}
				if (methodConfig.error && methodConfig.error.headers) {
					if (Object.keys(methodConfig.error.headers).length === 0) {
						throw routeMessage + 'error template requests custom headers but does not enumerate any headers';
					}
					if (Array.isArray(methodConfig.error.headers)) {
						throw routeMessage + 'error template requests custom headers but does not provide defaults';
					}
				}
				if (methodConfig.customAuthorizer && (!apiConfig.authorizers || !apiConfig.authorizers[methodConfig.customAuthorizer])) {
					throw routeMessage + 'requests an undefined custom authorizer ' + methodConfig.customAuthorizer;
				}
				if (methodConfig.authorizationType && !validAuthType(methodConfig.authorizationType)) {
					throw routeMessage + 'authorization type ' + methodConfig.authorizationType + ' is invalid';
				}
				if (methodConfig.authorizationType && methodConfig.authorizationType !== 'CUSTOM' && methodConfig.customAuthorizer) {
					throw routeMessage + 'authorization type ' + methodConfig.authorizationType + ' is incompatible with custom authorizers';
				}
				if (methodConfig.invokeWithCredentials && !validCredentials(methodConfig.invokeWithCredentials)) {
					throw routeMessage + 'credentials have to be either an ARN or a boolean';
				}
				if (methodConfig.authorizationType && methodConfig.authorizationType !== 'AWS_IAM' && methodConfig.invokeWithCredentials) {
					throw routeMessage + 'authorization type ' + methodConfig.authorizationType + ' is incompatible with invokeWithCredentials';
				}
			});
		});
		if (apiConfig.authorizers) {
			Object.keys(apiConfig.authorizers).forEach(function (authorizerName) {
				var authorizer = apiConfig.authorizers[authorizerName],
					authorizerMessage =  apiModulePath + '.js authorizer ' + authorizerName + ' ';
				if (!authorizer.lambdaName && !authorizer.lambdaArn) {
					throw authorizerMessage + 'requires either lambdaName or lambdaArn';
				}
				if (authorizer.lambdaName && authorizer.lambdaArn) {
					throw authorizerMessage + 'is ambiguous - both lambdaName or lambdaArn are defined';
				}
				if (authorizer.lambdaVersion && (typeof authorizer.lambdaVersion !== 'boolean' && typeof authorizer.lambdaVersion !== 'string')) {
					throw authorizerMessage + 'lambdaVersion must be either string or true';
				}
				if (authorizer.lambdaVersion && authorizer.lambdaArn) {
					throw authorizerMessage + 'is ambiguous - cannot use lambdaVersion with lambdaArn';
				}
			});
		}
	}
	return dir;
};

