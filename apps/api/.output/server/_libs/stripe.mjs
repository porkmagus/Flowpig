import { i as __toESM, n as __exportAll } from "../_runtime.mjs";
import { t as require_lib } from "./qs+[...].mjs";
import * as crypto$2 from "crypto";
import { EventEmitter } from "events";
import * as https_ from "https";
import * as http_ from "http";
import { exec } from "child_process";
//#region ../../node_modules/stripe/esm/crypto/CryptoProvider.js
/**
* Interface encapsulating the various crypto computations used by the library,
* allowing pluggable underlying crypto implementations.
*/
var CryptoProvider = class {
	/**
	* Computes a SHA-256 HMAC given a secret and a payload (encoded in UTF-8).
	* The output HMAC should be encoded in hexadecimal.
	*
	* Sample values for implementations:
	* - computeHMACSignature('', 'test_secret') => 'f7f9bd47fb987337b5796fdc1fdb9ba221d0d5396814bfcaf9521f43fd8927fd'
	* - computeHMACSignature('\ud83d\ude00', 'test_secret') => '837da296d05c4fe31f61d5d7ead035099d9585a5bcde87de952012a78f0b0c43
	*/
	computeHMACSignature(payload, secret) {
		throw new Error("computeHMACSignature not implemented.");
	}
	/**
	* Asynchronous version of `computeHMACSignature`. Some implementations may
	* only allow support async signature computation.
	*
	* Computes a SHA-256 HMAC given a secret and a payload (encoded in UTF-8).
	* The output HMAC should be encoded in hexadecimal.
	*
	* Sample values for implementations:
	* - computeHMACSignature('', 'test_secret') => 'f7f9bd47fb987337b5796fdc1fdb9ba221d0d5396814bfcaf9521f43fd8927fd'
	* - computeHMACSignature('\ud83d\ude00', 'test_secret') => '837da296d05c4fe31f61d5d7ead035099d9585a5bcde87de952012a78f0b0c43
	*/
	computeHMACSignatureAsync(payload, secret) {
		throw new Error("computeHMACSignatureAsync not implemented.");
	}
};
/**
* If the crypto provider only supports asynchronous operations,
* throw CryptoProviderOnlySupportsAsyncError instead of
* a generic error so that the caller can choose to provide
* a more helpful error message to direct the user to use
* an asynchronous pathway.
*/
var CryptoProviderOnlySupportsAsyncError = class extends Error {};
//#endregion
//#region ../../node_modules/stripe/esm/crypto/NodeCryptoProvider.js
/**
* `CryptoProvider which uses the Node `crypto` package for its computations.
*/
var NodeCryptoProvider = class extends CryptoProvider {
	/** @override */
	computeHMACSignature(payload, secret) {
		return crypto$2.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
	}
	/** @override */
	async computeHMACSignatureAsync(payload, secret) {
		return await this.computeHMACSignature(payload, secret);
	}
};
//#endregion
//#region ../../node_modules/stripe/esm/net/HttpClient.js
/**
* Encapsulates the logic for issuing a request to the Stripe API.
*
* A custom HTTP client should should implement:
* 1. A response class which extends HttpClientResponse and wraps around their
*    own internal representation of a response.
* 2. A client class which extends HttpClient and implements all methods,
*    returning their own response class when making requests.
*/
var HttpClient = class HttpClient {
	/** The client name used for diagnostics. */
	getClientName() {
		throw new Error("getClientName not implemented.");
	}
	makeRequest(host, port, path, method, headers, requestData, protocol, timeout) {
		throw new Error("makeRequest not implemented.");
	}
	/** Helper to make a consistent timeout error across implementations. */
	static makeTimeoutError() {
		const timeoutErr = new TypeError(HttpClient.TIMEOUT_ERROR_CODE);
		timeoutErr.code = HttpClient.TIMEOUT_ERROR_CODE;
		return timeoutErr;
	}
};
HttpClient.CONNECTION_CLOSED_ERROR_CODES = ["ECONNRESET", "EPIPE"];
HttpClient.TIMEOUT_ERROR_CODE = "ETIMEDOUT";
var HttpClientResponse = class {
	constructor(statusCode, headers) {
		this._statusCode = statusCode;
		this._headers = headers;
	}
	getStatusCode() {
		return this._statusCode;
	}
	getHeaders() {
		return this._headers;
	}
	getRawResponse() {
		throw new Error("getRawResponse not implemented.");
	}
	toStream(streamCompleteCallback) {
		throw new Error("toStream not implemented.");
	}
	toJSON() {
		throw new Error("toJSON not implemented.");
	}
};
//#endregion
//#region ../../node_modules/stripe/esm/net/NodeHttpClient.js
const http = http_.default || http_;
const https = https_.default || https_;
const defaultHttpAgent = new http.Agent({ keepAlive: true });
const defaultHttpsAgent = new https.Agent({ keepAlive: true });
/**
* HTTP client which uses the Node `http` and `https` packages to issue
* requests.`
*/
var NodeHttpClient = class extends HttpClient {
	constructor(agent) {
		super();
		this._agent = agent;
	}
	/** @override. */
	getClientName() {
		return "node";
	}
	makeRequest(host, port, path, method, headers, requestData, protocol, timeout) {
		const isInsecureConnection = protocol === "http";
		let agent = this._agent;
		if (!agent) agent = isInsecureConnection ? defaultHttpAgent : defaultHttpsAgent;
		return new Promise((resolve, reject) => {
			const req = (isInsecureConnection ? http : https).request({
				host,
				port,
				path,
				method,
				agent,
				headers,
				ciphers: "DEFAULT:!aNULL:!eNULL:!LOW:!EXPORT:!SSLv2:!MD5"
			});
			req.setTimeout(timeout, () => {
				req.destroy(HttpClient.makeTimeoutError());
			});
			req.on("response", (res) => {
				resolve(new NodeHttpClientResponse(res));
			});
			req.on("error", (error) => {
				reject(error);
			});
			req.once("socket", (socket) => {
				if (socket.connecting) socket.once(isInsecureConnection ? "connect" : "secureConnect", () => {
					req.write(requestData);
					req.end();
				});
				else {
					req.write(requestData);
					req.end();
				}
			});
		});
	}
};
var NodeHttpClientResponse = class extends HttpClientResponse {
	constructor(res) {
		super(res.statusCode, res.headers || {});
		this._res = res;
	}
	getRawResponse() {
		return this._res;
	}
	toStream(streamCompleteCallback) {
		this._res.once("end", () => streamCompleteCallback());
		return this._res;
	}
	toJSON() {
		return new Promise((resolve, reject) => {
			let response = "";
			this._res.setEncoding("utf8");
			this._res.on("data", (chunk) => {
				response += chunk;
			});
			this._res.once("end", () => {
				try {
					resolve(JSON.parse(response));
				} catch (e) {
					reject(e);
				}
			});
		});
	}
};
//#endregion
//#region ../../node_modules/stripe/esm/net/FetchHttpClient.js
/**
* HTTP client which uses a `fetch` function to issue requests.
*
* By default relies on the global `fetch` function, but an optional function
* can be passed in. If passing in a function, it is expected to match the Web
* Fetch API. As an example, this could be the function provided by the
* node-fetch package (https://github.com/node-fetch/node-fetch).
*/
var FetchHttpClient = class FetchHttpClient extends HttpClient {
	constructor(fetchFn) {
		super();
		if (!fetchFn) {
			if (!globalThis.fetch) throw new Error("fetch() function not provided and is not defined in the global scope. You must provide a fetch implementation.");
			fetchFn = globalThis.fetch;
		}
		if (globalThis.AbortController) this._fetchFn = FetchHttpClient.makeFetchWithAbortTimeout(fetchFn);
		else this._fetchFn = FetchHttpClient.makeFetchWithRaceTimeout(fetchFn);
	}
	static makeFetchWithRaceTimeout(fetchFn) {
		return (url, init, timeout) => {
			let pendingTimeoutId;
			const timeoutPromise = new Promise((_, reject) => {
				pendingTimeoutId = setTimeout(() => {
					pendingTimeoutId = null;
					reject(HttpClient.makeTimeoutError());
				}, timeout);
			});
			const fetchPromise = fetchFn(url, init);
			return Promise.race([fetchPromise, timeoutPromise]).finally(() => {
				if (pendingTimeoutId) clearTimeout(pendingTimeoutId);
			});
		};
	}
	static makeFetchWithAbortTimeout(fetchFn) {
		return async (url, init, timeout) => {
			const abort = new AbortController();
			let timeoutId = setTimeout(() => {
				timeoutId = null;
				abort.abort(HttpClient.makeTimeoutError());
			}, timeout);
			try {
				return await fetchFn(url, Object.assign(Object.assign({}, init), { signal: abort.signal }));
			} catch (err) {
				if (err.name === "AbortError") throw HttpClient.makeTimeoutError();
				else throw err;
			} finally {
				if (timeoutId) clearTimeout(timeoutId);
			}
		};
	}
	/** @override. */
	getClientName() {
		return "fetch";
	}
	async makeRequest(host, port, path, method, headers, requestData, protocol, timeout) {
		const url = new URL(path, `${protocol === "http" ? "http" : "https"}://${host}`);
		url.port = port;
		const body = requestData || (method == "POST" || method == "PUT" || method == "PATCH" ? "" : void 0);
		return new FetchHttpClientResponse(await this._fetchFn(url.toString(), {
			method,
			headers,
			body
		}, timeout));
	}
};
var FetchHttpClientResponse = class FetchHttpClientResponse extends HttpClientResponse {
	constructor(res) {
		super(res.status, FetchHttpClientResponse._transformHeadersToObject(res.headers));
		this._res = res;
	}
	getRawResponse() {
		return this._res;
	}
	toStream(streamCompleteCallback) {
		streamCompleteCallback();
		return this._res.body;
	}
	toJSON() {
		return this._res.json();
	}
	static _transformHeadersToObject(headers) {
		const headersObj = {};
		for (const entry of headers) {
			if (!Array.isArray(entry) || entry.length != 2) throw new Error("Response objects produced by the fetch function given to FetchHttpClient do not have an iterable headers map. Response#headers should be an iterable object.");
			headersObj[entry[0]] = entry[1];
		}
		return headersObj;
	}
};
//#endregion
//#region ../../node_modules/stripe/esm/crypto/SubtleCryptoProvider.js
/**
* `CryptoProvider which uses the SubtleCrypto interface of the Web Crypto API.
*
* This only supports asynchronous operations.
*/
var SubtleCryptoProvider = class extends CryptoProvider {
	constructor(subtleCrypto) {
		super();
		this.subtleCrypto = subtleCrypto || crypto.subtle;
	}
	/** @override */
	computeHMACSignature(payload, secret) {
		throw new CryptoProviderOnlySupportsAsyncError("SubtleCryptoProvider cannot be used in a synchronous context.");
	}
	/** @override */
	async computeHMACSignatureAsync(payload, secret) {
		const encoder = new TextEncoder();
		const key = await this.subtleCrypto.importKey("raw", encoder.encode(secret), {
			name: "HMAC",
			hash: { name: "SHA-256" }
		}, false, ["sign"]);
		const signatureBuffer = await this.subtleCrypto.sign("hmac", key, encoder.encode(payload));
		const signatureBytes = new Uint8Array(signatureBuffer);
		const signatureHexCodes = new Array(signatureBytes.length);
		for (let i = 0; i < signatureBytes.length; i++) signatureHexCodes[i] = byteHexMapping[signatureBytes[i]];
		return signatureHexCodes.join("");
	}
};
const byteHexMapping = new Array(256);
for (let i = 0; i < byteHexMapping.length; i++) byteHexMapping[i] = i.toString(16).padStart(2, "0");
//#endregion
//#region ../../node_modules/stripe/esm/platform/PlatformFunctions.js
/**
* Interface encapsulating various utility functions whose
* implementations depend on the platform / JS runtime.
*/
var PlatformFunctions = class {
	constructor() {
		this._fetchFn = null;
		this._agent = null;
	}
	/**
	* Gets uname with Node's built-in `exec` function, if available.
	*/
	getUname() {
		throw new Error("getUname not implemented.");
	}
	/**
	* Generates a v4 UUID. See https://stackoverflow.com/a/2117523
	*/
	uuid4() {
		return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
			const r = Math.random() * 16 | 0;
			return (c === "x" ? r : r & 3 | 8).toString(16);
		});
	}
	/**
	* Compares strings in constant time.
	*/
	secureCompare(a, b) {
		if (a.length !== b.length) return false;
		const len = a.length;
		let result = 0;
		for (let i = 0; i < len; ++i) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
		return result === 0;
	}
	/**
	* Creates an event emitter.
	*/
	createEmitter() {
		throw new Error("createEmitter not implemented.");
	}
	/**
	* Checks if the request data is a stream. If so, read the entire stream
	* to a buffer and return the buffer.
	*/
	tryBufferData(data) {
		throw new Error("tryBufferData not implemented.");
	}
	/**
	* Creates an HTTP client which uses the Node `http` and `https` packages
	* to issue requests.
	*/
	createNodeHttpClient(agent) {
		throw new Error("createNodeHttpClient not implemented.");
	}
	/**
	* Creates an HTTP client for issuing Stripe API requests which uses the Web
	* Fetch API.
	*
	* A fetch function can optionally be passed in as a parameter. If none is
	* passed, will default to the default `fetch` function in the global scope.
	*/
	createFetchHttpClient(fetchFn) {
		return new FetchHttpClient(fetchFn);
	}
	/**
	* Creates an HTTP client using runtime-specific APIs.
	*/
	createDefaultHttpClient() {
		throw new Error("createDefaultHttpClient not implemented.");
	}
	/**
	* Creates a CryptoProvider which uses the Node `crypto` package for its computations.
	*/
	createNodeCryptoProvider() {
		throw new Error("createNodeCryptoProvider not implemented.");
	}
	/**
	* Creates a CryptoProvider which uses the SubtleCrypto interface of the Web Crypto API.
	*/
	createSubtleCryptoProvider(subtleCrypto) {
		return new SubtleCryptoProvider(subtleCrypto);
	}
	createDefaultCryptoProvider() {
		throw new Error("createDefaultCryptoProvider not implemented.");
	}
};
//#endregion
//#region ../../node_modules/stripe/esm/Error.js
var Error_exports = /* @__PURE__ */ __exportAll({
	StripeAPIError: () => StripeAPIError,
	StripeAuthenticationError: () => StripeAuthenticationError,
	StripeCardError: () => StripeCardError,
	StripeConnectionError: () => StripeConnectionError,
	StripeError: () => StripeError,
	StripeIdempotencyError: () => StripeIdempotencyError,
	StripeInvalidGrantError: () => StripeInvalidGrantError,
	StripeInvalidRequestError: () => StripeInvalidRequestError,
	StripePermissionError: () => StripePermissionError,
	StripeRateLimitError: () => StripeRateLimitError,
	StripeSignatureVerificationError: () => StripeSignatureVerificationError,
	StripeUnknownError: () => StripeUnknownError,
	generate: () => generate
});
const generate = (rawStripeError) => {
	switch (rawStripeError.type) {
		case "card_error": return new StripeCardError(rawStripeError);
		case "invalid_request_error": return new StripeInvalidRequestError(rawStripeError);
		case "api_error": return new StripeAPIError(rawStripeError);
		case "authentication_error": return new StripeAuthenticationError(rawStripeError);
		case "rate_limit_error": return new StripeRateLimitError(rawStripeError);
		case "idempotency_error": return new StripeIdempotencyError(rawStripeError);
		case "invalid_grant": return new StripeInvalidGrantError(rawStripeError);
		default: return new StripeUnknownError(rawStripeError);
	}
};
/**
* StripeError is the base error from which all other more specific Stripe errors derive.
* Specifically for errors returned from Stripe's REST API.
*/
var StripeError = class extends Error {
	constructor(raw = {}, type = null) {
		super(raw.message);
		this.type = type || this.constructor.name;
		this.raw = raw;
		this.rawType = raw.type;
		this.code = raw.code;
		this.doc_url = raw.doc_url;
		this.param = raw.param;
		this.detail = raw.detail;
		this.headers = raw.headers;
		this.requestId = raw.requestId;
		this.statusCode = raw.statusCode;
		this.message = raw.message;
		this.charge = raw.charge;
		this.decline_code = raw.decline_code;
		this.payment_intent = raw.payment_intent;
		this.payment_method = raw.payment_method;
		this.payment_method_type = raw.payment_method_type;
		this.setup_intent = raw.setup_intent;
		this.source = raw.source;
	}
};
/**
* Helper factory which takes raw stripe errors and outputs wrapping instances
*/
StripeError.generate = generate;
/**
* CardError is raised when a user enters a card that can't be charged for
* some reason.
*/
var StripeCardError = class extends StripeError {
	constructor(raw = {}) {
		super(raw, "StripeCardError");
	}
};
/**
* InvalidRequestError is raised when a request is initiated with invalid
* parameters.
*/
var StripeInvalidRequestError = class extends StripeError {
	constructor(raw = {}) {
		super(raw, "StripeInvalidRequestError");
	}
};
/**
* APIError is a generic error that may be raised in cases where none of the
* other named errors cover the problem. It could also be raised in the case
* that a new error has been introduced in the API, but this version of the
* Node.JS SDK doesn't know how to handle it.
*/
var StripeAPIError = class extends StripeError {
	constructor(raw = {}) {
		super(raw, "StripeAPIError");
	}
};
/**
* AuthenticationError is raised when invalid credentials are used to connect
* to Stripe's servers.
*/
var StripeAuthenticationError = class extends StripeError {
	constructor(raw = {}) {
		super(raw, "StripeAuthenticationError");
	}
};
/**
* PermissionError is raised in cases where access was attempted on a resource
* that wasn't allowed.
*/
var StripePermissionError = class extends StripeError {
	constructor(raw = {}) {
		super(raw, "StripePermissionError");
	}
};
/**
* RateLimitError is raised in cases where an account is putting too much load
* on Stripe's API servers (usually by performing too many requests). Please
* back off on request rate.
*/
var StripeRateLimitError = class extends StripeError {
	constructor(raw = {}) {
		super(raw, "StripeRateLimitError");
	}
};
/**
* StripeConnectionError is raised in the event that the SDK can't connect to
* Stripe's servers. That can be for a variety of different reasons from a
* downed network to a bad TLS certificate.
*/
var StripeConnectionError = class extends StripeError {
	constructor(raw = {}) {
		super(raw, "StripeConnectionError");
	}
};
/**
* SignatureVerificationError is raised when the signature verification for a
* webhook fails
*/
var StripeSignatureVerificationError = class extends StripeError {
	constructor(header, payload, raw = {}) {
		super(raw, "StripeSignatureVerificationError");
		this.header = header;
		this.payload = payload;
	}
};
/**
* IdempotencyError is raised in cases where an idempotency key was used
* improperly.
*/
var StripeIdempotencyError = class extends StripeError {
	constructor(raw = {}) {
		super(raw, "StripeIdempotencyError");
	}
};
/**
* InvalidGrantError is raised when a specified code doesn't exist, is
* expired, has been used, or doesn't belong to you; a refresh token doesn't
* exist, or doesn't belong to you; or if an API key's mode (live or test)
* doesn't match the mode of a code or refresh token.
*/
var StripeInvalidGrantError = class extends StripeError {
	constructor(raw = {}) {
		super(raw, "StripeInvalidGrantError");
	}
};
/**
* Any other error from Stripe not specifically captured above
*/
var StripeUnknownError = class extends StripeError {
	constructor(raw = {}) {
		super(raw, "StripeUnknownError");
	}
};
//#endregion
//#region ../../node_modules/stripe/esm/utils.js
var import_lib = /* @__PURE__ */ __toESM(require_lib(), 1);
const OPTIONS_KEYS = [
	"apiKey",
	"idempotencyKey",
	"stripeAccount",
	"apiVersion",
	"maxNetworkRetries",
	"timeout",
	"host"
];
function isOptionsHash(o) {
	return o && typeof o === "object" && OPTIONS_KEYS.some((prop) => Object.prototype.hasOwnProperty.call(o, prop));
}
/**
* Stringifies an Object, accommodating nested objects
* (forming the conventional key 'parent[child]=value')
*/
function stringifyRequestData(data) {
	return import_lib.stringify(data, { serializeDate: (d) => Math.floor(d.getTime() / 1e3).toString() }).replace(/%5B/g, "[").replace(/%5D/g, "]");
}
/**
* Outputs a new function with interpolated object property values.
* Use like so:
*   const fn = makeURLInterpolator('some/url/{param1}/{param2}');
*   fn({ param1: 123, param2: 456 }); // => 'some/url/123/456'
*/
const makeURLInterpolator = (() => {
	const rc = {
		"\n": "\\n",
		"\"": "\\\"",
		"\u2028": "\\u2028",
		"\u2029": "\\u2029"
	};
	return (str) => {
		const cleanString = str.replace(/["\n\r\u2028\u2029]/g, ($0) => rc[$0]);
		return (outputs) => {
			return cleanString.replace(/\{([\s\S]+?)\}/g, ($0, $1) => encodeURIComponent(outputs[$1] || ""));
		};
	};
})();
function extractUrlParams(path) {
	const params = path.match(/\{\w+\}/g);
	if (!params) return [];
	return params.map((param) => param.replace(/[{}]/g, ""));
}
/**
* Return the data argument from a list of arguments
*
* @param {object[]} args
* @returns {object}
*/
function getDataFromArgs(args) {
	if (!Array.isArray(args) || !args[0] || typeof args[0] !== "object") return {};
	if (!isOptionsHash(args[0])) return args.shift();
	const argKeys = Object.keys(args[0]);
	const optionKeysInArgs = argKeys.filter((key) => OPTIONS_KEYS.includes(key));
	if (optionKeysInArgs.length > 0 && optionKeysInArgs.length !== argKeys.length) emitWarning(`Options found in arguments (${optionKeysInArgs.join(", ")}). Did you mean to pass an options object? See https://github.com/stripe/stripe-node/wiki/Passing-Options.`);
	return {};
}
/**
* Return the options hash from a list of arguments
*/
function getOptionsFromArgs(args) {
	const opts = {
		auth: null,
		host: null,
		headers: {},
		settings: {}
	};
	if (args.length > 0) {
		const arg = args[args.length - 1];
		if (typeof arg === "string") opts.auth = args.pop();
		else if (isOptionsHash(arg)) {
			const params = Object.assign({}, args.pop());
			const extraKeys = Object.keys(params).filter((key) => !OPTIONS_KEYS.includes(key));
			if (extraKeys.length) emitWarning(`Invalid options found (${extraKeys.join(", ")}); ignoring.`);
			if (params.apiKey) opts.auth = params.apiKey;
			if (params.idempotencyKey) opts.headers["Idempotency-Key"] = params.idempotencyKey;
			if (params.stripeAccount) opts.headers["Stripe-Account"] = params.stripeAccount;
			if (params.apiVersion) opts.headers["Stripe-Version"] = params.apiVersion;
			if (Number.isInteger(params.maxNetworkRetries)) opts.settings.maxNetworkRetries = params.maxNetworkRetries;
			if (Number.isInteger(params.timeout)) opts.settings.timeout = params.timeout;
			if (params.host) opts.host = params.host;
		}
	}
	return opts;
}
/**
* Provide simple "Class" extension mechanism.
* <!-- Public API accessible via Stripe.StripeResource.extend -->
*/
function protoExtend(sub) {
	const Super = this;
	const Constructor = Object.prototype.hasOwnProperty.call(sub, "constructor") ? sub.constructor : function(...args) {
		Super.apply(this, args);
	};
	Object.assign(Constructor, Super);
	Constructor.prototype = Object.create(Super.prototype);
	Object.assign(Constructor.prototype, sub);
	return Constructor;
}
/**
* Remove empty values from an object
*/
function removeNullish(obj) {
	if (typeof obj !== "object") throw new Error("Argument must be an object");
	return Object.keys(obj).reduce((result, key) => {
		if (obj[key] != null) result[key] = obj[key];
		return result;
	}, {});
}
/**
* Normalize standard HTTP Headers:
* {'foo-bar': 'hi'}
* becomes
* {'Foo-Bar': 'hi'}
*/
function normalizeHeaders(obj) {
	if (!(obj && typeof obj === "object")) return obj;
	return Object.keys(obj).reduce((result, header) => {
		result[normalizeHeader(header)] = obj[header];
		return result;
	}, {});
}
/**
* Stolen from https://github.com/marten-de-vries/header-case-normalizer/blob/master/index.js#L36-L41
* without the exceptions which are irrelevant to us.
*/
function normalizeHeader(header) {
	return header.split("-").map((text) => text.charAt(0).toUpperCase() + text.substr(1).toLowerCase()).join("-");
}
function callbackifyPromiseWithTimeout(promise, callback) {
	if (callback) return promise.then((res) => {
		setTimeout(() => {
			callback(null, res);
		}, 0);
	}, (err) => {
		setTimeout(() => {
			callback(err, null);
		}, 0);
	});
	return promise;
}
/**
* Allow for special capitalization cases (such as OAuth)
*/
function pascalToCamelCase(name) {
	if (name === "OAuth") return "oauth";
	else return name[0].toLowerCase() + name.substring(1);
}
function emitWarning(warning) {
	if (typeof process.emitWarning !== "function") return console.warn(`Stripe: ${warning}`);
	return process.emitWarning(warning, "Stripe");
}
function isObject(obj) {
	const type = typeof obj;
	return (type === "function" || type === "object") && !!obj;
}
function flattenAndStringify(data) {
	const result = {};
	const step = (obj, prevKey) => {
		Object.entries(obj).forEach(([key, value]) => {
			const newKey = prevKey ? `${prevKey}[${key}]` : key;
			if (isObject(value)) if (!(value instanceof Uint8Array) && !Object.prototype.hasOwnProperty.call(value, "data")) return step(value, newKey);
			else result[newKey] = value;
			else result[newKey] = String(value);
		});
	};
	step(data, null);
	return result;
}
function validateInteger(name, n, defaultVal) {
	if (!Number.isInteger(n)) if (defaultVal !== void 0) return defaultVal;
	else throw new Error(`${name} must be an integer`);
	return n;
}
function determineProcessUserAgentProperties() {
	return typeof process === "undefined" ? {} : {
		lang_version: process.version,
		platform: process.platform
	};
}
/**
* Joins an array of Uint8Arrays into a single Uint8Array
*/
function concat(arrays) {
	const totalLength = arrays.reduce((len, array) => len + array.length, 0);
	const merged = new Uint8Array(totalLength);
	let offset = 0;
	arrays.forEach((array) => {
		merged.set(array, offset);
		offset += array.length;
	});
	return merged;
}
//#endregion
//#region ../../node_modules/stripe/esm/platform/NodePlatformFunctions.js
var StreamProcessingError = class extends StripeError {};
/**
* Specializes WebPlatformFunctions using APIs available in Node.js.
*/
var NodePlatformFunctions = class extends PlatformFunctions {
	constructor() {
		super();
		this._exec = exec;
		this._UNAME_CACHE = null;
	}
	/** @override */
	uuid4() {
		if (crypto$2.randomUUID) return crypto$2.randomUUID();
		return super.uuid4();
	}
	/**
	* @override
	* Node's built in `exec` function sometimes throws outright,
	* and sometimes has a callback with an error,
	* depending on the type of error.
	*
	* This unifies that interface by resolving with a null uname
	* if an error is encountered.
	*/
	getUname() {
		if (!this._UNAME_CACHE) this._UNAME_CACHE = new Promise((resolve, reject) => {
			try {
				this._exec("uname -a", (err, uname) => {
					if (err) return resolve(null);
					resolve(uname);
				});
			} catch (e) {
				resolve(null);
			}
		});
		return this._UNAME_CACHE;
	}
	/**
	* @override
	* Secure compare, from https://github.com/freewil/scmp
	*/
	secureCompare(a, b) {
		if (!a || !b) throw new Error("secureCompare must receive two arguments");
		if (a.length !== b.length) return false;
		if (crypto$2.timingSafeEqual) {
			const textEncoder = new TextEncoder();
			const aEncoded = textEncoder.encode(a);
			const bEncoded = textEncoder.encode(b);
			return crypto$2.timingSafeEqual(aEncoded, bEncoded);
		}
		return super.secureCompare(a, b);
	}
	createEmitter() {
		return new EventEmitter();
	}
	/** @override */
	tryBufferData(data) {
		if (!(data.file.data instanceof EventEmitter)) return Promise.resolve(data);
		const bufferArray = [];
		return new Promise((resolve, reject) => {
			data.file.data.on("data", (line) => {
				bufferArray.push(line);
			}).once("end", () => {
				const bufferData = Object.assign({}, data);
				bufferData.file.data = concat(bufferArray);
				resolve(bufferData);
			}).on("error", (err) => {
				reject(new StreamProcessingError({
					message: "An error occurred while attempting to process the file for upload.",
					detail: err
				}));
			});
		});
	}
	/** @override */
	createNodeHttpClient(agent) {
		return new NodeHttpClient(agent);
	}
	/** @override */
	createDefaultHttpClient() {
		return new NodeHttpClient();
	}
	/** @override */
	createNodeCryptoProvider() {
		return new NodeCryptoProvider();
	}
	/** @override */
	createDefaultCryptoProvider() {
		return this.createNodeCryptoProvider();
	}
};
//#endregion
//#region ../../node_modules/stripe/esm/RequestSender.js
const MAX_RETRY_AFTER_WAIT = 60;
var RequestSender = class RequestSender {
	constructor(stripe, maxBufferedRequestMetric) {
		this._stripe = stripe;
		this._maxBufferedRequestMetric = maxBufferedRequestMetric;
	}
	_addHeadersDirectlyToObject(obj, headers) {
		obj.requestId = headers["request-id"];
		obj.stripeAccount = obj.stripeAccount || headers["stripe-account"];
		obj.apiVersion = obj.apiVersion || headers["stripe-version"];
		obj.idempotencyKey = obj.idempotencyKey || headers["idempotency-key"];
	}
	_makeResponseEvent(requestEvent, statusCode, headers) {
		const requestEndTime = Date.now();
		const requestDurationMs = requestEndTime - requestEvent.request_start_time;
		return removeNullish({
			api_version: headers["stripe-version"],
			account: headers["stripe-account"],
			idempotency_key: headers["idempotency-key"],
			method: requestEvent.method,
			path: requestEvent.path,
			status: statusCode,
			request_id: this._getRequestId(headers),
			elapsed: requestDurationMs,
			request_start_time: requestEvent.request_start_time,
			request_end_time: requestEndTime
		});
	}
	_getRequestId(headers) {
		return headers["request-id"];
	}
	/**
	* Used by methods with spec.streaming === true. For these methods, we do not
	* buffer successful responses into memory or do parse them into stripe
	* objects, we delegate that all of that to the user and pass back the raw
	* http.Response object to the callback.
	*
	* (Unsuccessful responses shouldn't make it here, they should
	* still be buffered/parsed and handled by _jsonResponseHandler -- see
	* makeRequest)
	*/
	_streamingResponseHandler(requestEvent, usage, callback) {
		return (res) => {
			const headers = res.getHeaders();
			const streamCompleteCallback = () => {
				const responseEvent = this._makeResponseEvent(requestEvent, res.getStatusCode(), headers);
				this._stripe._emitter.emit("response", responseEvent);
				this._recordRequestMetrics(this._getRequestId(headers), responseEvent.elapsed, usage);
			};
			const stream = res.toStream(streamCompleteCallback);
			this._addHeadersDirectlyToObject(stream, headers);
			return callback(null, stream);
		};
	}
	/**
	* Default handler for Stripe responses. Buffers the response into memory,
	* parses the JSON and returns it (i.e. passes it to the callback) if there
	* is no "error" field. Otherwise constructs/passes an appropriate Error.
	*/
	_jsonResponseHandler(requestEvent, usage, callback) {
		return (res) => {
			const headers = res.getHeaders();
			const requestId = this._getRequestId(headers);
			const statusCode = res.getStatusCode();
			const responseEvent = this._makeResponseEvent(requestEvent, statusCode, headers);
			this._stripe._emitter.emit("response", responseEvent);
			res.toJSON().then((jsonResponse) => {
				if (jsonResponse.error) {
					let err;
					if (typeof jsonResponse.error === "string") jsonResponse.error = {
						type: jsonResponse.error,
						message: jsonResponse.error_description
					};
					jsonResponse.error.headers = headers;
					jsonResponse.error.statusCode = statusCode;
					jsonResponse.error.requestId = requestId;
					if (statusCode === 401) err = new StripeAuthenticationError(jsonResponse.error);
					else if (statusCode === 403) err = new StripePermissionError(jsonResponse.error);
					else if (statusCode === 429) err = new StripeRateLimitError(jsonResponse.error);
					else err = StripeError.generate(jsonResponse.error);
					throw err;
				}
				return jsonResponse;
			}, (e) => {
				throw new StripeAPIError({
					message: "Invalid JSON received from the Stripe API",
					exception: e,
					requestId: headers["request-id"]
				});
			}).then((jsonResponse) => {
				this._recordRequestMetrics(requestId, responseEvent.elapsed, usage);
				const rawResponse = res.getRawResponse();
				this._addHeadersDirectlyToObject(rawResponse, headers);
				Object.defineProperty(jsonResponse, "lastResponse", {
					enumerable: false,
					writable: false,
					value: rawResponse
				});
				callback(null, jsonResponse);
			}, (e) => callback(e, null));
		};
	}
	static _generateConnectionErrorMessage(requestRetries) {
		return `An error occurred with our connection to Stripe.${requestRetries > 0 ? ` Request was retried ${requestRetries} times.` : ""}`;
	}
	static _shouldRetry(res, numRetries, maxRetries, error) {
		if (error && numRetries === 0 && HttpClient.CONNECTION_CLOSED_ERROR_CODES.includes(error.code)) return true;
		if (numRetries >= maxRetries) return false;
		if (!res) return true;
		if (res.getHeaders()["stripe-should-retry"] === "false") return false;
		if (res.getHeaders()["stripe-should-retry"] === "true") return true;
		if (res.getStatusCode() === 409) return true;
		if (res.getStatusCode() >= 500) return true;
		return false;
	}
	_getSleepTimeInMS(numRetries, retryAfter = null) {
		const initialNetworkRetryDelay = this._stripe.getInitialNetworkRetryDelay();
		const maxNetworkRetryDelay = this._stripe.getMaxNetworkRetryDelay();
		let sleepSeconds = Math.min(initialNetworkRetryDelay * Math.pow(numRetries - 1, 2), maxNetworkRetryDelay);
		sleepSeconds *= .5 * (1 + Math.random());
		sleepSeconds = Math.max(initialNetworkRetryDelay, sleepSeconds);
		if (Number.isInteger(retryAfter) && retryAfter <= MAX_RETRY_AFTER_WAIT) sleepSeconds = Math.max(sleepSeconds, retryAfter);
		return sleepSeconds * 1e3;
	}
	_getMaxNetworkRetries(settings = {}) {
		return settings.maxNetworkRetries !== void 0 && Number.isInteger(settings.maxNetworkRetries) ? settings.maxNetworkRetries : this._stripe.getMaxNetworkRetries();
	}
	_defaultIdempotencyKey(method, settings) {
		const maxRetries = this._getMaxNetworkRetries(settings);
		if (method === "POST" && maxRetries > 0) return `stripe-node-retry-${this._stripe._platformFunctions.uuid4()}`;
		return null;
	}
	_makeHeaders(auth, contentLength, apiVersion, clientUserAgent, method, userSuppliedHeaders, userSuppliedSettings) {
		const defaultHeaders = {
			Authorization: auth ? `Bearer ${auth}` : this._stripe.getApiField("auth"),
			Accept: "application/json",
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": this._getUserAgentString(),
			"X-Stripe-Client-User-Agent": clientUserAgent,
			"X-Stripe-Client-Telemetry": this._getTelemetryHeader(),
			"Stripe-Version": apiVersion,
			"Stripe-Account": this._stripe.getApiField("stripeAccount"),
			"Idempotency-Key": this._defaultIdempotencyKey(method, userSuppliedSettings)
		};
		const methodHasPayload = method == "POST" || method == "PUT" || method == "PATCH";
		if (methodHasPayload || contentLength) {
			if (!methodHasPayload) emitWarning(`${method} method had non-zero contentLength but no payload is expected for this verb`);
			defaultHeaders["Content-Length"] = contentLength;
		}
		return Object.assign(removeNullish(defaultHeaders), normalizeHeaders(userSuppliedHeaders));
	}
	_getUserAgentString() {
		return `Stripe/v1 NodeBindings/${this._stripe.getConstant("PACKAGE_VERSION")} ${this._stripe._appInfo ? this._stripe.getAppInfoAsString() : ""}`.trim();
	}
	_getTelemetryHeader() {
		if (this._stripe.getTelemetryEnabled() && this._stripe._prevRequestMetrics.length > 0) {
			const metrics = this._stripe._prevRequestMetrics.shift();
			return JSON.stringify({ last_request_metrics: metrics });
		}
	}
	_recordRequestMetrics(requestId, requestDurationMs, usage) {
		if (this._stripe.getTelemetryEnabled() && requestId) if (this._stripe._prevRequestMetrics.length > this._maxBufferedRequestMetric) emitWarning("Request metrics buffer is full, dropping telemetry message.");
		else {
			const m = {
				request_id: requestId,
				request_duration_ms: requestDurationMs
			};
			if (usage && usage.length > 0) m.usage = usage;
			this._stripe._prevRequestMetrics.push(m);
		}
	}
	_request(method, host, path, data, auth, options = {}, usage = [], callback, requestDataProcessor = null) {
		let requestData;
		const retryRequest = (requestFn, apiVersion, headers, requestRetries, retryAfter) => {
			return setTimeout(requestFn, this._getSleepTimeInMS(requestRetries, retryAfter), apiVersion, headers, requestRetries + 1);
		};
		const makeRequest = (apiVersion, headers, numRetries) => {
			const timeout = options.settings && options.settings.timeout && Number.isInteger(options.settings.timeout) && options.settings.timeout >= 0 ? options.settings.timeout : this._stripe.getApiField("timeout");
			const req = this._stripe.getApiField("httpClient").makeRequest(host || this._stripe.getApiField("host"), this._stripe.getApiField("port"), path, method, headers, requestData, this._stripe.getApiField("protocol"), timeout);
			const requestStartTime = Date.now();
			const requestEvent = removeNullish({
				api_version: apiVersion,
				account: headers["Stripe-Account"],
				idempotency_key: headers["Idempotency-Key"],
				method,
				path,
				request_start_time: requestStartTime
			});
			const requestRetries = numRetries || 0;
			const maxRetries = this._getMaxNetworkRetries(options.settings || {});
			this._stripe._emitter.emit("request", requestEvent);
			req.then((res) => {
				if (RequestSender._shouldRetry(res, requestRetries, maxRetries)) return retryRequest(makeRequest, apiVersion, headers, requestRetries, res.getHeaders()["retry-after"]);
				else if (options.streaming && res.getStatusCode() < 400) return this._streamingResponseHandler(requestEvent, usage, callback)(res);
				else return this._jsonResponseHandler(requestEvent, usage, callback)(res);
			}).catch((error) => {
				if (RequestSender._shouldRetry(null, requestRetries, maxRetries, error)) return retryRequest(makeRequest, apiVersion, headers, requestRetries, null);
				else return callback(new StripeConnectionError({
					message: error.code && error.code === HttpClient.TIMEOUT_ERROR_CODE ? `Request aborted due to timeout being reached (${timeout}ms)` : RequestSender._generateConnectionErrorMessage(requestRetries),
					detail: error
				}));
			});
		};
		const prepareAndMakeRequest = (error, data) => {
			if (error) return callback(error);
			requestData = data;
			this._stripe.getClientUserAgent((clientUserAgent) => {
				var _a, _b;
				const apiVersion = this._stripe.getApiField("version");
				makeRequest(apiVersion, this._makeHeaders(auth, requestData.length, apiVersion, clientUserAgent, method, (_a = options.headers) !== null && _a !== void 0 ? _a : null, (_b = options.settings) !== null && _b !== void 0 ? _b : {}), 0);
			});
		};
		if (requestDataProcessor) requestDataProcessor(method, data, options.headers, prepareAndMakeRequest);
		else prepareAndMakeRequest(null, stringifyRequestData(data || {}));
	}
};
//#endregion
//#region ../../node_modules/stripe/esm/autoPagination.js
var StripeIterator = class {
	constructor(firstPagePromise, requestArgs, spec, stripeResource) {
		this.index = 0;
		this.pagePromise = firstPagePromise;
		this.promiseCache = { currentPromise: null };
		this.requestArgs = requestArgs;
		this.spec = spec;
		this.stripeResource = stripeResource;
	}
	async iterate(pageResult) {
		if (!(pageResult && pageResult.data && typeof pageResult.data.length === "number")) throw Error("Unexpected: Stripe API response does not have a well-formed `data` array.");
		const reverseIteration = isReverseIteration(this.requestArgs);
		if (this.index < pageResult.data.length) {
			const idx = reverseIteration ? pageResult.data.length - 1 - this.index : this.index;
			const value = pageResult.data[idx];
			this.index += 1;
			return {
				value,
				done: false
			};
		} else if (pageResult.has_more) {
			this.index = 0;
			this.pagePromise = this.getNextPage(pageResult);
			const nextPageResult = await this.pagePromise;
			return this.iterate(nextPageResult);
		}
		return {
			done: true,
			value: void 0
		};
	}
	/** @abstract */
	getNextPage(_pageResult) {
		throw new Error("Unimplemented");
	}
	async _next() {
		return this.iterate(await this.pagePromise);
	}
	next() {
		/**
		* If a user calls `.next()` multiple times in parallel,
		* return the same result until something has resolved
		* to prevent page-turning race conditions.
		*/
		if (this.promiseCache.currentPromise) return this.promiseCache.currentPromise;
		const nextPromise = (async () => {
			const ret = await this._next();
			this.promiseCache.currentPromise = null;
			return ret;
		})();
		this.promiseCache.currentPromise = nextPromise;
		return nextPromise;
	}
};
var ListIterator = class extends StripeIterator {
	getNextPage(pageResult) {
		const reverseIteration = isReverseIteration(this.requestArgs);
		const lastId = getLastId(pageResult, reverseIteration);
		return this.stripeResource._makeRequest(this.requestArgs, this.spec, { [reverseIteration ? "ending_before" : "starting_after"]: lastId });
	}
};
var SearchIterator = class extends StripeIterator {
	getNextPage(pageResult) {
		if (!pageResult.next_page) throw Error("Unexpected: Stripe API response does not have a well-formed `next_page` field, but `has_more` was true.");
		return this.stripeResource._makeRequest(this.requestArgs, this.spec, { page: pageResult.next_page });
	}
};
const makeAutoPaginationMethods = (stripeResource, requestArgs, spec, firstPagePromise) => {
	if (spec.methodType === "search") return makeAutoPaginationMethodsFromIterator(new SearchIterator(firstPagePromise, requestArgs, spec, stripeResource));
	if (spec.methodType === "list") return makeAutoPaginationMethodsFromIterator(new ListIterator(firstPagePromise, requestArgs, spec, stripeResource));
	return null;
};
const makeAutoPaginationMethodsFromIterator = (iterator) => {
	const autoPagingEach = makeAutoPagingEach((...args) => iterator.next(...args));
	const autoPaginationMethods = {
		autoPagingEach,
		autoPagingToArray: makeAutoPagingToArray(autoPagingEach),
		next: () => iterator.next(),
		return: () => {
			return {};
		},
		[getAsyncIteratorSymbol()]: () => {
			return autoPaginationMethods;
		}
	};
	return autoPaginationMethods;
};
/**
* ----------------
* Private Helpers:
* ----------------
*/
function getAsyncIteratorSymbol() {
	if (typeof Symbol !== "undefined" && Symbol.asyncIterator) return Symbol.asyncIterator;
	return "@@asyncIterator";
}
function getDoneCallback(args) {
	if (args.length < 2) return null;
	const onDone = args[1];
	if (typeof onDone !== "function") throw Error(`The second argument to autoPagingEach, if present, must be a callback function; received ${typeof onDone}`);
	return onDone;
}
/**
* We allow four forms of the `onItem` callback (the middle two being equivalent),
*
*   1. `.autoPagingEach((item) => { doSomething(item); return false; });`
*   2. `.autoPagingEach(async (item) => { await doSomething(item); return false; });`
*   3. `.autoPagingEach((item) => doSomething(item).then(() => false));`
*   4. `.autoPagingEach((item, next) => { doSomething(item); next(false); });`
*
* In addition to standard validation, this helper
* coalesces the former forms into the latter form.
*/
function getItemCallback(args) {
	if (args.length === 0) return;
	const onItem = args[0];
	if (typeof onItem !== "function") throw Error(`The first argument to autoPagingEach, if present, must be a callback function; received ${typeof onItem}`);
	if (onItem.length === 2) return onItem;
	if (onItem.length > 2) throw Error(`The \`onItem\` callback function passed to autoPagingEach must accept at most two arguments; got ${onItem}`);
	return function _onItem(item, next) {
		next(onItem(item));
	};
}
function getLastId(listResult, reverseIteration) {
	const lastIdx = reverseIteration ? 0 : listResult.data.length - 1;
	const lastItem = listResult.data[lastIdx];
	const lastId = lastItem && lastItem.id;
	if (!lastId) throw Error("Unexpected: No `id` found on the last item while auto-paging a list.");
	return lastId;
}
function makeAutoPagingEach(asyncIteratorNext) {
	return function autoPagingEach() {
		const args = [].slice.call(arguments);
		const onItem = getItemCallback(args);
		const onDone = getDoneCallback(args);
		if (args.length > 2) throw Error(`autoPagingEach takes up to two arguments; received ${args}`);
		return callbackifyPromiseWithTimeout(wrapAsyncIteratorWithCallback(asyncIteratorNext, onItem), onDone);
	};
}
function makeAutoPagingToArray(autoPagingEach) {
	return function autoPagingToArray(opts, onDone) {
		const limit = opts && opts.limit;
		if (!limit) throw Error("You must pass a `limit` option to autoPagingToArray, e.g., `autoPagingToArray({limit: 1000});`.");
		if (limit > 1e4) throw Error("You cannot specify a limit of more than 10,000 items to fetch in `autoPagingToArray`; use `autoPagingEach` to iterate through longer lists.");
		return callbackifyPromiseWithTimeout(new Promise((resolve, reject) => {
			const items = [];
			autoPagingEach((item) => {
				items.push(item);
				if (items.length >= limit) return false;
			}).then(() => {
				resolve(items);
			}).catch(reject);
		}), onDone);
	};
}
function wrapAsyncIteratorWithCallback(asyncIteratorNext, onItem) {
	return new Promise((resolve, reject) => {
		function handleIteration(iterResult) {
			if (iterResult.done) {
				resolve();
				return;
			}
			const item = iterResult.value;
			return new Promise((next) => {
				onItem(item, next);
			}).then((shouldContinue) => {
				if (shouldContinue === false) return handleIteration({
					done: true,
					value: void 0
				});
				else return asyncIteratorNext().then(handleIteration);
			});
		}
		asyncIteratorNext().then(handleIteration).catch(reject);
	});
}
function isReverseIteration(requestArgs) {
	return !!getDataFromArgs([].slice.call(requestArgs)).ending_before;
}
//#endregion
//#region ../../node_modules/stripe/esm/StripeMethod.js
/**
* Create an API method from the declared spec.
*
* @param [spec.method='GET'] Request Method (POST, GET, DELETE, PUT)
* @param [spec.path=''] Path to be appended to the API BASE_PATH, joined with
*  the instance's path (e.g. 'charges' or 'customers')
* @param [spec.fullPath=''] Fully qualified path to the method (eg. /v1/a/b/c).
*  If this is specified, path should not be specified.
* @param [spec.urlParams=[]] Array of required arguments in the order that they
*  must be passed by the consumer of the API. Subsequent optional arguments are
*  optionally passed through a hash (Object) as the penultimate argument
*  (preceding the also-optional callback argument
* @param [spec.encode] Function for mutating input parameters to a method.
*  Usefully for applying transforms to data on a per-method basis.
* @param [spec.host] Hostname for the request.
*
* <!-- Public API accessible via Stripe.StripeResource.method -->
*/
function stripeMethod$117(spec) {
	if (spec.path !== void 0 && spec.fullPath !== void 0) throw new Error(`Method spec specified both a 'path' (${spec.path}) and a 'fullPath' (${spec.fullPath}).`);
	return function(...args) {
		const callback = typeof args[args.length - 1] == "function" && args.pop();
		spec.urlParams = extractUrlParams(spec.fullPath || this.createResourcePathWithSymbols(spec.path || ""));
		const requestPromise = callbackifyPromiseWithTimeout(this._makeRequest(args, spec, {}), callback);
		Object.assign(requestPromise, makeAutoPaginationMethods(this, args, spec, requestPromise));
		return requestPromise;
	};
}
//#endregion
//#region ../../node_modules/stripe/esm/StripeResource.js
StripeResource.extend = protoExtend;
StripeResource.method = stripeMethod$117;
StripeResource.MAX_BUFFERED_REQUEST_METRICS = 100;
/**
* Encapsulates request logic for a Stripe Resource
*/
function StripeResource(stripe, deprecatedUrlData) {
	this._stripe = stripe;
	if (deprecatedUrlData) throw new Error("Support for curried url params was dropped in stripe-node v7.0.0. Instead, pass two ids.");
	this.basePath = makeURLInterpolator(this.basePath || stripe.getApiField("basePath"));
	this.resourcePath = this.path;
	this.path = makeURLInterpolator(this.path);
	this.initialize(...arguments);
}
StripeResource.prototype = {
	_stripe: null,
	path: "",
	resourcePath: "",
	basePath: null,
	initialize() {},
	requestDataProcessor: null,
	validateRequest: null,
	createFullPath(commandPath, urlData) {
		const urlParts = [this.basePath(urlData), this.path(urlData)];
		if (typeof commandPath === "function") {
			const computedCommandPath = commandPath(urlData);
			if (computedCommandPath) urlParts.push(computedCommandPath);
		} else urlParts.push(commandPath);
		return this._joinUrlParts(urlParts);
	},
	createResourcePathWithSymbols(pathWithSymbols) {
		if (pathWithSymbols) return `/${this._joinUrlParts([this.resourcePath, pathWithSymbols])}`;
		else return `/${this.resourcePath}`;
	},
	_joinUrlParts(parts) {
		return parts.join("/").replace(/\/{2,}/g, "/");
	},
	_getRequestOpts(requestArgs, spec, overrideData) {
		const requestMethod = (spec.method || "GET").toUpperCase();
		const usage = spec.usage || [];
		const urlParams = spec.urlParams || [];
		const encode = spec.encode || ((data) => data);
		const isUsingFullPath = !!spec.fullPath;
		const commandPath = makeURLInterpolator(isUsingFullPath ? spec.fullPath : spec.path || "");
		const path = isUsingFullPath ? spec.fullPath : this.createResourcePathWithSymbols(spec.path);
		const args = [].slice.call(requestArgs);
		const urlData = urlParams.reduce((urlData, param) => {
			const arg = args.shift();
			if (typeof arg !== "string") throw new Error(`Stripe: Argument "${param}" must be a string, but got: ${arg} (on API request to \`${requestMethod} ${path}\`)`);
			urlData[param] = arg;
			return urlData;
		}, {});
		const dataFromArgs = getDataFromArgs(args);
		const data = encode(Object.assign({}, dataFromArgs, overrideData));
		const options = getOptionsFromArgs(args);
		const host = options.host || spec.host;
		const streaming = !!spec.streaming;
		if (args.filter((x) => x != null).length) throw new Error(`Stripe: Unknown arguments (${args}). Did you mean to pass an options object? See https://github.com/stripe/stripe-node/wiki/Passing-Options. (on API request to ${requestMethod} \`${path}\`)`);
		const requestPath = isUsingFullPath ? commandPath(urlData) : this.createFullPath(commandPath, urlData);
		const headers = Object.assign(options.headers, spec.headers);
		if (spec.validator) spec.validator(data, { headers });
		const dataInQuery = spec.method === "GET" || spec.method === "DELETE";
		return {
			requestMethod,
			requestPath,
			bodyData: dataInQuery ? null : data,
			queryData: dataInQuery ? data : {},
			auth: options.auth,
			headers,
			host: host !== null && host !== void 0 ? host : null,
			streaming,
			settings: options.settings,
			usage
		};
	},
	_makeRequest(requestArgs, spec, overrideData) {
		return new Promise((resolve, reject) => {
			var _a;
			let opts;
			try {
				opts = this._getRequestOpts(requestArgs, spec, overrideData);
			} catch (err) {
				reject(err);
				return;
			}
			function requestCallback(err, response) {
				if (err) reject(err);
				else resolve(spec.transformResponseData ? spec.transformResponseData(response) : response);
			}
			const emptyQuery = Object.keys(opts.queryData).length === 0;
			const path = [
				opts.requestPath,
				emptyQuery ? "" : "?",
				stringifyRequestData(opts.queryData)
			].join("");
			const { headers, settings } = opts;
			this._stripe._requestSender._request(opts.requestMethod, opts.host, path, opts.bodyData, opts.auth, {
				headers,
				settings,
				streaming: opts.streaming
			}, opts.usage, requestCallback, (_a = this.requestDataProcessor) === null || _a === void 0 ? void 0 : _a.bind(this));
		});
	}
};
//#endregion
//#region ../../node_modules/stripe/esm/Webhooks.js
function createWebhooks(platformFunctions) {
	const Webhook = {
		DEFAULT_TOLERANCE: 300,
		signature: null,
		constructEvent(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
			try {
				this.signature.verifyHeader(payload, header, secret, tolerance || Webhook.DEFAULT_TOLERANCE, cryptoProvider, receivedAt);
			} catch (e) {
				if (e instanceof CryptoProviderOnlySupportsAsyncError) e.message += "\nUse `await constructEventAsync(...)` instead of `constructEvent(...)`";
				throw e;
			}
			return payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
		},
		async constructEventAsync(payload, header, secret, tolerance, cryptoProvider, receivedAt) {
			await this.signature.verifyHeaderAsync(payload, header, secret, tolerance || Webhook.DEFAULT_TOLERANCE, cryptoProvider, receivedAt);
			return payload instanceof Uint8Array ? JSON.parse(new TextDecoder("utf8").decode(payload)) : JSON.parse(payload);
		},
		generateTestHeaderString: function(opts) {
			const preparedOpts = prepareOptions(opts);
			const signature = preparedOpts.signature || preparedOpts.cryptoProvider.computeHMACSignature(preparedOpts.payloadString, preparedOpts.secret);
			return preparedOpts.generateHeaderString(signature);
		},
		generateTestHeaderStringAsync: async function(opts) {
			const preparedOpts = prepareOptions(opts);
			const signature = preparedOpts.signature || await preparedOpts.cryptoProvider.computeHMACSignatureAsync(preparedOpts.payloadString, preparedOpts.secret);
			return preparedOpts.generateHeaderString(signature);
		}
	};
	const signature = {
		EXPECTED_SCHEME: "v1",
		verifyHeader(encodedPayload, encodedHeader, secret, tolerance, cryptoProvider, receivedAt) {
			const { decodedHeader: header, decodedPayload: payload, details, suspectPayloadType } = parseEventDetails(encodedPayload, encodedHeader, this.EXPECTED_SCHEME);
			const secretContainsWhitespace = /\s/.test(secret);
			cryptoProvider = cryptoProvider || getCryptoProvider();
			validateComputedSignature(payload, header, details, cryptoProvider.computeHMACSignature(makeHMACContent(payload, details), secret), tolerance, suspectPayloadType, secretContainsWhitespace, receivedAt);
			return true;
		},
		async verifyHeaderAsync(encodedPayload, encodedHeader, secret, tolerance, cryptoProvider, receivedAt) {
			const { decodedHeader: header, decodedPayload: payload, details, suspectPayloadType } = parseEventDetails(encodedPayload, encodedHeader, this.EXPECTED_SCHEME);
			const secretContainsWhitespace = /\s/.test(secret);
			cryptoProvider = cryptoProvider || getCryptoProvider();
			return validateComputedSignature(payload, header, details, await cryptoProvider.computeHMACSignatureAsync(makeHMACContent(payload, details), secret), tolerance, suspectPayloadType, secretContainsWhitespace, receivedAt);
		}
	};
	function makeHMACContent(payload, details) {
		return `${details.timestamp}.${payload}`;
	}
	function parseEventDetails(encodedPayload, encodedHeader, expectedScheme) {
		if (!encodedPayload) throw new StripeSignatureVerificationError(encodedHeader, encodedPayload, { message: "No webhook payload was provided." });
		const suspectPayloadType = typeof encodedPayload != "string" && !(encodedPayload instanceof Uint8Array);
		const textDecoder = new TextDecoder("utf8");
		const decodedPayload = encodedPayload instanceof Uint8Array ? textDecoder.decode(encodedPayload) : encodedPayload;
		if (Array.isArray(encodedHeader)) throw new Error("Unexpected: An array was passed as a header, which should not be possible for the stripe-signature header.");
		if (encodedHeader == null || encodedHeader == "") throw new StripeSignatureVerificationError(encodedHeader, encodedPayload, { message: "No stripe-signature header value was provided." });
		const decodedHeader = encodedHeader instanceof Uint8Array ? textDecoder.decode(encodedHeader) : encodedHeader;
		const details = parseHeader(decodedHeader, expectedScheme);
		if (!details || details.timestamp === -1) throw new StripeSignatureVerificationError(decodedHeader, decodedPayload, { message: "Unable to extract timestamp and signatures from header" });
		if (!details.signatures.length) throw new StripeSignatureVerificationError(decodedHeader, decodedPayload, { message: "No signatures found with expected scheme" });
		return {
			decodedPayload,
			decodedHeader,
			details,
			suspectPayloadType
		};
	}
	function validateComputedSignature(payload, header, details, expectedSignature, tolerance, suspectPayloadType, secretContainsWhitespace, receivedAt) {
		const signatureFound = !!details.signatures.filter(platformFunctions.secureCompare.bind(platformFunctions, expectedSignature)).length;
		const docsLocation = "\nLearn more about webhook signing and explore webhook integration examples for various frameworks at https://github.com/stripe/stripe-node#webhook-signing";
		const whitespaceMessage = secretContainsWhitespace ? "\n\nNote: The provided signing secret contains whitespace. This often indicates an extra newline or space is in the value" : "";
		if (!signatureFound) {
			if (suspectPayloadType) throw new StripeSignatureVerificationError(header, payload, { message: "Webhook payload must be provided as a string or a Buffer (https://nodejs.org/api/buffer.html) instance representing the _raw_ request body.Payload was provided as a parsed JavaScript object instead. \nSignature verification is impossible without access to the original signed material. \n" + docsLocation + "\n" + whitespaceMessage });
			throw new StripeSignatureVerificationError(header, payload, { message: "No signatures found matching the expected signature for payload. Are you passing the raw request body you received from Stripe? \n If a webhook request is being forwarded by a third-party tool, ensure that the exact request body, including JSON formatting and new line style, is preserved.\n" + docsLocation + "\n" + whitespaceMessage });
		}
		const timestampAge = Math.floor((typeof receivedAt === "number" ? receivedAt : Date.now()) / 1e3) - details.timestamp;
		if (tolerance > 0 && timestampAge > tolerance) throw new StripeSignatureVerificationError(header, payload, { message: "Timestamp outside the tolerance zone" });
		return true;
	}
	function parseHeader(header, scheme) {
		if (typeof header !== "string") return null;
		return header.split(",").reduce((accum, item) => {
			const kv = item.split("=");
			if (kv[0] === "t") accum.timestamp = parseInt(kv[1], 10);
			if (kv[0] === scheme) accum.signatures.push(kv[1]);
			return accum;
		}, {
			timestamp: -1,
			signatures: []
		});
	}
	let webhooksCryptoProviderInstance = null;
	/**
	* Lazily instantiate a CryptoProvider instance. This is a stateless object
	* so a singleton can be used here.
	*/
	function getCryptoProvider() {
		if (!webhooksCryptoProviderInstance) webhooksCryptoProviderInstance = platformFunctions.createDefaultCryptoProvider();
		return webhooksCryptoProviderInstance;
	}
	function prepareOptions(opts) {
		if (!opts) throw new StripeError({ message: "Options are required" });
		const timestamp = Math.floor(opts.timestamp) || Math.floor(Date.now() / 1e3);
		const scheme = opts.scheme || signature.EXPECTED_SCHEME;
		const cryptoProvider = opts.cryptoProvider || getCryptoProvider();
		const payloadString = `${timestamp}.${opts.payload}`;
		const generateHeaderString = (signature) => {
			return `t=${timestamp},${scheme}=${signature}`;
		};
		return Object.assign(Object.assign({}, opts), {
			timestamp,
			scheme,
			cryptoProvider,
			payloadString,
			generateHeaderString
		});
	}
	Webhook.signature = signature;
	return Webhook;
}
//#endregion
//#region ../../node_modules/stripe/esm/ResourceNamespace.js
function ResourceNamespace(stripe, resources) {
	for (const name in resources) {
		if (!Object.prototype.hasOwnProperty.call(resources, name)) continue;
		const camelCaseName = name[0].toLowerCase() + name.substring(1);
		this[camelCaseName] = new resources[name](stripe);
	}
}
function resourceNamespace(namespace, resources) {
	return function(stripe) {
		return new ResourceNamespace(stripe, resources);
	};
}
//#endregion
//#region ../../node_modules/stripe/esm/resources/FinancialConnections/Accounts.js
const stripeMethod$116 = StripeResource.method;
const Accounts$1 = StripeResource.extend({
	retrieve: stripeMethod$116({
		method: "GET",
		fullPath: "/v1/financial_connections/accounts/{account}"
	}),
	list: stripeMethod$116({
		method: "GET",
		fullPath: "/v1/financial_connections/accounts",
		methodType: "list"
	}),
	disconnect: stripeMethod$116({
		method: "POST",
		fullPath: "/v1/financial_connections/accounts/{account}/disconnect"
	}),
	listOwners: stripeMethod$116({
		method: "GET",
		fullPath: "/v1/financial_connections/accounts/{account}/owners",
		methodType: "list"
	}),
	refresh: stripeMethod$116({
		method: "POST",
		fullPath: "/v1/financial_connections/accounts/{account}/refresh"
	}),
	subscribe: stripeMethod$116({
		method: "POST",
		fullPath: "/v1/financial_connections/accounts/{account}/subscribe"
	}),
	unsubscribe: stripeMethod$116({
		method: "POST",
		fullPath: "/v1/financial_connections/accounts/{account}/unsubscribe"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Entitlements/ActiveEntitlements.js
const stripeMethod$115 = StripeResource.method;
const ActiveEntitlements = StripeResource.extend({
	retrieve: stripeMethod$115({
		method: "GET",
		fullPath: "/v1/entitlements/active_entitlements/{id}"
	}),
	list: stripeMethod$115({
		method: "GET",
		fullPath: "/v1/entitlements/active_entitlements",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Billing/Alerts.js
const stripeMethod$114 = StripeResource.method;
const Alerts = StripeResource.extend({
	create: stripeMethod$114({
		method: "POST",
		fullPath: "/v1/billing/alerts"
	}),
	retrieve: stripeMethod$114({
		method: "GET",
		fullPath: "/v1/billing/alerts/{id}"
	}),
	list: stripeMethod$114({
		method: "GET",
		fullPath: "/v1/billing/alerts",
		methodType: "list"
	}),
	activate: stripeMethod$114({
		method: "POST",
		fullPath: "/v1/billing/alerts/{id}/activate"
	}),
	archive: stripeMethod$114({
		method: "POST",
		fullPath: "/v1/billing/alerts/{id}/archive"
	}),
	deactivate: stripeMethod$114({
		method: "POST",
		fullPath: "/v1/billing/alerts/{id}/deactivate"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Issuing/Authorizations.js
const stripeMethod$113 = StripeResource.method;
const Authorizations$1 = StripeResource.extend({
	create: stripeMethod$113({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/authorizations"
	}),
	capture: stripeMethod$113({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/authorizations/{authorization}/capture"
	}),
	expire: stripeMethod$113({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/authorizations/{authorization}/expire"
	}),
	finalizeAmount: stripeMethod$113({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/authorizations/{authorization}/finalize_amount"
	}),
	increment: stripeMethod$113({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/authorizations/{authorization}/increment"
	}),
	reverse: stripeMethod$113({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/authorizations/{authorization}/reverse"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Issuing/Authorizations.js
const stripeMethod$112 = StripeResource.method;
const Authorizations = StripeResource.extend({
	retrieve: stripeMethod$112({
		method: "GET",
		fullPath: "/v1/issuing/authorizations/{authorization}"
	}),
	update: stripeMethod$112({
		method: "POST",
		fullPath: "/v1/issuing/authorizations/{authorization}"
	}),
	list: stripeMethod$112({
		method: "GET",
		fullPath: "/v1/issuing/authorizations",
		methodType: "list"
	}),
	approve: stripeMethod$112({
		method: "POST",
		fullPath: "/v1/issuing/authorizations/{authorization}/approve"
	}),
	decline: stripeMethod$112({
		method: "POST",
		fullPath: "/v1/issuing/authorizations/{authorization}/decline"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Tax/Calculations.js
const stripeMethod$111 = StripeResource.method;
const Calculations = StripeResource.extend({
	create: stripeMethod$111({
		method: "POST",
		fullPath: "/v1/tax/calculations"
	}),
	retrieve: stripeMethod$111({
		method: "GET",
		fullPath: "/v1/tax/calculations/{calculation}"
	}),
	listLineItems: stripeMethod$111({
		method: "GET",
		fullPath: "/v1/tax/calculations/{calculation}/line_items",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Issuing/Cardholders.js
const stripeMethod$110 = StripeResource.method;
const Cardholders = StripeResource.extend({
	create: stripeMethod$110({
		method: "POST",
		fullPath: "/v1/issuing/cardholders"
	}),
	retrieve: stripeMethod$110({
		method: "GET",
		fullPath: "/v1/issuing/cardholders/{cardholder}"
	}),
	update: stripeMethod$110({
		method: "POST",
		fullPath: "/v1/issuing/cardholders/{cardholder}"
	}),
	list: stripeMethod$110({
		method: "GET",
		fullPath: "/v1/issuing/cardholders",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Issuing/Cards.js
const stripeMethod$109 = StripeResource.method;
const Cards$1 = StripeResource.extend({
	deliverCard: stripeMethod$109({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/cards/{card}/shipping/deliver"
	}),
	failCard: stripeMethod$109({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/cards/{card}/shipping/fail"
	}),
	returnCard: stripeMethod$109({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/cards/{card}/shipping/return"
	}),
	shipCard: stripeMethod$109({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/cards/{card}/shipping/ship"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Issuing/Cards.js
const stripeMethod$108 = StripeResource.method;
const Cards = StripeResource.extend({
	create: stripeMethod$108({
		method: "POST",
		fullPath: "/v1/issuing/cards"
	}),
	retrieve: stripeMethod$108({
		method: "GET",
		fullPath: "/v1/issuing/cards/{card}"
	}),
	update: stripeMethod$108({
		method: "POST",
		fullPath: "/v1/issuing/cards/{card}"
	}),
	list: stripeMethod$108({
		method: "GET",
		fullPath: "/v1/issuing/cards",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/BillingPortal/Configurations.js
const stripeMethod$107 = StripeResource.method;
const Configurations$1 = StripeResource.extend({
	create: stripeMethod$107({
		method: "POST",
		fullPath: "/v1/billing_portal/configurations"
	}),
	retrieve: stripeMethod$107({
		method: "GET",
		fullPath: "/v1/billing_portal/configurations/{configuration}"
	}),
	update: stripeMethod$107({
		method: "POST",
		fullPath: "/v1/billing_portal/configurations/{configuration}"
	}),
	list: stripeMethod$107({
		method: "GET",
		fullPath: "/v1/billing_portal/configurations",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Terminal/Configurations.js
const stripeMethod$106 = StripeResource.method;
const Configurations = StripeResource.extend({
	create: stripeMethod$106({
		method: "POST",
		fullPath: "/v1/terminal/configurations"
	}),
	retrieve: stripeMethod$106({
		method: "GET",
		fullPath: "/v1/terminal/configurations/{configuration}"
	}),
	update: stripeMethod$106({
		method: "POST",
		fullPath: "/v1/terminal/configurations/{configuration}"
	}),
	list: stripeMethod$106({
		method: "GET",
		fullPath: "/v1/terminal/configurations",
		methodType: "list"
	}),
	del: stripeMethod$106({
		method: "DELETE",
		fullPath: "/v1/terminal/configurations/{configuration}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/ConfirmationTokens.js
const stripeMethod$105 = StripeResource.method;
const ConfirmationTokens$1 = StripeResource.extend({ create: stripeMethod$105({
	method: "POST",
	fullPath: "/v1/test_helpers/confirmation_tokens"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/Terminal/ConnectionTokens.js
const stripeMethod$104 = StripeResource.method;
const ConnectionTokens = StripeResource.extend({ create: stripeMethod$104({
	method: "POST",
	fullPath: "/v1/terminal/connection_tokens"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/Treasury/CreditReversals.js
const stripeMethod$103 = StripeResource.method;
const CreditReversals = StripeResource.extend({
	create: stripeMethod$103({
		method: "POST",
		fullPath: "/v1/treasury/credit_reversals"
	}),
	retrieve: stripeMethod$103({
		method: "GET",
		fullPath: "/v1/treasury/credit_reversals/{credit_reversal}"
	}),
	list: stripeMethod$103({
		method: "GET",
		fullPath: "/v1/treasury/credit_reversals",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Customers.js
const stripeMethod$102 = StripeResource.method;
const Customers$1 = StripeResource.extend({ fundCashBalance: stripeMethod$102({
	method: "POST",
	fullPath: "/v1/test_helpers/customers/{customer}/fund_cash_balance"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/Treasury/DebitReversals.js
const stripeMethod$101 = StripeResource.method;
const DebitReversals = StripeResource.extend({
	create: stripeMethod$101({
		method: "POST",
		fullPath: "/v1/treasury/debit_reversals"
	}),
	retrieve: stripeMethod$101({
		method: "GET",
		fullPath: "/v1/treasury/debit_reversals/{debit_reversal}"
	}),
	list: stripeMethod$101({
		method: "GET",
		fullPath: "/v1/treasury/debit_reversals",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Issuing/Disputes.js
const stripeMethod$100 = StripeResource.method;
const Disputes$1 = StripeResource.extend({
	create: stripeMethod$100({
		method: "POST",
		fullPath: "/v1/issuing/disputes"
	}),
	retrieve: stripeMethod$100({
		method: "GET",
		fullPath: "/v1/issuing/disputes/{dispute}"
	}),
	update: stripeMethod$100({
		method: "POST",
		fullPath: "/v1/issuing/disputes/{dispute}"
	}),
	list: stripeMethod$100({
		method: "GET",
		fullPath: "/v1/issuing/disputes",
		methodType: "list"
	}),
	submit: stripeMethod$100({
		method: "POST",
		fullPath: "/v1/issuing/disputes/{dispute}/submit"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Radar/EarlyFraudWarnings.js
const stripeMethod$99 = StripeResource.method;
const EarlyFraudWarnings = StripeResource.extend({
	retrieve: stripeMethod$99({
		method: "GET",
		fullPath: "/v1/radar/early_fraud_warnings/{early_fraud_warning}"
	}),
	list: stripeMethod$99({
		method: "GET",
		fullPath: "/v1/radar/early_fraud_warnings",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Entitlements/Features.js
const stripeMethod$98 = StripeResource.method;
const Features = StripeResource.extend({
	create: stripeMethod$98({
		method: "POST",
		fullPath: "/v1/entitlements/features"
	}),
	retrieve: stripeMethod$98({
		method: "GET",
		fullPath: "/v1/entitlements/features/{id}"
	}),
	update: stripeMethod$98({
		method: "POST",
		fullPath: "/v1/entitlements/features/{id}"
	}),
	list: stripeMethod$98({
		method: "GET",
		fullPath: "/v1/entitlements/features",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Treasury/FinancialAccounts.js
const stripeMethod$97 = StripeResource.method;
const FinancialAccounts = StripeResource.extend({
	create: stripeMethod$97({
		method: "POST",
		fullPath: "/v1/treasury/financial_accounts"
	}),
	retrieve: stripeMethod$97({
		method: "GET",
		fullPath: "/v1/treasury/financial_accounts/{financial_account}"
	}),
	update: stripeMethod$97({
		method: "POST",
		fullPath: "/v1/treasury/financial_accounts/{financial_account}"
	}),
	list: stripeMethod$97({
		method: "GET",
		fullPath: "/v1/treasury/financial_accounts",
		methodType: "list"
	}),
	retrieveFeatures: stripeMethod$97({
		method: "GET",
		fullPath: "/v1/treasury/financial_accounts/{financial_account}/features"
	}),
	updateFeatures: stripeMethod$97({
		method: "POST",
		fullPath: "/v1/treasury/financial_accounts/{financial_account}/features"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Treasury/InboundTransfers.js
const stripeMethod$96 = StripeResource.method;
const InboundTransfers$1 = StripeResource.extend({
	fail: stripeMethod$96({
		method: "POST",
		fullPath: "/v1/test_helpers/treasury/inbound_transfers/{id}/fail"
	}),
	returnInboundTransfer: stripeMethod$96({
		method: "POST",
		fullPath: "/v1/test_helpers/treasury/inbound_transfers/{id}/return"
	}),
	succeed: stripeMethod$96({
		method: "POST",
		fullPath: "/v1/test_helpers/treasury/inbound_transfers/{id}/succeed"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Treasury/InboundTransfers.js
const stripeMethod$95 = StripeResource.method;
const InboundTransfers = StripeResource.extend({
	create: stripeMethod$95({
		method: "POST",
		fullPath: "/v1/treasury/inbound_transfers"
	}),
	retrieve: stripeMethod$95({
		method: "GET",
		fullPath: "/v1/treasury/inbound_transfers/{id}"
	}),
	list: stripeMethod$95({
		method: "GET",
		fullPath: "/v1/treasury/inbound_transfers",
		methodType: "list"
	}),
	cancel: stripeMethod$95({
		method: "POST",
		fullPath: "/v1/treasury/inbound_transfers/{inbound_transfer}/cancel"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Terminal/Locations.js
const stripeMethod$94 = StripeResource.method;
const Locations = StripeResource.extend({
	create: stripeMethod$94({
		method: "POST",
		fullPath: "/v1/terminal/locations"
	}),
	retrieve: stripeMethod$94({
		method: "GET",
		fullPath: "/v1/terminal/locations/{location}"
	}),
	update: stripeMethod$94({
		method: "POST",
		fullPath: "/v1/terminal/locations/{location}"
	}),
	list: stripeMethod$94({
		method: "GET",
		fullPath: "/v1/terminal/locations",
		methodType: "list"
	}),
	del: stripeMethod$94({
		method: "DELETE",
		fullPath: "/v1/terminal/locations/{location}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Billing/MeterEventAdjustments.js
const stripeMethod$93 = StripeResource.method;
const MeterEventAdjustments = StripeResource.extend({ create: stripeMethod$93({
	method: "POST",
	fullPath: "/v1/billing/meter_event_adjustments"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/Billing/MeterEvents.js
const stripeMethod$92 = StripeResource.method;
const MeterEvents = StripeResource.extend({ create: stripeMethod$92({
	method: "POST",
	fullPath: "/v1/billing/meter_events"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/Billing/Meters.js
const stripeMethod$91 = StripeResource.method;
const Meters = StripeResource.extend({
	create: stripeMethod$91({
		method: "POST",
		fullPath: "/v1/billing/meters"
	}),
	retrieve: stripeMethod$91({
		method: "GET",
		fullPath: "/v1/billing/meters/{id}"
	}),
	update: stripeMethod$91({
		method: "POST",
		fullPath: "/v1/billing/meters/{id}"
	}),
	list: stripeMethod$91({
		method: "GET",
		fullPath: "/v1/billing/meters",
		methodType: "list"
	}),
	deactivate: stripeMethod$91({
		method: "POST",
		fullPath: "/v1/billing/meters/{id}/deactivate"
	}),
	listEventSummaries: stripeMethod$91({
		method: "GET",
		fullPath: "/v1/billing/meters/{id}/event_summaries",
		methodType: "list"
	}),
	reactivate: stripeMethod$91({
		method: "POST",
		fullPath: "/v1/billing/meters/{id}/reactivate"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Climate/Orders.js
const stripeMethod$90 = StripeResource.method;
const Orders = StripeResource.extend({
	create: stripeMethod$90({
		method: "POST",
		fullPath: "/v1/climate/orders"
	}),
	retrieve: stripeMethod$90({
		method: "GET",
		fullPath: "/v1/climate/orders/{order}"
	}),
	update: stripeMethod$90({
		method: "POST",
		fullPath: "/v1/climate/orders/{order}"
	}),
	list: stripeMethod$90({
		method: "GET",
		fullPath: "/v1/climate/orders",
		methodType: "list"
	}),
	cancel: stripeMethod$90({
		method: "POST",
		fullPath: "/v1/climate/orders/{order}/cancel"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Treasury/OutboundPayments.js
const stripeMethod$89 = StripeResource.method;
const OutboundPayments$1 = StripeResource.extend({
	update: stripeMethod$89({
		method: "POST",
		fullPath: "/v1/test_helpers/treasury/outbound_payments/{id}"
	}),
	fail: stripeMethod$89({
		method: "POST",
		fullPath: "/v1/test_helpers/treasury/outbound_payments/{id}/fail"
	}),
	post: stripeMethod$89({
		method: "POST",
		fullPath: "/v1/test_helpers/treasury/outbound_payments/{id}/post"
	}),
	returnOutboundPayment: stripeMethod$89({
		method: "POST",
		fullPath: "/v1/test_helpers/treasury/outbound_payments/{id}/return"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Treasury/OutboundPayments.js
const stripeMethod$88 = StripeResource.method;
const OutboundPayments = StripeResource.extend({
	create: stripeMethod$88({
		method: "POST",
		fullPath: "/v1/treasury/outbound_payments"
	}),
	retrieve: stripeMethod$88({
		method: "GET",
		fullPath: "/v1/treasury/outbound_payments/{id}"
	}),
	list: stripeMethod$88({
		method: "GET",
		fullPath: "/v1/treasury/outbound_payments",
		methodType: "list"
	}),
	cancel: stripeMethod$88({
		method: "POST",
		fullPath: "/v1/treasury/outbound_payments/{id}/cancel"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Treasury/OutboundTransfers.js
const stripeMethod$87 = StripeResource.method;
const OutboundTransfers$1 = StripeResource.extend({
	update: stripeMethod$87({
		method: "POST",
		fullPath: "/v1/test_helpers/treasury/outbound_transfers/{outbound_transfer}"
	}),
	fail: stripeMethod$87({
		method: "POST",
		fullPath: "/v1/test_helpers/treasury/outbound_transfers/{outbound_transfer}/fail"
	}),
	post: stripeMethod$87({
		method: "POST",
		fullPath: "/v1/test_helpers/treasury/outbound_transfers/{outbound_transfer}/post"
	}),
	returnOutboundTransfer: stripeMethod$87({
		method: "POST",
		fullPath: "/v1/test_helpers/treasury/outbound_transfers/{outbound_transfer}/return"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Treasury/OutboundTransfers.js
const stripeMethod$86 = StripeResource.method;
const OutboundTransfers = StripeResource.extend({
	create: stripeMethod$86({
		method: "POST",
		fullPath: "/v1/treasury/outbound_transfers"
	}),
	retrieve: stripeMethod$86({
		method: "GET",
		fullPath: "/v1/treasury/outbound_transfers/{outbound_transfer}"
	}),
	list: stripeMethod$86({
		method: "GET",
		fullPath: "/v1/treasury/outbound_transfers",
		methodType: "list"
	}),
	cancel: stripeMethod$86({
		method: "POST",
		fullPath: "/v1/treasury/outbound_transfers/{outbound_transfer}/cancel"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Issuing/PersonalizationDesigns.js
const stripeMethod$85 = StripeResource.method;
const PersonalizationDesigns$1 = StripeResource.extend({
	activate: stripeMethod$85({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/personalization_designs/{personalization_design}/activate"
	}),
	deactivate: stripeMethod$85({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/personalization_designs/{personalization_design}/deactivate"
	}),
	reject: stripeMethod$85({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/personalization_designs/{personalization_design}/reject"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Issuing/PersonalizationDesigns.js
const stripeMethod$84 = StripeResource.method;
const PersonalizationDesigns = StripeResource.extend({
	create: stripeMethod$84({
		method: "POST",
		fullPath: "/v1/issuing/personalization_designs"
	}),
	retrieve: stripeMethod$84({
		method: "GET",
		fullPath: "/v1/issuing/personalization_designs/{personalization_design}"
	}),
	update: stripeMethod$84({
		method: "POST",
		fullPath: "/v1/issuing/personalization_designs/{personalization_design}"
	}),
	list: stripeMethod$84({
		method: "GET",
		fullPath: "/v1/issuing/personalization_designs",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Issuing/PhysicalBundles.js
const stripeMethod$83 = StripeResource.method;
const PhysicalBundles = StripeResource.extend({
	retrieve: stripeMethod$83({
		method: "GET",
		fullPath: "/v1/issuing/physical_bundles/{physical_bundle}"
	}),
	list: stripeMethod$83({
		method: "GET",
		fullPath: "/v1/issuing/physical_bundles",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Climate/Products.js
const stripeMethod$82 = StripeResource.method;
const Products$1 = StripeResource.extend({
	retrieve: stripeMethod$82({
		method: "GET",
		fullPath: "/v1/climate/products/{product}"
	}),
	list: stripeMethod$82({
		method: "GET",
		fullPath: "/v1/climate/products",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Terminal/Readers.js
const stripeMethod$81 = StripeResource.method;
const Readers$1 = StripeResource.extend({ presentPaymentMethod: stripeMethod$81({
	method: "POST",
	fullPath: "/v1/test_helpers/terminal/readers/{reader}/present_payment_method"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/Terminal/Readers.js
const stripeMethod$80 = StripeResource.method;
const Readers = StripeResource.extend({
	create: stripeMethod$80({
		method: "POST",
		fullPath: "/v1/terminal/readers"
	}),
	retrieve: stripeMethod$80({
		method: "GET",
		fullPath: "/v1/terminal/readers/{reader}"
	}),
	update: stripeMethod$80({
		method: "POST",
		fullPath: "/v1/terminal/readers/{reader}"
	}),
	list: stripeMethod$80({
		method: "GET",
		fullPath: "/v1/terminal/readers",
		methodType: "list"
	}),
	del: stripeMethod$80({
		method: "DELETE",
		fullPath: "/v1/terminal/readers/{reader}"
	}),
	cancelAction: stripeMethod$80({
		method: "POST",
		fullPath: "/v1/terminal/readers/{reader}/cancel_action"
	}),
	processPaymentIntent: stripeMethod$80({
		method: "POST",
		fullPath: "/v1/terminal/readers/{reader}/process_payment_intent"
	}),
	processSetupIntent: stripeMethod$80({
		method: "POST",
		fullPath: "/v1/terminal/readers/{reader}/process_setup_intent"
	}),
	refundPayment: stripeMethod$80({
		method: "POST",
		fullPath: "/v1/terminal/readers/{reader}/refund_payment"
	}),
	setReaderDisplay: stripeMethod$80({
		method: "POST",
		fullPath: "/v1/terminal/readers/{reader}/set_reader_display"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Treasury/ReceivedCredits.js
const stripeMethod$79 = StripeResource.method;
const ReceivedCredits$1 = StripeResource.extend({ create: stripeMethod$79({
	method: "POST",
	fullPath: "/v1/test_helpers/treasury/received_credits"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/Treasury/ReceivedCredits.js
const stripeMethod$78 = StripeResource.method;
const ReceivedCredits = StripeResource.extend({
	retrieve: stripeMethod$78({
		method: "GET",
		fullPath: "/v1/treasury/received_credits/{id}"
	}),
	list: stripeMethod$78({
		method: "GET",
		fullPath: "/v1/treasury/received_credits",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Treasury/ReceivedDebits.js
const stripeMethod$77 = StripeResource.method;
const ReceivedDebits$1 = StripeResource.extend({ create: stripeMethod$77({
	method: "POST",
	fullPath: "/v1/test_helpers/treasury/received_debits"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/Treasury/ReceivedDebits.js
const stripeMethod$76 = StripeResource.method;
const ReceivedDebits = StripeResource.extend({
	retrieve: stripeMethod$76({
		method: "GET",
		fullPath: "/v1/treasury/received_debits/{id}"
	}),
	list: stripeMethod$76({
		method: "GET",
		fullPath: "/v1/treasury/received_debits",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Refunds.js
const stripeMethod$75 = StripeResource.method;
const Refunds$1 = StripeResource.extend({ expire: stripeMethod$75({
	method: "POST",
	fullPath: "/v1/test_helpers/refunds/{refund}/expire"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/Tax/Registrations.js
const stripeMethod$74 = StripeResource.method;
const Registrations = StripeResource.extend({
	create: stripeMethod$74({
		method: "POST",
		fullPath: "/v1/tax/registrations"
	}),
	retrieve: stripeMethod$74({
		method: "GET",
		fullPath: "/v1/tax/registrations/{id}"
	}),
	update: stripeMethod$74({
		method: "POST",
		fullPath: "/v1/tax/registrations/{id}"
	}),
	list: stripeMethod$74({
		method: "GET",
		fullPath: "/v1/tax/registrations",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Reporting/ReportRuns.js
const stripeMethod$73 = StripeResource.method;
const ReportRuns = StripeResource.extend({
	create: stripeMethod$73({
		method: "POST",
		fullPath: "/v1/reporting/report_runs"
	}),
	retrieve: stripeMethod$73({
		method: "GET",
		fullPath: "/v1/reporting/report_runs/{report_run}"
	}),
	list: stripeMethod$73({
		method: "GET",
		fullPath: "/v1/reporting/report_runs",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Reporting/ReportTypes.js
const stripeMethod$72 = StripeResource.method;
const ReportTypes = StripeResource.extend({
	retrieve: stripeMethod$72({
		method: "GET",
		fullPath: "/v1/reporting/report_types/{report_type}"
	}),
	list: stripeMethod$72({
		method: "GET",
		fullPath: "/v1/reporting/report_types",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Forwarding/Requests.js
const stripeMethod$71 = StripeResource.method;
const Requests = StripeResource.extend({
	create: stripeMethod$71({
		method: "POST",
		fullPath: "/v1/forwarding/requests"
	}),
	retrieve: stripeMethod$71({
		method: "GET",
		fullPath: "/v1/forwarding/requests/{id}"
	}),
	list: stripeMethod$71({
		method: "GET",
		fullPath: "/v1/forwarding/requests",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Sigma/ScheduledQueryRuns.js
const stripeMethod$70 = StripeResource.method;
const ScheduledQueryRuns = StripeResource.extend({
	retrieve: stripeMethod$70({
		method: "GET",
		fullPath: "/v1/sigma/scheduled_query_runs/{scheduled_query_run}"
	}),
	list: stripeMethod$70({
		method: "GET",
		fullPath: "/v1/sigma/scheduled_query_runs",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Apps/Secrets.js
const stripeMethod$69 = StripeResource.method;
const Secrets = StripeResource.extend({
	create: stripeMethod$69({
		method: "POST",
		fullPath: "/v1/apps/secrets"
	}),
	list: stripeMethod$69({
		method: "GET",
		fullPath: "/v1/apps/secrets",
		methodType: "list"
	}),
	deleteWhere: stripeMethod$69({
		method: "POST",
		fullPath: "/v1/apps/secrets/delete"
	}),
	find: stripeMethod$69({
		method: "GET",
		fullPath: "/v1/apps/secrets/find"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/BillingPortal/Sessions.js
const stripeMethod$68 = StripeResource.method;
const Sessions$2 = StripeResource.extend({ create: stripeMethod$68({
	method: "POST",
	fullPath: "/v1/billing_portal/sessions"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/Checkout/Sessions.js
const stripeMethod$67 = StripeResource.method;
const Sessions$1 = StripeResource.extend({
	create: stripeMethod$67({
		method: "POST",
		fullPath: "/v1/checkout/sessions"
	}),
	retrieve: stripeMethod$67({
		method: "GET",
		fullPath: "/v1/checkout/sessions/{session}"
	}),
	update: stripeMethod$67({
		method: "POST",
		fullPath: "/v1/checkout/sessions/{session}"
	}),
	list: stripeMethod$67({
		method: "GET",
		fullPath: "/v1/checkout/sessions",
		methodType: "list"
	}),
	expire: stripeMethod$67({
		method: "POST",
		fullPath: "/v1/checkout/sessions/{session}/expire"
	}),
	listLineItems: stripeMethod$67({
		method: "GET",
		fullPath: "/v1/checkout/sessions/{session}/line_items",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/FinancialConnections/Sessions.js
const stripeMethod$66 = StripeResource.method;
const Sessions = StripeResource.extend({
	create: stripeMethod$66({
		method: "POST",
		fullPath: "/v1/financial_connections/sessions"
	}),
	retrieve: stripeMethod$66({
		method: "GET",
		fullPath: "/v1/financial_connections/sessions/{session}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Tax/Settings.js
const stripeMethod$65 = StripeResource.method;
const Settings = StripeResource.extend({
	retrieve: stripeMethod$65({
		method: "GET",
		fullPath: "/v1/tax/settings"
	}),
	update: stripeMethod$65({
		method: "POST",
		fullPath: "/v1/tax/settings"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Climate/Suppliers.js
const stripeMethod$64 = StripeResource.method;
const Suppliers = StripeResource.extend({
	retrieve: stripeMethod$64({
		method: "GET",
		fullPath: "/v1/climate/suppliers/{supplier}"
	}),
	list: stripeMethod$64({
		method: "GET",
		fullPath: "/v1/climate/suppliers",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/TestClocks.js
const stripeMethod$63 = StripeResource.method;
const TestClocks = StripeResource.extend({
	create: stripeMethod$63({
		method: "POST",
		fullPath: "/v1/test_helpers/test_clocks"
	}),
	retrieve: stripeMethod$63({
		method: "GET",
		fullPath: "/v1/test_helpers/test_clocks/{test_clock}"
	}),
	list: stripeMethod$63({
		method: "GET",
		fullPath: "/v1/test_helpers/test_clocks",
		methodType: "list"
	}),
	del: stripeMethod$63({
		method: "DELETE",
		fullPath: "/v1/test_helpers/test_clocks/{test_clock}"
	}),
	advance: stripeMethod$63({
		method: "POST",
		fullPath: "/v1/test_helpers/test_clocks/{test_clock}/advance"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Issuing/Tokens.js
const stripeMethod$62 = StripeResource.method;
const Tokens$1 = StripeResource.extend({
	retrieve: stripeMethod$62({
		method: "GET",
		fullPath: "/v1/issuing/tokens/{token}"
	}),
	update: stripeMethod$62({
		method: "POST",
		fullPath: "/v1/issuing/tokens/{token}"
	}),
	list: stripeMethod$62({
		method: "GET",
		fullPath: "/v1/issuing/tokens",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Treasury/TransactionEntries.js
const stripeMethod$61 = StripeResource.method;
const TransactionEntries = StripeResource.extend({
	retrieve: stripeMethod$61({
		method: "GET",
		fullPath: "/v1/treasury/transaction_entries/{id}"
	}),
	list: stripeMethod$61({
		method: "GET",
		fullPath: "/v1/treasury/transaction_entries",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TestHelpers/Issuing/Transactions.js
const stripeMethod$60 = StripeResource.method;
const Transactions$4 = StripeResource.extend({
	createForceCapture: stripeMethod$60({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/transactions/create_force_capture"
	}),
	createUnlinkedRefund: stripeMethod$60({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/transactions/create_unlinked_refund"
	}),
	refund: stripeMethod$60({
		method: "POST",
		fullPath: "/v1/test_helpers/issuing/transactions/{transaction}/refund"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/FinancialConnections/Transactions.js
const stripeMethod$59 = StripeResource.method;
const Transactions$3 = StripeResource.extend({
	retrieve: stripeMethod$59({
		method: "GET",
		fullPath: "/v1/financial_connections/transactions/{transaction}"
	}),
	list: stripeMethod$59({
		method: "GET",
		fullPath: "/v1/financial_connections/transactions",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Issuing/Transactions.js
const stripeMethod$58 = StripeResource.method;
const Transactions$2 = StripeResource.extend({
	retrieve: stripeMethod$58({
		method: "GET",
		fullPath: "/v1/issuing/transactions/{transaction}"
	}),
	update: stripeMethod$58({
		method: "POST",
		fullPath: "/v1/issuing/transactions/{transaction}"
	}),
	list: stripeMethod$58({
		method: "GET",
		fullPath: "/v1/issuing/transactions",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Tax/Transactions.js
const stripeMethod$57 = StripeResource.method;
const Transactions$1 = StripeResource.extend({
	retrieve: stripeMethod$57({
		method: "GET",
		fullPath: "/v1/tax/transactions/{transaction}"
	}),
	createFromCalculation: stripeMethod$57({
		method: "POST",
		fullPath: "/v1/tax/transactions/create_from_calculation"
	}),
	createReversal: stripeMethod$57({
		method: "POST",
		fullPath: "/v1/tax/transactions/create_reversal"
	}),
	listLineItems: stripeMethod$57({
		method: "GET",
		fullPath: "/v1/tax/transactions/{transaction}/line_items",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Treasury/Transactions.js
const stripeMethod$56 = StripeResource.method;
const Transactions = StripeResource.extend({
	retrieve: stripeMethod$56({
		method: "GET",
		fullPath: "/v1/treasury/transactions/{id}"
	}),
	list: stripeMethod$56({
		method: "GET",
		fullPath: "/v1/treasury/transactions",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Radar/ValueListItems.js
const stripeMethod$55 = StripeResource.method;
const ValueListItems = StripeResource.extend({
	create: stripeMethod$55({
		method: "POST",
		fullPath: "/v1/radar/value_list_items"
	}),
	retrieve: stripeMethod$55({
		method: "GET",
		fullPath: "/v1/radar/value_list_items/{item}"
	}),
	list: stripeMethod$55({
		method: "GET",
		fullPath: "/v1/radar/value_list_items",
		methodType: "list"
	}),
	del: stripeMethod$55({
		method: "DELETE",
		fullPath: "/v1/radar/value_list_items/{item}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Radar/ValueLists.js
const stripeMethod$54 = StripeResource.method;
const ValueLists = StripeResource.extend({
	create: stripeMethod$54({
		method: "POST",
		fullPath: "/v1/radar/value_lists"
	}),
	retrieve: stripeMethod$54({
		method: "GET",
		fullPath: "/v1/radar/value_lists/{value_list}"
	}),
	update: stripeMethod$54({
		method: "POST",
		fullPath: "/v1/radar/value_lists/{value_list}"
	}),
	list: stripeMethod$54({
		method: "GET",
		fullPath: "/v1/radar/value_lists",
		methodType: "list"
	}),
	del: stripeMethod$54({
		method: "DELETE",
		fullPath: "/v1/radar/value_lists/{value_list}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Identity/VerificationReports.js
const stripeMethod$53 = StripeResource.method;
const VerificationReports = StripeResource.extend({
	retrieve: stripeMethod$53({
		method: "GET",
		fullPath: "/v1/identity/verification_reports/{report}"
	}),
	list: stripeMethod$53({
		method: "GET",
		fullPath: "/v1/identity/verification_reports",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Identity/VerificationSessions.js
const stripeMethod$52 = StripeResource.method;
const VerificationSessions = StripeResource.extend({
	create: stripeMethod$52({
		method: "POST",
		fullPath: "/v1/identity/verification_sessions"
	}),
	retrieve: stripeMethod$52({
		method: "GET",
		fullPath: "/v1/identity/verification_sessions/{session}"
	}),
	update: stripeMethod$52({
		method: "POST",
		fullPath: "/v1/identity/verification_sessions/{session}"
	}),
	list: stripeMethod$52({
		method: "GET",
		fullPath: "/v1/identity/verification_sessions",
		methodType: "list"
	}),
	cancel: stripeMethod$52({
		method: "POST",
		fullPath: "/v1/identity/verification_sessions/{session}/cancel"
	}),
	redact: stripeMethod$52({
		method: "POST",
		fullPath: "/v1/identity/verification_sessions/{session}/redact"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Accounts.js
const stripeMethod$51 = StripeResource.method;
const Accounts = StripeResource.extend({
	create: stripeMethod$51({
		method: "POST",
		fullPath: "/v1/accounts"
	}),
	retrieve(id, ...args) {
		if (typeof id === "string") return stripeMethod$51({
			method: "GET",
			fullPath: "/v1/accounts/{id}"
		}).apply(this, [id, ...args]);
		else {
			if (id === null || id === void 0) [].shift.apply([id, ...args]);
			return stripeMethod$51({
				method: "GET",
				fullPath: "/v1/account"
			}).apply(this, [id, ...args]);
		}
	},
	update: stripeMethod$51({
		method: "POST",
		fullPath: "/v1/accounts/{account}"
	}),
	list: stripeMethod$51({
		method: "GET",
		fullPath: "/v1/accounts",
		methodType: "list"
	}),
	del: stripeMethod$51({
		method: "DELETE",
		fullPath: "/v1/accounts/{account}"
	}),
	createExternalAccount: stripeMethod$51({
		method: "POST",
		fullPath: "/v1/accounts/{account}/external_accounts"
	}),
	createLoginLink: stripeMethod$51({
		method: "POST",
		fullPath: "/v1/accounts/{account}/login_links"
	}),
	createPerson: stripeMethod$51({
		method: "POST",
		fullPath: "/v1/accounts/{account}/persons"
	}),
	deleteExternalAccount: stripeMethod$51({
		method: "DELETE",
		fullPath: "/v1/accounts/{account}/external_accounts/{id}"
	}),
	deletePerson: stripeMethod$51({
		method: "DELETE",
		fullPath: "/v1/accounts/{account}/persons/{person}"
	}),
	listCapabilities: stripeMethod$51({
		method: "GET",
		fullPath: "/v1/accounts/{account}/capabilities",
		methodType: "list"
	}),
	listExternalAccounts: stripeMethod$51({
		method: "GET",
		fullPath: "/v1/accounts/{account}/external_accounts",
		methodType: "list"
	}),
	listPersons: stripeMethod$51({
		method: "GET",
		fullPath: "/v1/accounts/{account}/persons",
		methodType: "list"
	}),
	reject: stripeMethod$51({
		method: "POST",
		fullPath: "/v1/accounts/{account}/reject"
	}),
	retrieveCurrent: stripeMethod$51({
		method: "GET",
		fullPath: "/v1/account"
	}),
	retrieveCapability: stripeMethod$51({
		method: "GET",
		fullPath: "/v1/accounts/{account}/capabilities/{capability}"
	}),
	retrieveExternalAccount: stripeMethod$51({
		method: "GET",
		fullPath: "/v1/accounts/{account}/external_accounts/{id}"
	}),
	retrievePerson: stripeMethod$51({
		method: "GET",
		fullPath: "/v1/accounts/{account}/persons/{person}"
	}),
	updateCapability: stripeMethod$51({
		method: "POST",
		fullPath: "/v1/accounts/{account}/capabilities/{capability}"
	}),
	updateExternalAccount: stripeMethod$51({
		method: "POST",
		fullPath: "/v1/accounts/{account}/external_accounts/{id}"
	}),
	updatePerson: stripeMethod$51({
		method: "POST",
		fullPath: "/v1/accounts/{account}/persons/{person}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/AccountLinks.js
const stripeMethod$50 = StripeResource.method;
const AccountLinks = StripeResource.extend({ create: stripeMethod$50({
	method: "POST",
	fullPath: "/v1/account_links"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/AccountSessions.js
const stripeMethod$49 = StripeResource.method;
const AccountSessions = StripeResource.extend({ create: stripeMethod$49({
	method: "POST",
	fullPath: "/v1/account_sessions"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/ApplePayDomains.js
const stripeMethod$48 = StripeResource.method;
const ApplePayDomains = StripeResource.extend({
	create: stripeMethod$48({
		method: "POST",
		fullPath: "/v1/apple_pay/domains"
	}),
	retrieve: stripeMethod$48({
		method: "GET",
		fullPath: "/v1/apple_pay/domains/{domain}"
	}),
	list: stripeMethod$48({
		method: "GET",
		fullPath: "/v1/apple_pay/domains",
		methodType: "list"
	}),
	del: stripeMethod$48({
		method: "DELETE",
		fullPath: "/v1/apple_pay/domains/{domain}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/ApplicationFees.js
const stripeMethod$47 = StripeResource.method;
const ApplicationFees = StripeResource.extend({
	retrieve: stripeMethod$47({
		method: "GET",
		fullPath: "/v1/application_fees/{id}"
	}),
	list: stripeMethod$47({
		method: "GET",
		fullPath: "/v1/application_fees",
		methodType: "list"
	}),
	createRefund: stripeMethod$47({
		method: "POST",
		fullPath: "/v1/application_fees/{id}/refunds"
	}),
	listRefunds: stripeMethod$47({
		method: "GET",
		fullPath: "/v1/application_fees/{id}/refunds",
		methodType: "list"
	}),
	retrieveRefund: stripeMethod$47({
		method: "GET",
		fullPath: "/v1/application_fees/{fee}/refunds/{id}"
	}),
	updateRefund: stripeMethod$47({
		method: "POST",
		fullPath: "/v1/application_fees/{fee}/refunds/{id}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Balance.js
const stripeMethod$46 = StripeResource.method;
const Balance = StripeResource.extend({ retrieve: stripeMethod$46({
	method: "GET",
	fullPath: "/v1/balance"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/BalanceTransactions.js
const stripeMethod$45 = StripeResource.method;
const BalanceTransactions = StripeResource.extend({
	retrieve: stripeMethod$45({
		method: "GET",
		fullPath: "/v1/balance_transactions/{id}"
	}),
	list: stripeMethod$45({
		method: "GET",
		fullPath: "/v1/balance_transactions",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Charges.js
const stripeMethod$44 = StripeResource.method;
const Charges = StripeResource.extend({
	create: stripeMethod$44({
		method: "POST",
		fullPath: "/v1/charges"
	}),
	retrieve: stripeMethod$44({
		method: "GET",
		fullPath: "/v1/charges/{charge}"
	}),
	update: stripeMethod$44({
		method: "POST",
		fullPath: "/v1/charges/{charge}"
	}),
	list: stripeMethod$44({
		method: "GET",
		fullPath: "/v1/charges",
		methodType: "list"
	}),
	capture: stripeMethod$44({
		method: "POST",
		fullPath: "/v1/charges/{charge}/capture"
	}),
	search: stripeMethod$44({
		method: "GET",
		fullPath: "/v1/charges/search",
		methodType: "search"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/ConfirmationTokens.js
const stripeMethod$43 = StripeResource.method;
const ConfirmationTokens = StripeResource.extend({ retrieve: stripeMethod$43({
	method: "GET",
	fullPath: "/v1/confirmation_tokens/{confirmation_token}"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/CountrySpecs.js
const stripeMethod$42 = StripeResource.method;
const CountrySpecs = StripeResource.extend({
	retrieve: stripeMethod$42({
		method: "GET",
		fullPath: "/v1/country_specs/{country}"
	}),
	list: stripeMethod$42({
		method: "GET",
		fullPath: "/v1/country_specs",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Coupons.js
const stripeMethod$41 = StripeResource.method;
const Coupons = StripeResource.extend({
	create: stripeMethod$41({
		method: "POST",
		fullPath: "/v1/coupons"
	}),
	retrieve: stripeMethod$41({
		method: "GET",
		fullPath: "/v1/coupons/{coupon}"
	}),
	update: stripeMethod$41({
		method: "POST",
		fullPath: "/v1/coupons/{coupon}"
	}),
	list: stripeMethod$41({
		method: "GET",
		fullPath: "/v1/coupons",
		methodType: "list"
	}),
	del: stripeMethod$41({
		method: "DELETE",
		fullPath: "/v1/coupons/{coupon}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/CreditNotes.js
const stripeMethod$40 = StripeResource.method;
const CreditNotes = StripeResource.extend({
	create: stripeMethod$40({
		method: "POST",
		fullPath: "/v1/credit_notes"
	}),
	retrieve: stripeMethod$40({
		method: "GET",
		fullPath: "/v1/credit_notes/{id}"
	}),
	update: stripeMethod$40({
		method: "POST",
		fullPath: "/v1/credit_notes/{id}"
	}),
	list: stripeMethod$40({
		method: "GET",
		fullPath: "/v1/credit_notes",
		methodType: "list"
	}),
	listLineItems: stripeMethod$40({
		method: "GET",
		fullPath: "/v1/credit_notes/{credit_note}/lines",
		methodType: "list"
	}),
	listPreviewLineItems: stripeMethod$40({
		method: "GET",
		fullPath: "/v1/credit_notes/preview/lines",
		methodType: "list"
	}),
	preview: stripeMethod$40({
		method: "GET",
		fullPath: "/v1/credit_notes/preview"
	}),
	voidCreditNote: stripeMethod$40({
		method: "POST",
		fullPath: "/v1/credit_notes/{id}/void"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/CustomerSessions.js
const stripeMethod$39 = StripeResource.method;
const CustomerSessions = StripeResource.extend({ create: stripeMethod$39({
	method: "POST",
	fullPath: "/v1/customer_sessions"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/Customers.js
const stripeMethod$38 = StripeResource.method;
const Customers = StripeResource.extend({
	create: stripeMethod$38({
		method: "POST",
		fullPath: "/v1/customers"
	}),
	retrieve: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}"
	}),
	update: stripeMethod$38({
		method: "POST",
		fullPath: "/v1/customers/{customer}"
	}),
	list: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers",
		methodType: "list"
	}),
	del: stripeMethod$38({
		method: "DELETE",
		fullPath: "/v1/customers/{customer}"
	}),
	createBalanceTransaction: stripeMethod$38({
		method: "POST",
		fullPath: "/v1/customers/{customer}/balance_transactions"
	}),
	createFundingInstructions: stripeMethod$38({
		method: "POST",
		fullPath: "/v1/customers/{customer}/funding_instructions"
	}),
	createSource: stripeMethod$38({
		method: "POST",
		fullPath: "/v1/customers/{customer}/sources"
	}),
	createTaxId: stripeMethod$38({
		method: "POST",
		fullPath: "/v1/customers/{customer}/tax_ids"
	}),
	deleteDiscount: stripeMethod$38({
		method: "DELETE",
		fullPath: "/v1/customers/{customer}/discount"
	}),
	deleteSource: stripeMethod$38({
		method: "DELETE",
		fullPath: "/v1/customers/{customer}/sources/{id}"
	}),
	deleteTaxId: stripeMethod$38({
		method: "DELETE",
		fullPath: "/v1/customers/{customer}/tax_ids/{id}"
	}),
	listBalanceTransactions: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}/balance_transactions",
		methodType: "list"
	}),
	listCashBalanceTransactions: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}/cash_balance_transactions",
		methodType: "list"
	}),
	listPaymentMethods: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}/payment_methods",
		methodType: "list"
	}),
	listSources: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}/sources",
		methodType: "list"
	}),
	listTaxIds: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}/tax_ids",
		methodType: "list"
	}),
	retrieveBalanceTransaction: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}/balance_transactions/{transaction}"
	}),
	retrieveCashBalance: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}/cash_balance"
	}),
	retrieveCashBalanceTransaction: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}/cash_balance_transactions/{transaction}"
	}),
	retrievePaymentMethod: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}/payment_methods/{payment_method}"
	}),
	retrieveSource: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}/sources/{id}"
	}),
	retrieveTaxId: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/{customer}/tax_ids/{id}"
	}),
	search: stripeMethod$38({
		method: "GET",
		fullPath: "/v1/customers/search",
		methodType: "search"
	}),
	updateBalanceTransaction: stripeMethod$38({
		method: "POST",
		fullPath: "/v1/customers/{customer}/balance_transactions/{transaction}"
	}),
	updateCashBalance: stripeMethod$38({
		method: "POST",
		fullPath: "/v1/customers/{customer}/cash_balance"
	}),
	updateSource: stripeMethod$38({
		method: "POST",
		fullPath: "/v1/customers/{customer}/sources/{id}"
	}),
	verifySource: stripeMethod$38({
		method: "POST",
		fullPath: "/v1/customers/{customer}/sources/{id}/verify"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Disputes.js
const stripeMethod$37 = StripeResource.method;
const Disputes = StripeResource.extend({
	retrieve: stripeMethod$37({
		method: "GET",
		fullPath: "/v1/disputes/{dispute}"
	}),
	update: stripeMethod$37({
		method: "POST",
		fullPath: "/v1/disputes/{dispute}"
	}),
	list: stripeMethod$37({
		method: "GET",
		fullPath: "/v1/disputes",
		methodType: "list"
	}),
	close: stripeMethod$37({
		method: "POST",
		fullPath: "/v1/disputes/{dispute}/close"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/EphemeralKeys.js
const stripeMethod$36 = StripeResource.method;
const EphemeralKeys = StripeResource.extend({
	create: stripeMethod$36({
		method: "POST",
		fullPath: "/v1/ephemeral_keys",
		validator: (data, options) => {
			if (!options.headers || !options.headers["Stripe-Version"]) throw new Error("Passing apiVersion in a separate options hash is required to create an ephemeral key. See https://stripe.com/docs/api/versioning?lang=node");
		}
	}),
	del: stripeMethod$36({
		method: "DELETE",
		fullPath: "/v1/ephemeral_keys/{key}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Events.js
const stripeMethod$35 = StripeResource.method;
const Events = StripeResource.extend({
	retrieve: stripeMethod$35({
		method: "GET",
		fullPath: "/v1/events/{id}"
	}),
	list: stripeMethod$35({
		method: "GET",
		fullPath: "/v1/events",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/ExchangeRates.js
const stripeMethod$34 = StripeResource.method;
const ExchangeRates = StripeResource.extend({
	retrieve: stripeMethod$34({
		method: "GET",
		fullPath: "/v1/exchange_rates/{rate_id}"
	}),
	list: stripeMethod$34({
		method: "GET",
		fullPath: "/v1/exchange_rates",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/FileLinks.js
const stripeMethod$33 = StripeResource.method;
const FileLinks = StripeResource.extend({
	create: stripeMethod$33({
		method: "POST",
		fullPath: "/v1/file_links"
	}),
	retrieve: stripeMethod$33({
		method: "GET",
		fullPath: "/v1/file_links/{link}"
	}),
	update: stripeMethod$33({
		method: "POST",
		fullPath: "/v1/file_links/{link}"
	}),
	list: stripeMethod$33({
		method: "GET",
		fullPath: "/v1/file_links",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/multipart.js
const multipartDataGenerator = (method, data, headers) => {
	const segno = (Math.round(Math.random() * 0x2386f26fc10000) + Math.round(Math.random() * 0x2386f26fc10000)).toString();
	headers["Content-Type"] = `multipart/form-data; boundary=${segno}`;
	const textEncoder = new TextEncoder();
	let buffer = new Uint8Array(0);
	const endBuffer = textEncoder.encode("\r\n");
	function push(l) {
		const prevBuffer = buffer;
		const newBuffer = l instanceof Uint8Array ? l : new Uint8Array(textEncoder.encode(l));
		buffer = new Uint8Array(prevBuffer.length + newBuffer.length + 2);
		buffer.set(prevBuffer);
		buffer.set(newBuffer, prevBuffer.length);
		buffer.set(endBuffer, buffer.length - 2);
	}
	function q(s) {
		return `"${s.replace(/"|"/g, "%22").replace(/\r\n|\r|\n/g, " ")}"`;
	}
	const flattenedData = flattenAndStringify(data);
	for (const k in flattenedData) {
		if (!Object.prototype.hasOwnProperty.call(flattenedData, k)) continue;
		const v = flattenedData[k];
		push(`--${segno}`);
		if (Object.prototype.hasOwnProperty.call(v, "data")) {
			const typedEntry = v;
			push(`Content-Disposition: form-data; name=${q(k)}; filename=${q(typedEntry.name || "blob")}`);
			push(`Content-Type: ${typedEntry.type || "application/octet-stream"}`);
			push("");
			push(typedEntry.data);
		} else {
			push(`Content-Disposition: form-data; name=${q(k)}`);
			push("");
			push(v);
		}
	}
	push(`--${segno}--`);
	return buffer;
};
function multipartRequestDataProcessor(method, data, headers, callback) {
	data = data || {};
	if (method !== "POST") return callback(null, stringifyRequestData(data));
	this._stripe._platformFunctions.tryBufferData(data).then((bufferedData) => {
		return callback(null, multipartDataGenerator(method, bufferedData, headers));
	}).catch((err) => callback(err, null));
}
//#endregion
//#region ../../node_modules/stripe/esm/resources/Files.js
const stripeMethod$32 = StripeResource.method;
const Files = StripeResource.extend({
	create: stripeMethod$32({
		method: "POST",
		fullPath: "/v1/files",
		headers: { "Content-Type": "multipart/form-data" },
		host: "files.stripe.com"
	}),
	retrieve: stripeMethod$32({
		method: "GET",
		fullPath: "/v1/files/{file}"
	}),
	list: stripeMethod$32({
		method: "GET",
		fullPath: "/v1/files",
		methodType: "list"
	}),
	requestDataProcessor: multipartRequestDataProcessor
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/InvoiceItems.js
const stripeMethod$31 = StripeResource.method;
const InvoiceItems = StripeResource.extend({
	create: stripeMethod$31({
		method: "POST",
		fullPath: "/v1/invoiceitems"
	}),
	retrieve: stripeMethod$31({
		method: "GET",
		fullPath: "/v1/invoiceitems/{invoiceitem}"
	}),
	update: stripeMethod$31({
		method: "POST",
		fullPath: "/v1/invoiceitems/{invoiceitem}"
	}),
	list: stripeMethod$31({
		method: "GET",
		fullPath: "/v1/invoiceitems",
		methodType: "list"
	}),
	del: stripeMethod$31({
		method: "DELETE",
		fullPath: "/v1/invoiceitems/{invoiceitem}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/InvoiceRenderingTemplates.js
const stripeMethod$30 = StripeResource.method;
const InvoiceRenderingTemplates = StripeResource.extend({
	retrieve: stripeMethod$30({
		method: "GET",
		fullPath: "/v1/invoice_rendering_templates/{template}"
	}),
	list: stripeMethod$30({
		method: "GET",
		fullPath: "/v1/invoice_rendering_templates",
		methodType: "list"
	}),
	archive: stripeMethod$30({
		method: "POST",
		fullPath: "/v1/invoice_rendering_templates/{template}/archive"
	}),
	unarchive: stripeMethod$30({
		method: "POST",
		fullPath: "/v1/invoice_rendering_templates/{template}/unarchive"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Invoices.js
const stripeMethod$29 = StripeResource.method;
const Invoices = StripeResource.extend({
	create: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices"
	}),
	retrieve: stripeMethod$29({
		method: "GET",
		fullPath: "/v1/invoices/{invoice}"
	}),
	update: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices/{invoice}"
	}),
	list: stripeMethod$29({
		method: "GET",
		fullPath: "/v1/invoices",
		methodType: "list"
	}),
	del: stripeMethod$29({
		method: "DELETE",
		fullPath: "/v1/invoices/{invoice}"
	}),
	addLines: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices/{invoice}/add_lines"
	}),
	createPreview: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices/create_preview"
	}),
	finalizeInvoice: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices/{invoice}/finalize"
	}),
	listLineItems: stripeMethod$29({
		method: "GET",
		fullPath: "/v1/invoices/{invoice}/lines",
		methodType: "list"
	}),
	listUpcomingLines: stripeMethod$29({
		method: "GET",
		fullPath: "/v1/invoices/upcoming/lines",
		methodType: "list"
	}),
	markUncollectible: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices/{invoice}/mark_uncollectible"
	}),
	pay: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices/{invoice}/pay"
	}),
	removeLines: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices/{invoice}/remove_lines"
	}),
	retrieveUpcoming: stripeMethod$29({
		method: "GET",
		fullPath: "/v1/invoices/upcoming"
	}),
	search: stripeMethod$29({
		method: "GET",
		fullPath: "/v1/invoices/search",
		methodType: "search"
	}),
	sendInvoice: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices/{invoice}/send"
	}),
	updateLines: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices/{invoice}/update_lines"
	}),
	updateLineItem: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices/{invoice}/lines/{line_item_id}"
	}),
	voidInvoice: stripeMethod$29({
		method: "POST",
		fullPath: "/v1/invoices/{invoice}/void"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Mandates.js
const stripeMethod$28 = StripeResource.method;
const Mandates = StripeResource.extend({ retrieve: stripeMethod$28({
	method: "GET",
	fullPath: "/v1/mandates/{mandate}"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/OAuth.js
const stripeMethod$27 = StripeResource.method;
const oAuthHost = "connect.stripe.com";
const OAuth = StripeResource.extend({
	basePath: "/",
	authorizeUrl(params, options) {
		params = params || {};
		options = options || {};
		let path = "oauth/authorize";
		if (options.express) path = `express/${path}`;
		if (!params.response_type) params.response_type = "code";
		if (!params.client_id) params.client_id = this._stripe.getClientId();
		if (!params.scope) params.scope = "read_write";
		return `https://${oAuthHost}/${path}?${stringifyRequestData(params)}`;
	},
	token: stripeMethod$27({
		method: "POST",
		path: "oauth/token",
		host: oAuthHost
	}),
	deauthorize(spec, ...args) {
		if (!spec.client_id) spec.client_id = this._stripe.getClientId();
		return stripeMethod$27({
			method: "POST",
			path: "oauth/deauthorize",
			host: oAuthHost
		}).apply(this, [spec, ...args]);
	}
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/PaymentIntents.js
const stripeMethod$26 = StripeResource.method;
const PaymentIntents = StripeResource.extend({
	create: stripeMethod$26({
		method: "POST",
		fullPath: "/v1/payment_intents"
	}),
	retrieve: stripeMethod$26({
		method: "GET",
		fullPath: "/v1/payment_intents/{intent}"
	}),
	update: stripeMethod$26({
		method: "POST",
		fullPath: "/v1/payment_intents/{intent}"
	}),
	list: stripeMethod$26({
		method: "GET",
		fullPath: "/v1/payment_intents",
		methodType: "list"
	}),
	applyCustomerBalance: stripeMethod$26({
		method: "POST",
		fullPath: "/v1/payment_intents/{intent}/apply_customer_balance"
	}),
	cancel: stripeMethod$26({
		method: "POST",
		fullPath: "/v1/payment_intents/{intent}/cancel"
	}),
	capture: stripeMethod$26({
		method: "POST",
		fullPath: "/v1/payment_intents/{intent}/capture"
	}),
	confirm: stripeMethod$26({
		method: "POST",
		fullPath: "/v1/payment_intents/{intent}/confirm"
	}),
	incrementAuthorization: stripeMethod$26({
		method: "POST",
		fullPath: "/v1/payment_intents/{intent}/increment_authorization"
	}),
	search: stripeMethod$26({
		method: "GET",
		fullPath: "/v1/payment_intents/search",
		methodType: "search"
	}),
	verifyMicrodeposits: stripeMethod$26({
		method: "POST",
		fullPath: "/v1/payment_intents/{intent}/verify_microdeposits"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/PaymentLinks.js
const stripeMethod$25 = StripeResource.method;
const PaymentLinks = StripeResource.extend({
	create: stripeMethod$25({
		method: "POST",
		fullPath: "/v1/payment_links"
	}),
	retrieve: stripeMethod$25({
		method: "GET",
		fullPath: "/v1/payment_links/{payment_link}"
	}),
	update: stripeMethod$25({
		method: "POST",
		fullPath: "/v1/payment_links/{payment_link}"
	}),
	list: stripeMethod$25({
		method: "GET",
		fullPath: "/v1/payment_links",
		methodType: "list"
	}),
	listLineItems: stripeMethod$25({
		method: "GET",
		fullPath: "/v1/payment_links/{payment_link}/line_items",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/PaymentMethodConfigurations.js
const stripeMethod$24 = StripeResource.method;
const PaymentMethodConfigurations = StripeResource.extend({
	create: stripeMethod$24({
		method: "POST",
		fullPath: "/v1/payment_method_configurations"
	}),
	retrieve: stripeMethod$24({
		method: "GET",
		fullPath: "/v1/payment_method_configurations/{configuration}"
	}),
	update: stripeMethod$24({
		method: "POST",
		fullPath: "/v1/payment_method_configurations/{configuration}"
	}),
	list: stripeMethod$24({
		method: "GET",
		fullPath: "/v1/payment_method_configurations",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/PaymentMethodDomains.js
const stripeMethod$23 = StripeResource.method;
const PaymentMethodDomains = StripeResource.extend({
	create: stripeMethod$23({
		method: "POST",
		fullPath: "/v1/payment_method_domains"
	}),
	retrieve: stripeMethod$23({
		method: "GET",
		fullPath: "/v1/payment_method_domains/{payment_method_domain}"
	}),
	update: stripeMethod$23({
		method: "POST",
		fullPath: "/v1/payment_method_domains/{payment_method_domain}"
	}),
	list: stripeMethod$23({
		method: "GET",
		fullPath: "/v1/payment_method_domains",
		methodType: "list"
	}),
	validate: stripeMethod$23({
		method: "POST",
		fullPath: "/v1/payment_method_domains/{payment_method_domain}/validate"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/PaymentMethods.js
const stripeMethod$22 = StripeResource.method;
const PaymentMethods = StripeResource.extend({
	create: stripeMethod$22({
		method: "POST",
		fullPath: "/v1/payment_methods"
	}),
	retrieve: stripeMethod$22({
		method: "GET",
		fullPath: "/v1/payment_methods/{payment_method}"
	}),
	update: stripeMethod$22({
		method: "POST",
		fullPath: "/v1/payment_methods/{payment_method}"
	}),
	list: stripeMethod$22({
		method: "GET",
		fullPath: "/v1/payment_methods",
		methodType: "list"
	}),
	attach: stripeMethod$22({
		method: "POST",
		fullPath: "/v1/payment_methods/{payment_method}/attach"
	}),
	detach: stripeMethod$22({
		method: "POST",
		fullPath: "/v1/payment_methods/{payment_method}/detach"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Payouts.js
const stripeMethod$21 = StripeResource.method;
const Payouts = StripeResource.extend({
	create: stripeMethod$21({
		method: "POST",
		fullPath: "/v1/payouts"
	}),
	retrieve: stripeMethod$21({
		method: "GET",
		fullPath: "/v1/payouts/{payout}"
	}),
	update: stripeMethod$21({
		method: "POST",
		fullPath: "/v1/payouts/{payout}"
	}),
	list: stripeMethod$21({
		method: "GET",
		fullPath: "/v1/payouts",
		methodType: "list"
	}),
	cancel: stripeMethod$21({
		method: "POST",
		fullPath: "/v1/payouts/{payout}/cancel"
	}),
	reverse: stripeMethod$21({
		method: "POST",
		fullPath: "/v1/payouts/{payout}/reverse"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Plans.js
const stripeMethod$20 = StripeResource.method;
const Plans = StripeResource.extend({
	create: stripeMethod$20({
		method: "POST",
		fullPath: "/v1/plans"
	}),
	retrieve: stripeMethod$20({
		method: "GET",
		fullPath: "/v1/plans/{plan}"
	}),
	update: stripeMethod$20({
		method: "POST",
		fullPath: "/v1/plans/{plan}"
	}),
	list: stripeMethod$20({
		method: "GET",
		fullPath: "/v1/plans",
		methodType: "list"
	}),
	del: stripeMethod$20({
		method: "DELETE",
		fullPath: "/v1/plans/{plan}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Prices.js
const stripeMethod$19 = StripeResource.method;
const Prices = StripeResource.extend({
	create: stripeMethod$19({
		method: "POST",
		fullPath: "/v1/prices"
	}),
	retrieve: stripeMethod$19({
		method: "GET",
		fullPath: "/v1/prices/{price}"
	}),
	update: stripeMethod$19({
		method: "POST",
		fullPath: "/v1/prices/{price}"
	}),
	list: stripeMethod$19({
		method: "GET",
		fullPath: "/v1/prices",
		methodType: "list"
	}),
	search: stripeMethod$19({
		method: "GET",
		fullPath: "/v1/prices/search",
		methodType: "search"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Products.js
const stripeMethod$18 = StripeResource.method;
const Products = StripeResource.extend({
	create: stripeMethod$18({
		method: "POST",
		fullPath: "/v1/products"
	}),
	retrieve: stripeMethod$18({
		method: "GET",
		fullPath: "/v1/products/{id}"
	}),
	update: stripeMethod$18({
		method: "POST",
		fullPath: "/v1/products/{id}"
	}),
	list: stripeMethod$18({
		method: "GET",
		fullPath: "/v1/products",
		methodType: "list"
	}),
	del: stripeMethod$18({
		method: "DELETE",
		fullPath: "/v1/products/{id}"
	}),
	createFeature: stripeMethod$18({
		method: "POST",
		fullPath: "/v1/products/{product}/features"
	}),
	deleteFeature: stripeMethod$18({
		method: "DELETE",
		fullPath: "/v1/products/{product}/features/{id}"
	}),
	listFeatures: stripeMethod$18({
		method: "GET",
		fullPath: "/v1/products/{product}/features",
		methodType: "list"
	}),
	retrieveFeature: stripeMethod$18({
		method: "GET",
		fullPath: "/v1/products/{product}/features/{id}"
	}),
	search: stripeMethod$18({
		method: "GET",
		fullPath: "/v1/products/search",
		methodType: "search"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/PromotionCodes.js
const stripeMethod$17 = StripeResource.method;
const PromotionCodes = StripeResource.extend({
	create: stripeMethod$17({
		method: "POST",
		fullPath: "/v1/promotion_codes"
	}),
	retrieve: stripeMethod$17({
		method: "GET",
		fullPath: "/v1/promotion_codes/{promotion_code}"
	}),
	update: stripeMethod$17({
		method: "POST",
		fullPath: "/v1/promotion_codes/{promotion_code}"
	}),
	list: stripeMethod$17({
		method: "GET",
		fullPath: "/v1/promotion_codes",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Quotes.js
const stripeMethod$16 = StripeResource.method;
const Quotes = StripeResource.extend({
	create: stripeMethod$16({
		method: "POST",
		fullPath: "/v1/quotes"
	}),
	retrieve: stripeMethod$16({
		method: "GET",
		fullPath: "/v1/quotes/{quote}"
	}),
	update: stripeMethod$16({
		method: "POST",
		fullPath: "/v1/quotes/{quote}"
	}),
	list: stripeMethod$16({
		method: "GET",
		fullPath: "/v1/quotes",
		methodType: "list"
	}),
	accept: stripeMethod$16({
		method: "POST",
		fullPath: "/v1/quotes/{quote}/accept"
	}),
	cancel: stripeMethod$16({
		method: "POST",
		fullPath: "/v1/quotes/{quote}/cancel"
	}),
	finalizeQuote: stripeMethod$16({
		method: "POST",
		fullPath: "/v1/quotes/{quote}/finalize"
	}),
	listComputedUpfrontLineItems: stripeMethod$16({
		method: "GET",
		fullPath: "/v1/quotes/{quote}/computed_upfront_line_items",
		methodType: "list"
	}),
	listLineItems: stripeMethod$16({
		method: "GET",
		fullPath: "/v1/quotes/{quote}/line_items",
		methodType: "list"
	}),
	pdf: stripeMethod$16({
		method: "GET",
		fullPath: "/v1/quotes/{quote}/pdf",
		host: "files.stripe.com",
		streaming: true
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Refunds.js
const stripeMethod$15 = StripeResource.method;
const Refunds = StripeResource.extend({
	create: stripeMethod$15({
		method: "POST",
		fullPath: "/v1/refunds"
	}),
	retrieve: stripeMethod$15({
		method: "GET",
		fullPath: "/v1/refunds/{refund}"
	}),
	update: stripeMethod$15({
		method: "POST",
		fullPath: "/v1/refunds/{refund}"
	}),
	list: stripeMethod$15({
		method: "GET",
		fullPath: "/v1/refunds",
		methodType: "list"
	}),
	cancel: stripeMethod$15({
		method: "POST",
		fullPath: "/v1/refunds/{refund}/cancel"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Reviews.js
const stripeMethod$14 = StripeResource.method;
const Reviews = StripeResource.extend({
	retrieve: stripeMethod$14({
		method: "GET",
		fullPath: "/v1/reviews/{review}"
	}),
	list: stripeMethod$14({
		method: "GET",
		fullPath: "/v1/reviews",
		methodType: "list"
	}),
	approve: stripeMethod$14({
		method: "POST",
		fullPath: "/v1/reviews/{review}/approve"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/SetupAttempts.js
const stripeMethod$13 = StripeResource.method;
const SetupAttempts = StripeResource.extend({ list: stripeMethod$13({
	method: "GET",
	fullPath: "/v1/setup_attempts",
	methodType: "list"
}) });
//#endregion
//#region ../../node_modules/stripe/esm/resources/SetupIntents.js
const stripeMethod$12 = StripeResource.method;
const SetupIntents = StripeResource.extend({
	create: stripeMethod$12({
		method: "POST",
		fullPath: "/v1/setup_intents"
	}),
	retrieve: stripeMethod$12({
		method: "GET",
		fullPath: "/v1/setup_intents/{intent}"
	}),
	update: stripeMethod$12({
		method: "POST",
		fullPath: "/v1/setup_intents/{intent}"
	}),
	list: stripeMethod$12({
		method: "GET",
		fullPath: "/v1/setup_intents",
		methodType: "list"
	}),
	cancel: stripeMethod$12({
		method: "POST",
		fullPath: "/v1/setup_intents/{intent}/cancel"
	}),
	confirm: stripeMethod$12({
		method: "POST",
		fullPath: "/v1/setup_intents/{intent}/confirm"
	}),
	verifyMicrodeposits: stripeMethod$12({
		method: "POST",
		fullPath: "/v1/setup_intents/{intent}/verify_microdeposits"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/ShippingRates.js
const stripeMethod$11 = StripeResource.method;
const ShippingRates = StripeResource.extend({
	create: stripeMethod$11({
		method: "POST",
		fullPath: "/v1/shipping_rates"
	}),
	retrieve: stripeMethod$11({
		method: "GET",
		fullPath: "/v1/shipping_rates/{shipping_rate_token}"
	}),
	update: stripeMethod$11({
		method: "POST",
		fullPath: "/v1/shipping_rates/{shipping_rate_token}"
	}),
	list: stripeMethod$11({
		method: "GET",
		fullPath: "/v1/shipping_rates",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Sources.js
const stripeMethod$10 = StripeResource.method;
const Sources = StripeResource.extend({
	create: stripeMethod$10({
		method: "POST",
		fullPath: "/v1/sources"
	}),
	retrieve: stripeMethod$10({
		method: "GET",
		fullPath: "/v1/sources/{source}"
	}),
	update: stripeMethod$10({
		method: "POST",
		fullPath: "/v1/sources/{source}"
	}),
	listSourceTransactions: stripeMethod$10({
		method: "GET",
		fullPath: "/v1/sources/{source}/source_transactions",
		methodType: "list"
	}),
	verify: stripeMethod$10({
		method: "POST",
		fullPath: "/v1/sources/{source}/verify"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/SubscriptionItems.js
const stripeMethod$9 = StripeResource.method;
const SubscriptionItems = StripeResource.extend({
	create: stripeMethod$9({
		method: "POST",
		fullPath: "/v1/subscription_items"
	}),
	retrieve: stripeMethod$9({
		method: "GET",
		fullPath: "/v1/subscription_items/{item}"
	}),
	update: stripeMethod$9({
		method: "POST",
		fullPath: "/v1/subscription_items/{item}"
	}),
	list: stripeMethod$9({
		method: "GET",
		fullPath: "/v1/subscription_items",
		methodType: "list"
	}),
	del: stripeMethod$9({
		method: "DELETE",
		fullPath: "/v1/subscription_items/{item}"
	}),
	createUsageRecord: stripeMethod$9({
		method: "POST",
		fullPath: "/v1/subscription_items/{subscription_item}/usage_records"
	}),
	listUsageRecordSummaries: stripeMethod$9({
		method: "GET",
		fullPath: "/v1/subscription_items/{subscription_item}/usage_record_summaries",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/SubscriptionSchedules.js
const stripeMethod$8 = StripeResource.method;
const SubscriptionSchedules = StripeResource.extend({
	create: stripeMethod$8({
		method: "POST",
		fullPath: "/v1/subscription_schedules"
	}),
	retrieve: stripeMethod$8({
		method: "GET",
		fullPath: "/v1/subscription_schedules/{schedule}"
	}),
	update: stripeMethod$8({
		method: "POST",
		fullPath: "/v1/subscription_schedules/{schedule}"
	}),
	list: stripeMethod$8({
		method: "GET",
		fullPath: "/v1/subscription_schedules",
		methodType: "list"
	}),
	cancel: stripeMethod$8({
		method: "POST",
		fullPath: "/v1/subscription_schedules/{schedule}/cancel"
	}),
	release: stripeMethod$8({
		method: "POST",
		fullPath: "/v1/subscription_schedules/{schedule}/release"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Subscriptions.js
const stripeMethod$7 = StripeResource.method;
const Subscriptions = StripeResource.extend({
	create: stripeMethod$7({
		method: "POST",
		fullPath: "/v1/subscriptions"
	}),
	retrieve: stripeMethod$7({
		method: "GET",
		fullPath: "/v1/subscriptions/{subscription_exposed_id}"
	}),
	update: stripeMethod$7({
		method: "POST",
		fullPath: "/v1/subscriptions/{subscription_exposed_id}"
	}),
	list: stripeMethod$7({
		method: "GET",
		fullPath: "/v1/subscriptions",
		methodType: "list"
	}),
	cancel: stripeMethod$7({
		method: "DELETE",
		fullPath: "/v1/subscriptions/{subscription_exposed_id}"
	}),
	deleteDiscount: stripeMethod$7({
		method: "DELETE",
		fullPath: "/v1/subscriptions/{subscription_exposed_id}/discount"
	}),
	resume: stripeMethod$7({
		method: "POST",
		fullPath: "/v1/subscriptions/{subscription}/resume"
	}),
	search: stripeMethod$7({
		method: "GET",
		fullPath: "/v1/subscriptions/search",
		methodType: "search"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TaxCodes.js
const stripeMethod$6 = StripeResource.method;
const TaxCodes = StripeResource.extend({
	retrieve: stripeMethod$6({
		method: "GET",
		fullPath: "/v1/tax_codes/{id}"
	}),
	list: stripeMethod$6({
		method: "GET",
		fullPath: "/v1/tax_codes",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TaxIds.js
const stripeMethod$5 = StripeResource.method;
const TaxIds = StripeResource.extend({
	create: stripeMethod$5({
		method: "POST",
		fullPath: "/v1/tax_ids"
	}),
	retrieve: stripeMethod$5({
		method: "GET",
		fullPath: "/v1/tax_ids/{id}"
	}),
	list: stripeMethod$5({
		method: "GET",
		fullPath: "/v1/tax_ids",
		methodType: "list"
	}),
	del: stripeMethod$5({
		method: "DELETE",
		fullPath: "/v1/tax_ids/{id}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/TaxRates.js
const stripeMethod$4 = StripeResource.method;
const TaxRates = StripeResource.extend({
	create: stripeMethod$4({
		method: "POST",
		fullPath: "/v1/tax_rates"
	}),
	retrieve: stripeMethod$4({
		method: "GET",
		fullPath: "/v1/tax_rates/{tax_rate}"
	}),
	update: stripeMethod$4({
		method: "POST",
		fullPath: "/v1/tax_rates/{tax_rate}"
	}),
	list: stripeMethod$4({
		method: "GET",
		fullPath: "/v1/tax_rates",
		methodType: "list"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Tokens.js
const stripeMethod$3 = StripeResource.method;
const Tokens = StripeResource.extend({
	create: stripeMethod$3({
		method: "POST",
		fullPath: "/v1/tokens"
	}),
	retrieve: stripeMethod$3({
		method: "GET",
		fullPath: "/v1/tokens/{token}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Topups.js
const stripeMethod$2 = StripeResource.method;
const Topups = StripeResource.extend({
	create: stripeMethod$2({
		method: "POST",
		fullPath: "/v1/topups"
	}),
	retrieve: stripeMethod$2({
		method: "GET",
		fullPath: "/v1/topups/{topup}"
	}),
	update: stripeMethod$2({
		method: "POST",
		fullPath: "/v1/topups/{topup}"
	}),
	list: stripeMethod$2({
		method: "GET",
		fullPath: "/v1/topups",
		methodType: "list"
	}),
	cancel: stripeMethod$2({
		method: "POST",
		fullPath: "/v1/topups/{topup}/cancel"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/Transfers.js
const stripeMethod$1 = StripeResource.method;
const Transfers = StripeResource.extend({
	create: stripeMethod$1({
		method: "POST",
		fullPath: "/v1/transfers"
	}),
	retrieve: stripeMethod$1({
		method: "GET",
		fullPath: "/v1/transfers/{transfer}"
	}),
	update: stripeMethod$1({
		method: "POST",
		fullPath: "/v1/transfers/{transfer}"
	}),
	list: stripeMethod$1({
		method: "GET",
		fullPath: "/v1/transfers",
		methodType: "list"
	}),
	createReversal: stripeMethod$1({
		method: "POST",
		fullPath: "/v1/transfers/{id}/reversals"
	}),
	listReversals: stripeMethod$1({
		method: "GET",
		fullPath: "/v1/transfers/{id}/reversals",
		methodType: "list"
	}),
	retrieveReversal: stripeMethod$1({
		method: "GET",
		fullPath: "/v1/transfers/{transfer}/reversals/{id}"
	}),
	updateReversal: stripeMethod$1({
		method: "POST",
		fullPath: "/v1/transfers/{transfer}/reversals/{id}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources/WebhookEndpoints.js
const stripeMethod = StripeResource.method;
const WebhookEndpoints = StripeResource.extend({
	create: stripeMethod({
		method: "POST",
		fullPath: "/v1/webhook_endpoints"
	}),
	retrieve: stripeMethod({
		method: "GET",
		fullPath: "/v1/webhook_endpoints/{webhook_endpoint}"
	}),
	update: stripeMethod({
		method: "POST",
		fullPath: "/v1/webhook_endpoints/{webhook_endpoint}"
	}),
	list: stripeMethod({
		method: "GET",
		fullPath: "/v1/webhook_endpoints",
		methodType: "list"
	}),
	del: stripeMethod({
		method: "DELETE",
		fullPath: "/v1/webhook_endpoints/{webhook_endpoint}"
	})
});
//#endregion
//#region ../../node_modules/stripe/esm/resources.js
var resources_exports = /* @__PURE__ */ __exportAll({
	Account: () => Accounts,
	AccountLinks: () => AccountLinks,
	AccountSessions: () => AccountSessions,
	Accounts: () => Accounts,
	ApplePayDomains: () => ApplePayDomains,
	ApplicationFees: () => ApplicationFees,
	Apps: () => Apps,
	Balance: () => Balance,
	BalanceTransactions: () => BalanceTransactions,
	Billing: () => Billing,
	BillingPortal: () => BillingPortal,
	Charges: () => Charges,
	Checkout: () => Checkout,
	Climate: () => Climate,
	ConfirmationTokens: () => ConfirmationTokens,
	CountrySpecs: () => CountrySpecs,
	Coupons: () => Coupons,
	CreditNotes: () => CreditNotes,
	CustomerSessions: () => CustomerSessions,
	Customers: () => Customers,
	Disputes: () => Disputes,
	Entitlements: () => Entitlements,
	EphemeralKeys: () => EphemeralKeys,
	Events: () => Events,
	ExchangeRates: () => ExchangeRates,
	FileLinks: () => FileLinks,
	Files: () => Files,
	FinancialConnections: () => FinancialConnections,
	Forwarding: () => Forwarding,
	Identity: () => Identity,
	InvoiceItems: () => InvoiceItems,
	InvoiceRenderingTemplates: () => InvoiceRenderingTemplates,
	Invoices: () => Invoices,
	Issuing: () => Issuing,
	Mandates: () => Mandates,
	OAuth: () => OAuth,
	PaymentIntents: () => PaymentIntents,
	PaymentLinks: () => PaymentLinks,
	PaymentMethodConfigurations: () => PaymentMethodConfigurations,
	PaymentMethodDomains: () => PaymentMethodDomains,
	PaymentMethods: () => PaymentMethods,
	Payouts: () => Payouts,
	Plans: () => Plans,
	Prices: () => Prices,
	Products: () => Products,
	PromotionCodes: () => PromotionCodes,
	Quotes: () => Quotes,
	Radar: () => Radar,
	Refunds: () => Refunds,
	Reporting: () => Reporting,
	Reviews: () => Reviews,
	SetupAttempts: () => SetupAttempts,
	SetupIntents: () => SetupIntents,
	ShippingRates: () => ShippingRates,
	Sigma: () => Sigma,
	Sources: () => Sources,
	SubscriptionItems: () => SubscriptionItems,
	SubscriptionSchedules: () => SubscriptionSchedules,
	Subscriptions: () => Subscriptions,
	Tax: () => Tax,
	TaxCodes: () => TaxCodes,
	TaxIds: () => TaxIds,
	TaxRates: () => TaxRates,
	Terminal: () => Terminal,
	TestHelpers: () => TestHelpers,
	Tokens: () => Tokens,
	Topups: () => Topups,
	Transfers: () => Transfers,
	Treasury: () => Treasury,
	WebhookEndpoints: () => WebhookEndpoints
});
const Apps = resourceNamespace("apps", { Secrets });
const Billing = resourceNamespace("billing", {
	Alerts,
	MeterEventAdjustments,
	MeterEvents,
	Meters
});
const BillingPortal = resourceNamespace("billingPortal", {
	Configurations: Configurations$1,
	Sessions: Sessions$2
});
const Checkout = resourceNamespace("checkout", { Sessions: Sessions$1 });
const Climate = resourceNamespace("climate", {
	Orders,
	Products: Products$1,
	Suppliers
});
const Entitlements = resourceNamespace("entitlements", {
	ActiveEntitlements,
	Features
});
const FinancialConnections = resourceNamespace("financialConnections", {
	Accounts: Accounts$1,
	Sessions,
	Transactions: Transactions$3
});
const Forwarding = resourceNamespace("forwarding", { Requests });
const Identity = resourceNamespace("identity", {
	VerificationReports,
	VerificationSessions
});
const Issuing = resourceNamespace("issuing", {
	Authorizations,
	Cardholders,
	Cards,
	Disputes: Disputes$1,
	PersonalizationDesigns,
	PhysicalBundles,
	Tokens: Tokens$1,
	Transactions: Transactions$2
});
const Radar = resourceNamespace("radar", {
	EarlyFraudWarnings,
	ValueListItems,
	ValueLists
});
const Reporting = resourceNamespace("reporting", {
	ReportRuns,
	ReportTypes
});
const Sigma = resourceNamespace("sigma", { ScheduledQueryRuns });
const Tax = resourceNamespace("tax", {
	Calculations,
	Registrations,
	Settings,
	Transactions: Transactions$1
});
const Terminal = resourceNamespace("terminal", {
	Configurations,
	ConnectionTokens,
	Locations,
	Readers
});
const TestHelpers = resourceNamespace("testHelpers", {
	ConfirmationTokens: ConfirmationTokens$1,
	Customers: Customers$1,
	Refunds: Refunds$1,
	TestClocks,
	Issuing: resourceNamespace("issuing", {
		Authorizations: Authorizations$1,
		Cards: Cards$1,
		PersonalizationDesigns: PersonalizationDesigns$1,
		Transactions: Transactions$4
	}),
	Terminal: resourceNamespace("terminal", { Readers: Readers$1 }),
	Treasury: resourceNamespace("treasury", {
		InboundTransfers: InboundTransfers$1,
		OutboundPayments: OutboundPayments$1,
		OutboundTransfers: OutboundTransfers$1,
		ReceivedCredits: ReceivedCredits$1,
		ReceivedDebits: ReceivedDebits$1
	})
});
const Treasury = resourceNamespace("treasury", {
	CreditReversals,
	DebitReversals,
	FinancialAccounts,
	InboundTransfers,
	OutboundPayments,
	OutboundTransfers,
	ReceivedCredits,
	ReceivedDebits,
	TransactionEntries,
	Transactions
});
//#endregion
//#region ../../node_modules/stripe/esm/stripe.core.js
const DEFAULT_HOST = "api.stripe.com";
const DEFAULT_PORT = "443";
const DEFAULT_BASE_PATH = "/v1/";
const DEFAULT_API_VERSION = "2024-06-20";
const DEFAULT_TIMEOUT = 8e4;
const MAX_NETWORK_RETRY_DELAY_SEC = 2;
const INITIAL_NETWORK_RETRY_DELAY_SEC = .5;
const APP_INFO_PROPERTIES = [
	"name",
	"version",
	"url",
	"partner_id"
];
const ALLOWED_CONFIG_PROPERTIES = [
	"apiVersion",
	"typescript",
	"maxNetworkRetries",
	"httpAgent",
	"httpClient",
	"timeout",
	"host",
	"port",
	"protocol",
	"telemetry",
	"appInfo",
	"stripeAccount"
];
const defaultRequestSenderFactory = (stripe) => new RequestSender(stripe, StripeResource.MAX_BUFFERED_REQUEST_METRICS);
function createStripe(platformFunctions, requestSender = defaultRequestSenderFactory) {
	Stripe.PACKAGE_VERSION = "16.12.0";
	Stripe.USER_AGENT = Object.assign({
		bindings_version: Stripe.PACKAGE_VERSION,
		lang: "node",
		publisher: "stripe",
		uname: null,
		typescript: false
	}, determineProcessUserAgentProperties());
	Stripe.StripeResource = StripeResource;
	Stripe.resources = resources_exports;
	Stripe.HttpClient = HttpClient;
	Stripe.HttpClientResponse = HttpClientResponse;
	Stripe.CryptoProvider = CryptoProvider;
	function createWebhooksDefault(fns = platformFunctions) {
		return createWebhooks(fns);
	}
	Stripe.webhooks = Object.assign(createWebhooksDefault, createWebhooks(platformFunctions));
	function Stripe(key, config = {}) {
		if (!(this instanceof Stripe)) return new Stripe(key, config);
		const props = this._getPropsFromConfig(config);
		this._platformFunctions = platformFunctions;
		Object.defineProperty(this, "_emitter", {
			value: this._platformFunctions.createEmitter(),
			enumerable: false,
			configurable: false,
			writable: false
		});
		this.VERSION = Stripe.PACKAGE_VERSION;
		this.on = this._emitter.on.bind(this._emitter);
		this.once = this._emitter.once.bind(this._emitter);
		this.off = this._emitter.removeListener.bind(this._emitter);
		const agent = props.httpAgent || null;
		this._api = {
			auth: null,
			host: props.host || DEFAULT_HOST,
			port: props.port || DEFAULT_PORT,
			protocol: props.protocol || "https",
			basePath: DEFAULT_BASE_PATH,
			version: props.apiVersion || DEFAULT_API_VERSION,
			timeout: validateInteger("timeout", props.timeout, DEFAULT_TIMEOUT),
			maxNetworkRetries: validateInteger("maxNetworkRetries", props.maxNetworkRetries, 1),
			agent,
			httpClient: props.httpClient || (agent ? this._platformFunctions.createNodeHttpClient(agent) : this._platformFunctions.createDefaultHttpClient()),
			dev: false,
			stripeAccount: props.stripeAccount || null
		};
		const typescript = props.typescript || false;
		if (typescript !== Stripe.USER_AGENT.typescript) Stripe.USER_AGENT.typescript = typescript;
		if (props.appInfo) this._setAppInfo(props.appInfo);
		this._prepResources();
		this._setApiKey(key);
		this.errors = Error_exports;
		this.webhooks = createWebhooksDefault();
		this._prevRequestMetrics = [];
		this._enableTelemetry = props.telemetry !== false;
		this._requestSender = requestSender(this);
		this.StripeResource = Stripe.StripeResource;
	}
	Stripe.errors = Error_exports;
	Stripe.createNodeHttpClient = platformFunctions.createNodeHttpClient;
	/**
	* Creates an HTTP client for issuing Stripe API requests which uses the Web
	* Fetch API.
	*
	* A fetch function can optionally be passed in as a parameter. If none is
	* passed, will default to the default `fetch` function in the global scope.
	*/
	Stripe.createFetchHttpClient = platformFunctions.createFetchHttpClient;
	/**
	* Create a CryptoProvider which uses the built-in Node crypto libraries for
	* its crypto operations.
	*/
	Stripe.createNodeCryptoProvider = platformFunctions.createNodeCryptoProvider;
	/**
	* Creates a CryptoProvider which uses the Subtle Crypto API from the Web
	* Crypto API spec for its crypto operations.
	*
	* A SubtleCrypto interface can optionally be passed in as a parameter. If none
	* is passed, will default to the default `crypto.subtle` object in the global
	* scope.
	*/
	Stripe.createSubtleCryptoProvider = platformFunctions.createSubtleCryptoProvider;
	Stripe.prototype = {
		_appInfo: void 0,
		on: null,
		off: null,
		once: null,
		VERSION: null,
		StripeResource: null,
		webhooks: null,
		errors: null,
		_api: null,
		_prevRequestMetrics: null,
		_emitter: null,
		_enableTelemetry: null,
		_requestSender: null,
		_platformFunctions: null,
		_setApiKey(key) {
			if (key) this._setApiField("auth", `Bearer ${key}`);
		},
		_setAppInfo(info) {
			if (info && typeof info !== "object") throw new Error("AppInfo must be an object.");
			if (info && !info.name) throw new Error("AppInfo.name is required");
			info = info || {};
			this._appInfo = APP_INFO_PROPERTIES.reduce((accum, prop) => {
				if (typeof info[prop] == "string") {
					accum = accum || {};
					accum[prop] = info[prop];
				}
				return accum;
			}, void 0);
		},
		_setApiField(key, value) {
			this._api[key] = value;
		},
		getApiField(key) {
			return this._api[key];
		},
		setClientId(clientId) {
			this._clientId = clientId;
		},
		getClientId() {
			return this._clientId;
		},
		getConstant: (c) => {
			switch (c) {
				case "DEFAULT_HOST": return DEFAULT_HOST;
				case "DEFAULT_PORT": return DEFAULT_PORT;
				case "DEFAULT_BASE_PATH": return DEFAULT_BASE_PATH;
				case "DEFAULT_API_VERSION": return DEFAULT_API_VERSION;
				case "DEFAULT_TIMEOUT": return DEFAULT_TIMEOUT;
				case "MAX_NETWORK_RETRY_DELAY_SEC": return MAX_NETWORK_RETRY_DELAY_SEC;
				case "INITIAL_NETWORK_RETRY_DELAY_SEC": return INITIAL_NETWORK_RETRY_DELAY_SEC;
			}
			return Stripe[c];
		},
		getMaxNetworkRetries() {
			return this.getApiField("maxNetworkRetries");
		},
		_setApiNumberField(prop, n, defaultVal) {
			const val = validateInteger(prop, n, defaultVal);
			this._setApiField(prop, val);
		},
		getMaxNetworkRetryDelay() {
			return MAX_NETWORK_RETRY_DELAY_SEC;
		},
		getInitialNetworkRetryDelay() {
			return INITIAL_NETWORK_RETRY_DELAY_SEC;
		},
		getClientUserAgent(cb) {
			return this.getClientUserAgentSeeded(Stripe.USER_AGENT, cb);
		},
		getClientUserAgentSeeded(seed, cb) {
			this._platformFunctions.getUname().then((uname) => {
				var _a;
				const userAgent = {};
				for (const field in seed) {
					if (!Object.prototype.hasOwnProperty.call(seed, field)) continue;
					userAgent[field] = encodeURIComponent((_a = seed[field]) !== null && _a !== void 0 ? _a : "null");
				}
				userAgent.uname = encodeURIComponent(uname || "UNKNOWN");
				const client = this.getApiField("httpClient");
				if (client) userAgent.httplib = encodeURIComponent(client.getClientName());
				if (this._appInfo) userAgent.application = this._appInfo;
				cb(JSON.stringify(userAgent));
			});
		},
		getAppInfoAsString() {
			if (!this._appInfo) return "";
			let formatted = this._appInfo.name;
			if (this._appInfo.version) formatted += `/${this._appInfo.version}`;
			if (this._appInfo.url) formatted += ` (${this._appInfo.url})`;
			return formatted;
		},
		getTelemetryEnabled() {
			return this._enableTelemetry;
		},
		_prepResources() {
			for (const name in resources_exports) {
				if (!Object.prototype.hasOwnProperty.call(resources_exports, name)) continue;
				this[pascalToCamelCase(name)] = new resources_exports[name](this);
			}
		},
		_getPropsFromConfig(config) {
			if (!config) return {};
			const isString = typeof config === "string";
			if (!(config === Object(config) && !Array.isArray(config)) && !isString) throw new Error("Config must either be an object or a string");
			if (isString) return { apiVersion: config };
			if (Object.keys(config).filter((value) => !ALLOWED_CONFIG_PROPERTIES.includes(value)).length > 0) throw new Error(`Config object may only contain the following: ${ALLOWED_CONFIG_PROPERTIES.join(", ")}`);
			return config;
		}
	};
	return Stripe;
}
//#endregion
//#region ../../node_modules/stripe/esm/stripe.esm.node.js
const Stripe = createStripe(new NodePlatformFunctions());
//#endregion
export { Stripe as t };
