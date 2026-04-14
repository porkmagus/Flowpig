import { t as __commonJSMin } from "../../_runtime.mjs";
//#region ../../node_modules/toad-cache/dist/toad-cache.cjs
/**
* toad-cache
*
* @copyright 2024 Igor Savin <kibertoad@gmail.com>
* @license MIT
* @version 3.7.0
*/
var require_toad_cache = /* @__PURE__ */ __commonJSMin(((exports) => {
	var FifoMap = class {
		constructor(max = 1e3, ttlInMsecs = 0) {
			if (isNaN(max) || max < 0) throw new Error("Invalid max value");
			if (isNaN(ttlInMsecs) || ttlInMsecs < 0) throw new Error("Invalid ttl value");
			this.first = null;
			this.items = /* @__PURE__ */ new Map();
			this.last = null;
			this.max = max;
			this.ttl = ttlInMsecs;
		}
		get size() {
			return this.items.size;
		}
		clear() {
			this.items = /* @__PURE__ */ new Map();
			this.first = null;
			this.last = null;
		}
		delete(key) {
			if (this.items.has(key)) {
				const deletedItem = this.items.get(key);
				this.items.delete(key);
				if (deletedItem.prev !== null) deletedItem.prev.next = deletedItem.next;
				if (deletedItem.next !== null) deletedItem.next.prev = deletedItem.prev;
				if (this.first === deletedItem) this.first = deletedItem.next;
				if (this.last === deletedItem) this.last = deletedItem.prev;
			}
		}
		deleteMany(keys) {
			for (var i = 0; i < keys.length; i++) this.delete(keys[i]);
		}
		evict() {
			if (this.size > 0) {
				const item = this.first;
				this.items.delete(item.key);
				if (this.size === 0) {
					this.first = null;
					this.last = null;
				} else {
					this.first = item.next;
					this.first.prev = null;
				}
			}
		}
		expiresAt(key) {
			if (this.items.has(key)) return this.items.get(key).expiry;
		}
		get(key) {
			if (this.items.has(key)) {
				const item = this.items.get(key);
				if (this.ttl > 0 && item.expiry <= Date.now()) {
					this.delete(key);
					return;
				}
				return item.value;
			}
		}
		getMany(keys) {
			const result = [];
			for (var i = 0; i < keys.length; i++) result.push(this.get(keys[i]));
			return result;
		}
		keys() {
			return this.items.keys();
		}
		set(key, value) {
			if (this.items.has(key)) {
				const item = this.items.get(key);
				item.value = value;
				item.expiry = this.ttl > 0 ? Date.now() + this.ttl : this.ttl;
				return;
			}
			if (this.max > 0 && this.size === this.max) this.evict();
			const item = {
				expiry: this.ttl > 0 ? Date.now() + this.ttl : this.ttl,
				key,
				prev: this.last,
				next: null,
				value
			};
			this.items.set(key, item);
			if (this.size === 1) this.first = item;
			else this.last.next = item;
			this.last = item;
		}
	};
	var LruMap = class {
		constructor(max = 1e3, ttlInMsecs = 0) {
			if (isNaN(max) || max < 0) throw new Error("Invalid max value");
			if (isNaN(ttlInMsecs) || ttlInMsecs < 0) throw new Error("Invalid ttl value");
			this.first = null;
			this.items = /* @__PURE__ */ new Map();
			this.last = null;
			this.max = max;
			this.ttl = ttlInMsecs;
		}
		get size() {
			return this.items.size;
		}
		bumpLru(item) {
			if (this.last === item) return;
			const last = this.last;
			const next = item.next;
			const prev = item.prev;
			if (this.first === item) this.first = next;
			item.next = null;
			item.prev = last;
			last.next = item;
			if (prev !== null) prev.next = next;
			if (next !== null) next.prev = prev;
			this.last = item;
		}
		clear() {
			this.items = /* @__PURE__ */ new Map();
			this.first = null;
			this.last = null;
		}
		delete(key) {
			if (this.items.has(key)) {
				const item = this.items.get(key);
				this.items.delete(key);
				if (item.prev !== null) item.prev.next = item.next;
				if (item.next !== null) item.next.prev = item.prev;
				if (this.first === item) this.first = item.next;
				if (this.last === item) this.last = item.prev;
			}
		}
		deleteMany(keys) {
			for (var i = 0; i < keys.length; i++) this.delete(keys[i]);
		}
		evict() {
			if (this.size > 0) {
				const item = this.first;
				this.items.delete(item.key);
				if (this.size === 0) {
					this.first = null;
					this.last = null;
				} else {
					this.first = item.next;
					this.first.prev = null;
				}
			}
		}
		expiresAt(key) {
			if (this.items.has(key)) return this.items.get(key).expiry;
		}
		get(key) {
			if (this.items.has(key)) {
				const item = this.items.get(key);
				if (this.ttl > 0 && item.expiry <= Date.now()) {
					this.delete(key);
					return;
				}
				this.bumpLru(item);
				return item.value;
			}
		}
		getMany(keys) {
			const result = [];
			for (var i = 0; i < keys.length; i++) result.push(this.get(keys[i]));
			return result;
		}
		keys() {
			return this.items.keys();
		}
		set(key, value) {
			if (this.items.has(key)) {
				const item = this.items.get(key);
				item.value = value;
				item.expiry = this.ttl > 0 ? Date.now() + this.ttl : this.ttl;
				if (this.last !== item) this.bumpLru(item);
				return;
			}
			if (this.max > 0 && this.size === this.max) this.evict();
			const item = {
				expiry: this.ttl > 0 ? Date.now() + this.ttl : this.ttl,
				key,
				prev: this.last,
				next: null,
				value
			};
			this.items.set(key, item);
			if (this.size === 1) this.first = item;
			else this.last.next = item;
			this.last = item;
		}
	};
	var LruObject = class {
		constructor(max = 1e3, ttlInMsecs = 0) {
			if (isNaN(max) || max < 0) throw new Error("Invalid max value");
			if (isNaN(ttlInMsecs) || ttlInMsecs < 0) throw new Error("Invalid ttl value");
			this.first = null;
			this.items = Object.create(null);
			this.last = null;
			this.size = 0;
			this.max = max;
			this.ttl = ttlInMsecs;
		}
		bumpLru(item) {
			if (this.last === item) return;
			const last = this.last;
			const next = item.next;
			const prev = item.prev;
			if (this.first === item) this.first = next;
			item.next = null;
			item.prev = last;
			last.next = item;
			if (prev !== null) prev.next = next;
			if (next !== null) next.prev = prev;
			this.last = item;
		}
		clear() {
			this.items = Object.create(null);
			this.first = null;
			this.last = null;
			this.size = 0;
		}
		delete(key) {
			if (Object.prototype.hasOwnProperty.call(this.items, key)) {
				const item = this.items[key];
				delete this.items[key];
				this.size--;
				if (item.prev !== null) item.prev.next = item.next;
				if (item.next !== null) item.next.prev = item.prev;
				if (this.first === item) this.first = item.next;
				if (this.last === item) this.last = item.prev;
			}
		}
		deleteMany(keys) {
			for (var i = 0; i < keys.length; i++) this.delete(keys[i]);
		}
		evict() {
			if (this.size > 0) {
				const item = this.first;
				delete this.items[item.key];
				if (--this.size === 0) {
					this.first = null;
					this.last = null;
				} else {
					this.first = item.next;
					this.first.prev = null;
				}
			}
		}
		expiresAt(key) {
			if (Object.prototype.hasOwnProperty.call(this.items, key)) return this.items[key].expiry;
		}
		get(key) {
			if (Object.prototype.hasOwnProperty.call(this.items, key)) {
				const item = this.items[key];
				if (this.ttl > 0 && item.expiry <= Date.now()) {
					this.delete(key);
					return;
				}
				this.bumpLru(item);
				return item.value;
			}
		}
		getMany(keys) {
			const result = [];
			for (var i = 0; i < keys.length; i++) result.push(this.get(keys[i]));
			return result;
		}
		keys() {
			return Object.keys(this.items);
		}
		set(key, value) {
			if (Object.prototype.hasOwnProperty.call(this.items, key)) {
				const item = this.items[key];
				item.value = value;
				item.expiry = this.ttl > 0 ? Date.now() + this.ttl : this.ttl;
				if (this.last !== item) this.bumpLru(item);
				return;
			}
			if (this.max > 0 && this.size === this.max) this.evict();
			const item = {
				expiry: this.ttl > 0 ? Date.now() + this.ttl : this.ttl,
				key,
				prev: this.last,
				next: null,
				value
			};
			this.items[key] = item;
			if (++this.size === 1) this.first = item;
			else this.last.next = item;
			this.last = item;
		}
	};
	var HitStatisticsRecord = class {
		constructor() {
			this.records = {};
		}
		initForCache(cacheId, currentTimeStamp) {
			this.records[cacheId] = { [currentTimeStamp]: {
				cacheSize: 0,
				hits: 0,
				falsyHits: 0,
				emptyHits: 0,
				misses: 0,
				expirations: 0,
				evictions: 0,
				invalidateOne: 0,
				invalidateAll: 0,
				sets: 0
			} };
		}
		resetForCache(cacheId) {
			for (let key of Object.keys(this.records[cacheId])) this.records[cacheId][key] = {
				cacheSize: 0,
				hits: 0,
				falsyHits: 0,
				emptyHits: 0,
				misses: 0,
				expirations: 0,
				evictions: 0,
				invalidateOne: 0,
				invalidateAll: 0,
				sets: 0
			};
		}
		getStatistics() {
			return this.records;
		}
	};
	/**
	*
	* @param {Date} date
	* @returns {string}
	*/
	function getTimestamp(date) {
		return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}`;
	}
	var HitStatistics = class {
		constructor(cacheId, statisticTtlInHours, globalStatisticsRecord) {
			this.cacheId = cacheId;
			this.statisticTtlInHours = statisticTtlInHours;
			this.collectionStart = /* @__PURE__ */ new Date();
			this.currentTimeStamp = getTimestamp(this.collectionStart);
			this.records = globalStatisticsRecord || new HitStatisticsRecord();
			this.records.initForCache(this.cacheId, this.currentTimeStamp);
		}
		get currentRecord() {
			/* c8 ignore next 14 */
			if (!this.records.records[this.cacheId][this.currentTimeStamp]) this.records.records[this.cacheId][this.currentTimeStamp] = {
				cacheSize: 0,
				hits: 0,
				falsyHits: 0,
				emptyHits: 0,
				misses: 0,
				expirations: 0,
				evictions: 0,
				sets: 0,
				invalidateOne: 0,
				invalidateAll: 0
			};
			return this.records.records[this.cacheId][this.currentTimeStamp];
		}
		hoursPassed() {
			return (Date.now() - this.collectionStart) / 1e3 / 60 / 60;
		}
		addHit() {
			this.archiveIfNeeded();
			this.currentRecord.hits++;
		}
		addFalsyHit() {
			this.archiveIfNeeded();
			this.currentRecord.falsyHits++;
		}
		addEmptyHit() {
			this.archiveIfNeeded();
			this.currentRecord.emptyHits++;
		}
		addMiss() {
			this.archiveIfNeeded();
			this.currentRecord.misses++;
		}
		addEviction() {
			this.archiveIfNeeded();
			this.currentRecord.evictions++;
		}
		setCacheSize(currentSize) {
			this.archiveIfNeeded();
			this.currentRecord.cacheSize = currentSize;
		}
		addExpiration() {
			this.archiveIfNeeded();
			this.currentRecord.expirations++;
		}
		addSet() {
			this.archiveIfNeeded();
			this.currentRecord.sets++;
		}
		addInvalidateOne() {
			this.archiveIfNeeded();
			this.currentRecord.invalidateOne++;
		}
		addInvalidateAll() {
			this.archiveIfNeeded();
			this.currentRecord.invalidateAll++;
		}
		getStatistics() {
			return this.records.getStatistics();
		}
		archiveIfNeeded() {
			if (this.hoursPassed() >= this.statisticTtlInHours) {
				this.collectionStart = /* @__PURE__ */ new Date();
				this.currentTimeStamp = getTimestamp(this.collectionStart);
				this.records.initForCache(this.cacheId, this.currentTimeStamp);
			}
		}
	};
	var LruObjectHitStatistics = class extends LruObject {
		constructor(max, ttlInMsecs, cacheId, globalStatisticsRecord, statisticTtlInHours) {
			super(max || 1e3, ttlInMsecs || 0);
			if (!cacheId) throw new Error("Cache id is mandatory");
			this.hitStatistics = new HitStatistics(cacheId, statisticTtlInHours !== void 0 ? statisticTtlInHours : 24, globalStatisticsRecord);
		}
		getStatistics() {
			return this.hitStatistics.getStatistics();
		}
		set(key, value) {
			super.set(key, value);
			this.hitStatistics.addSet();
			this.hitStatistics.setCacheSize(this.size);
		}
		evict() {
			super.evict();
			this.hitStatistics.addEviction();
			this.hitStatistics.setCacheSize(this.size);
		}
		delete(key, isExpiration = false) {
			super.delete(key);
			if (!isExpiration) this.hitStatistics.addInvalidateOne();
			this.hitStatistics.setCacheSize(this.size);
		}
		clear() {
			super.clear();
			this.hitStatistics.addInvalidateAll();
			this.hitStatistics.setCacheSize(this.size);
		}
		get(key) {
			if (Object.prototype.hasOwnProperty.call(this.items, key)) {
				const item = this.items[key];
				if (this.ttl > 0 && item.expiry <= Date.now()) {
					this.delete(key, true);
					this.hitStatistics.addExpiration();
					return;
				}
				this.bumpLru(item);
				if (!item.value) this.hitStatistics.addFalsyHit();
				if (item.value === void 0 || item.value === null || item.value === "") this.hitStatistics.addEmptyHit();
				this.hitStatistics.addHit();
				return item.value;
			}
			this.hitStatistics.addMiss();
		}
	};
	var FifoObject = class {
		constructor(max = 1e3, ttlInMsecs = 0) {
			if (isNaN(max) || max < 0) throw new Error("Invalid max value");
			if (isNaN(ttlInMsecs) || ttlInMsecs < 0) throw new Error("Invalid ttl value");
			this.first = null;
			this.items = Object.create(null);
			this.last = null;
			this.size = 0;
			this.max = max;
			this.ttl = ttlInMsecs;
		}
		clear() {
			this.items = Object.create(null);
			this.first = null;
			this.last = null;
			this.size = 0;
		}
		delete(key) {
			if (Object.prototype.hasOwnProperty.call(this.items, key)) {
				const deletedItem = this.items[key];
				delete this.items[key];
				this.size--;
				if (deletedItem.prev !== null) deletedItem.prev.next = deletedItem.next;
				if (deletedItem.next !== null) deletedItem.next.prev = deletedItem.prev;
				if (this.first === deletedItem) this.first = deletedItem.next;
				if (this.last === deletedItem) this.last = deletedItem.prev;
			}
		}
		deleteMany(keys) {
			for (var i = 0; i < keys.length; i++) this.delete(keys[i]);
		}
		evict() {
			if (this.size > 0) {
				const item = this.first;
				delete this.items[item.key];
				if (--this.size === 0) {
					this.first = null;
					this.last = null;
				} else {
					this.first = item.next;
					this.first.prev = null;
				}
			}
		}
		expiresAt(key) {
			if (Object.prototype.hasOwnProperty.call(this.items, key)) return this.items[key].expiry;
		}
		get(key) {
			if (Object.prototype.hasOwnProperty.call(this.items, key)) {
				const item = this.items[key];
				if (this.ttl > 0 && item.expiry <= Date.now()) {
					this.delete(key);
					return;
				}
				return item.value;
			}
		}
		getMany(keys) {
			const result = [];
			for (var i = 0; i < keys.length; i++) result.push(this.get(keys[i]));
			return result;
		}
		keys() {
			return Object.keys(this.items);
		}
		set(key, value) {
			if (Object.prototype.hasOwnProperty.call(this.items, key)) {
				const item = this.items[key];
				item.value = value;
				item.expiry = this.ttl > 0 ? Date.now() + this.ttl : this.ttl;
				return;
			}
			if (this.max > 0 && this.size === this.max) this.evict();
			const item = {
				expiry: this.ttl > 0 ? Date.now() + this.ttl : this.ttl,
				key,
				prev: this.last,
				next: null,
				value
			};
			this.items[key] = item;
			if (++this.size === 1) this.first = item;
			else this.last.next = item;
			this.last = item;
		}
	};
	exports.Fifo = FifoObject;
	exports.FifoMap = FifoMap;
	exports.FifoObject = FifoObject;
	exports.HitStatisticsRecord = HitStatisticsRecord;
	exports.Lru = LruObject;
	exports.LruHitStatistics = LruObjectHitStatistics;
	exports.LruMap = LruMap;
	exports.LruObject = LruObject;
	exports.LruObjectHitStatistics = LruObjectHitStatistics;
}));
//#endregion
//#region ../../node_modules/fastify-plugin/lib/getPluginName.js
var require_getPluginName = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const fpStackTracePattern = /at\s(?:.*\.)?plugin\s.*\n\s*(.*)/;
	const fileNamePattern = /(\w*(\.\w*)*)\..*/;
	module.exports = function getPluginName(fn) {
		if (fn.name.length > 0) return fn.name;
		const stackTraceLimit = Error.stackTraceLimit;
		Error.stackTraceLimit = 10;
		try {
			throw new Error("anonymous function");
		} catch (e) {
			Error.stackTraceLimit = stackTraceLimit;
			return extractPluginName(e.stack);
		}
	};
	function extractPluginName(stack) {
		const m = stack.match(fpStackTracePattern);
		return m ? m[1].split(/[/\\]/).slice(-1)[0].match(fileNamePattern)[1] : "anonymous";
	}
	module.exports.extractPluginName = extractPluginName;
}));
//#endregion
//#region ../../node_modules/fastify-plugin/lib/toCamelCase.js
var require_toCamelCase = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function toCamelCase(name) {
		if (name[0] === "@") name = name.slice(1).replace("/", "-");
		return name.replace(/-(.)/g, function(match, g1) {
			return g1.toUpperCase();
		});
	};
}));
//#endregion
//#region ../../node_modules/fastify-plugin/plugin.js
var require_plugin = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const getPluginName = require_getPluginName();
	const toCamelCase = require_toCamelCase();
	let count = 0;
	function plugin(fn, options = {}) {
		let autoName = false;
		if (fn.default !== void 0) fn = fn.default;
		if (typeof fn !== "function") throw new TypeError(`fastify-plugin expects a function, instead got a '${typeof fn}'`);
		if (typeof options === "string") options = { fastify: options };
		if (typeof options !== "object" || Array.isArray(options) || options === null) throw new TypeError("The options object should be an object");
		if (options.fastify !== void 0 && typeof options.fastify !== "string") throw new TypeError(`fastify-plugin expects a version string, instead got '${typeof options.fastify}'`);
		if (!options.name) {
			autoName = true;
			options.name = getPluginName(fn) + "-auto-" + count++;
		}
		fn[Symbol.for("skip-override")] = options.encapsulate !== true;
		fn[Symbol.for("fastify.display-name")] = options.name;
		fn[Symbol.for("plugin-meta")] = options;
		if (!fn.default) fn.default = fn;
		const camelCase = toCamelCase(options.name);
		if (!autoName && !fn[camelCase]) fn[camelCase] = fn;
		return fn;
	}
	module.exports = plugin;
	module.exports.default = plugin;
	module.exports.fastifyPlugin = plugin;
}));
//#endregion
//#region ../../node_modules/@fastify/cors/vary.js
var require_vary = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const { FifoMap: FifoCache } = require_toad_cache();
	/**
	* Field Value Components
	* Most HTTP header field values are defined using common syntax
	* components (token, quoted-string, and comment) separated by
	* whitespace or specific delimiting characters.  Delimiters are chosen
	* from the set of US-ASCII visual characters not allowed in a token
	* (DQUOTE and "(),/:;<=>?@[\]{}").
	*
	* field-name    = token
	* token         = 1*tchar
	* tchar         = "!" / "#" / "$" / "%" / "&" / "'" / "*"
	*               / "+" / "-" / "." / "^" / "_" / "`" / "|" / "~"
	*               / DIGIT / ALPHA
	*               ; any VCHAR, except delimiters
	*
	* @see https://datatracker.ietf.org/doc/html/rfc7230#section-3.2.6
	*/
	const validFieldnameRE = /^[!#$%&'*+\-.^\w`|~]+$/u;
	function validateFieldname(fieldname) {
		if (validFieldnameRE.test(fieldname) === false) throw new TypeError("Fieldname contains invalid characters.");
	}
	function parse(header) {
		header = header.trim().toLowerCase();
		const result = [];
		if (header.length === 0) {} else if (header.indexOf(",") === -1) result.push(header);
		else {
			const il = header.length;
			let i = 0;
			let pos = 0;
			let char;
			for (; i < il; ++i) {
				char = header[i];
				if (char === " ") pos = i + 1;
				else if (char === ",") {
					if (pos !== i) result.push(header.slice(pos, i));
					pos = i + 1;
				}
			}
			if (pos !== i) result.push(header.slice(pos, i));
		}
		return result;
	}
	function createAddFieldnameToVary(fieldname) {
		const headerCache = new FifoCache(1e3);
		validateFieldname(fieldname);
		return function(reply) {
			let header = reply.getHeader("Vary");
			if (!header) {
				reply.header("Vary", fieldname);
				return;
			}
			if (header === "*") return;
			if (fieldname === "*") {
				reply.header("Vary", "*");
				return;
			}
			if (Array.isArray(header)) header = header.join(", ");
			if (headerCache.get(header) === void 0) {
				const vals = parse(header);
				if (vals.indexOf("*") !== -1) headerCache.set(header, "*");
				else if (vals.indexOf(fieldname.toLowerCase()) === -1) headerCache.set(header, header + ", " + fieldname);
				else headerCache.set(header, null);
			}
			const cached = headerCache.get(header);
			if (cached !== null) reply.header("Vary", cached);
		};
	}
	module.exports.createAddFieldnameToVary = createAddFieldnameToVary;
	module.exports.addOriginToVaryHeader = createAddFieldnameToVary("Origin");
	module.exports.addAccessControlRequestHeadersToVaryHeader = createAddFieldnameToVary("Access-Control-Request-Headers");
	module.exports.parse = parse;
}));
//#endregion
//#region ../../node_modules/@fastify/cors/index.js
var require_cors = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const fp = require_plugin();
	const { addAccessControlRequestHeadersToVaryHeader, addOriginToVaryHeader } = require_vary();
	const defaultOptions = {
		origin: "*",
		methods: "GET,HEAD,POST",
		hook: "onRequest",
		preflightContinue: false,
		optionsSuccessStatus: 204,
		credentials: false,
		exposedHeaders: null,
		allowedHeaders: null,
		maxAge: null,
		preflight: true,
		strictPreflight: true
	};
	const validHooks = [
		"onRequest",
		"preParsing",
		"preValidation",
		"preHandler",
		"preSerialization",
		"onSend"
	];
	const hookWithPayload = [
		"preSerialization",
		"preParsing",
		"onSend"
	];
	function validateHook(value, next) {
		if (validHooks.indexOf(value) !== -1) return;
		next(/* @__PURE__ */ new TypeError("@fastify/cors: Invalid hook option provided."));
	}
	function fastifyCors(fastify, opts, next) {
		fastify.decorateRequest("corsPreflightEnabled", false);
		let hideOptionsRoute = true;
		let logLevel;
		if (typeof opts === "function") handleCorsOptionsDelegator(opts, fastify, { hook: defaultOptions.hook }, next);
		else if (opts.delegator) {
			const { delegator, ...options } = opts;
			handleCorsOptionsDelegator(delegator, fastify, options, next);
		} else {
			const corsOptions = normalizeCorsOptions(opts);
			validateHook(corsOptions.hook, next);
			if (hookWithPayload.indexOf(corsOptions.hook) !== -1) fastify.addHook(corsOptions.hook, function handleCors(req, reply, _payload, next) {
				addCorsHeadersHandler(fastify, corsOptions, req, reply, next);
			});
			else fastify.addHook(corsOptions.hook, function handleCors(req, reply, next) {
				addCorsHeadersHandler(fastify, corsOptions, req, reply, next);
			});
		}
		if (opts.logLevel !== void 0) logLevel = opts.logLevel;
		if (opts.hideOptionsRoute !== void 0) hideOptionsRoute = opts.hideOptionsRoute;
		fastify.options("*", {
			schema: { hide: hideOptionsRoute },
			logLevel
		}, (req, reply) => {
			if (!req.corsPreflightEnabled) {
				reply.callNotFound();
				return;
			}
			reply.send();
		});
		next();
	}
	function handleCorsOptionsDelegator(optionsResolver, fastify, opts, next) {
		const hook = opts?.hook || defaultOptions.hook;
		validateHook(hook, next);
		if (optionsResolver.length === 2) if (hookWithPayload.indexOf(hook) !== -1) fastify.addHook(hook, function handleCors(req, reply, _payload, next) {
			handleCorsOptionsCallbackDelegator(optionsResolver, fastify, req, reply, next);
		});
		else fastify.addHook(hook, function handleCors(req, reply, next) {
			handleCorsOptionsCallbackDelegator(optionsResolver, fastify, req, reply, next);
		});
		else if (hookWithPayload.indexOf(hook) !== -1) fastify.addHook(hook, function handleCors(req, reply, _payload, next) {
			const ret = optionsResolver(req);
			if (ret && typeof ret.then === "function") {
				ret.then((options) => addCorsHeadersHandler(fastify, normalizeCorsOptions(options, true), req, reply, next)).catch(next);
				return;
			}
			next(/* @__PURE__ */ new Error("Invalid CORS origin option"));
		});
		else fastify.addHook(hook, function handleCors(req, reply, next) {
			const ret = optionsResolver(req);
			if (ret && typeof ret.then === "function") {
				ret.then((options) => addCorsHeadersHandler(fastify, normalizeCorsOptions(options, true), req, reply, next)).catch(next);
				return;
			}
			next(/* @__PURE__ */ new Error("Invalid CORS origin option"));
		});
	}
	function handleCorsOptionsCallbackDelegator(optionsResolver, fastify, req, reply, next) {
		optionsResolver(req, (err, options) => {
			if (err) next(err);
			else addCorsHeadersHandler(fastify, normalizeCorsOptions(options, true), req, reply, next);
		});
	}
	/**
	* @param {import('./types').FastifyCorsOptions} opts
	*/
	function normalizeCorsOptions(opts, dynamic) {
		const corsOptions = {
			...defaultOptions,
			...opts
		};
		if (Array.isArray(opts.origin) && opts.origin.indexOf("*") !== -1) corsOptions.origin = "*";
		if (Number.isInteger(corsOptions.cacheControl)) corsOptions.cacheControl = `max-age=${corsOptions.cacheControl}`;
		else if (typeof corsOptions.cacheControl !== "string") corsOptions.cacheControl = null;
		corsOptions.dynamic = dynamic || false;
		return corsOptions;
	}
	function addCorsHeadersHandler(fastify, globalOptions, req, reply, next) {
		const options = {
			...globalOptions,
			...req.routeOptions.config?.cors
		};
		if (typeof options.origin !== "string" && options.origin !== false || options.dynamic) addOriginToVaryHeader(reply);
		(typeof options.origin === "function" ? resolveOriginWrapper(fastify, options.origin) : (_, cb) => cb(null, options.origin))(req, (error, resolvedOriginOption) => {
			if (error !== null) return next(error);
			if (resolvedOriginOption === false) return next();
			if (req.routeOptions.config?.cors === false) return next();
			if (!resolvedOriginOption) return next(/* @__PURE__ */ new Error("Invalid CORS origin option"));
			addCorsHeaders(req, reply, resolvedOriginOption, options);
			if (req.raw.method === "OPTIONS" && options.preflight === true) {
				if (options.strictPreflight === true && (!req.headers.origin || !req.headers["access-control-request-method"])) {
					reply.status(400).type("text/plain").send("Invalid Preflight Request");
					return;
				}
				req.corsPreflightEnabled = true;
				addPreflightHeaders(req, reply, options);
				if (!options.preflightContinue) {
					reply.code(options.optionsSuccessStatus).header("Content-Length", "0").send();
					return;
				}
			}
			return next();
		});
	}
	function addCorsHeaders(req, reply, originOption, corsOptions) {
		const origin = getAccessControlAllowOriginHeader(req.headers.origin, originOption);
		if (origin) reply.header("Access-Control-Allow-Origin", origin);
		if (corsOptions.credentials) reply.header("Access-Control-Allow-Credentials", "true");
		if (corsOptions.exposedHeaders !== null) reply.header("Access-Control-Expose-Headers", Array.isArray(corsOptions.exposedHeaders) ? corsOptions.exposedHeaders.join(", ") : corsOptions.exposedHeaders);
	}
	function addPreflightHeaders(req, reply, corsOptions) {
		reply.header("Access-Control-Allow-Methods", Array.isArray(corsOptions.methods) ? corsOptions.methods.join(", ") : corsOptions.methods);
		if (corsOptions.allowedHeaders === null) {
			addAccessControlRequestHeadersToVaryHeader(reply);
			const reqAllowedHeaders = req.headers["access-control-request-headers"];
			if (reqAllowedHeaders !== void 0) reply.header("Access-Control-Allow-Headers", reqAllowedHeaders);
		} else reply.header("Access-Control-Allow-Headers", Array.isArray(corsOptions.allowedHeaders) ? corsOptions.allowedHeaders.join(", ") : corsOptions.allowedHeaders);
		if (corsOptions.maxAge !== null) reply.header("Access-Control-Max-Age", String(corsOptions.maxAge));
		if (corsOptions.cacheControl) reply.header("Cache-Control", corsOptions.cacheControl);
	}
	function resolveOriginWrapper(fastify, origin) {
		return function(req, cb) {
			const result = origin.call(fastify, req.headers.origin, cb);
			if (result && typeof result.then === "function") result.then((res) => cb(null, res), cb);
		};
	}
	function getAccessControlAllowOriginHeader(reqOrigin, originOption) {
		if (typeof originOption === "string") return originOption;
		return isRequestOriginAllowed(reqOrigin, originOption) ? reqOrigin : false;
	}
	function isRequestOriginAllowed(reqOrigin, allowedOrigin) {
		if (Array.isArray(allowedOrigin)) {
			for (let i = 0; i < allowedOrigin.length; ++i) if (isRequestOriginAllowed(reqOrigin, allowedOrigin[i])) return true;
			return false;
		} else if (typeof allowedOrigin === "string") return reqOrigin === allowedOrigin;
		else if (allowedOrigin instanceof RegExp) {
			allowedOrigin.lastIndex = 0;
			return allowedOrigin.test(reqOrigin);
		} else return !!allowedOrigin;
	}
	const _fastifyCors = fp(fastifyCors, {
		fastify: "5.x",
		name: "@fastify/cors"
	});
	/**
	* These export configurations enable JS and TS developers
	* to consumer fastify in whatever way best suits their needs.
	*/
	module.exports = _fastifyCors;
	module.exports.fastifyCors = _fastifyCors;
	module.exports.default = _fastifyCors;
}));
//#endregion
export { require_plugin as n, require_toad_cache as r, require_cors as t };
