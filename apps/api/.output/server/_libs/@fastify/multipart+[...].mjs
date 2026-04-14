import { r as __require, t as __commonJSMin } from "../../_runtime.mjs";
import { t as require_error } from "../fastify__error.mjs";
import { n as require_plugin } from "./cors+[...].mjs";
import { t as require_main } from "../fastify__busboy.mjs";
import { t as require_deepmerge } from "../fastify__deepmerge.mjs";
//#region ../../node_modules/secure-json-parse/index.js
var require_secure_json_parse = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const hasBuffer = typeof Buffer !== "undefined";
	const suspectProtoRx = /"(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])"\s*:/;
	const suspectConstructorRx = /"(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)"\s*:/;
	/**
	* @description Internal parse function that parses JSON text with security checks.
	* @private
	* @param {string|Buffer} text - The JSON text string or Buffer to parse.
	* @param {Function} [reviver] - The JSON.parse() optional reviver argument.
	* @param {import('./types').ParseOptions} [options] - Optional configuration object.
	* @returns {*} The parsed object.
	* @throws {SyntaxError} If a forbidden prototype property is found and `options.protoAction` or
	* `options.constructorAction` is `'error'`.
	*/
	function _parse(text, reviver, options) {
		if (options == null) {
			if (reviver !== null && typeof reviver === "object") {
				options = reviver;
				reviver = void 0;
			}
		}
		if (hasBuffer && Buffer.isBuffer(text)) text = text.toString();
		if (text && text.charCodeAt(0) === 65279) text = text.slice(1);
		const obj = JSON.parse(text, reviver);
		if (obj === null || typeof obj !== "object") return obj;
		const protoAction = options && options.protoAction || "error";
		const constructorAction = options && options.constructorAction || "error";
		if (protoAction === "ignore" && constructorAction === "ignore") return obj;
		if (protoAction !== "ignore" && constructorAction !== "ignore") {
			if (suspectProtoRx.test(text) === false && suspectConstructorRx.test(text) === false) return obj;
		} else if (protoAction !== "ignore" && constructorAction === "ignore") {
			if (suspectProtoRx.test(text) === false) return obj;
		} else if (suspectConstructorRx.test(text) === false) return obj;
		return filter(obj, {
			protoAction,
			constructorAction,
			safe: options && options.safe
		});
	}
	/**
	* @description Scans and filters an object for forbidden prototype properties.
	* @param {Object} obj - The object being scanned.
	* @param {import('./types').ParseOptions} [options] - Optional configuration object.
	* @returns {Object|null} The filtered object, or `null` if safe mode is enabled and issues are found.
	* @throws {SyntaxError} If a forbidden prototype property is found and `options.protoAction` or
	* `options.constructorAction` is `'error'`.
	*/
	function filter(obj, { protoAction = "error", constructorAction = "error", safe } = {}) {
		let next = [obj];
		while (next.length) {
			const nodes = next;
			next = [];
			for (const node of nodes) {
				if (protoAction !== "ignore" && Object.prototype.hasOwnProperty.call(node, "__proto__")) {
					if (safe === true) return null;
					else if (protoAction === "error") throw new SyntaxError("Object contains forbidden prototype property");
					delete node.__proto__;
				}
				if (constructorAction !== "ignore" && Object.prototype.hasOwnProperty.call(node, "constructor") && node.constructor !== null && typeof node.constructor === "object" && Object.prototype.hasOwnProperty.call(node.constructor, "prototype")) {
					if (safe === true) return null;
					else if (constructorAction === "error") throw new SyntaxError("Object contains forbidden prototype property");
					delete node.constructor;
				}
				for (const key in node) {
					const value = node[key];
					if (value && typeof value === "object") next.push(value);
				}
			}
		}
		return obj;
	}
	/**
	* @description Parses a given JSON-formatted text into an object.
	* @param {string|Buffer} text - The JSON text string or Buffer to parse.
	* @param {Function} [reviver] - The `JSON.parse()` optional reviver argument, or options object.
	* @param {import('./types').ParseOptions} [options] - Optional configuration object.
	* @returns {*} The parsed object.
	* @throws {SyntaxError} If the JSON text is malformed or contains forbidden prototype properties
	* when `options.protoAction` or `options.constructorAction` is `'error'`.
	*/
	function parse(text, reviver, options) {
		const { stackTraceLimit } = Error;
		Error.stackTraceLimit = 0;
		try {
			return _parse(text, reviver, options);
		} finally {
			Error.stackTraceLimit = stackTraceLimit;
		}
	}
	/**
	* @description Safely parses a given JSON-formatted text into an object.
	* @param {string|Buffer} text - The JSON text string or Buffer to parse.
	* @param {Function} [reviver] - The `JSON.parse()` optional reviver argument.
	* @returns {*|null|undefined} The parsed object, `null` if security issues found, or `undefined` on parse error.
	*/
	function safeParse(text, reviver) {
		const { stackTraceLimit } = Error;
		Error.stackTraceLimit = 0;
		try {
			return _parse(text, reviver, { safe: true });
		} catch {
			return;
		} finally {
			Error.stackTraceLimit = stackTraceLimit;
		}
	}
	module.exports = parse;
	module.exports.default = parse;
	module.exports.parse = parse;
	module.exports.safeParse = safeParse;
	module.exports.scan = filter;
}));
//#endregion
//#region ../../node_modules/@fastify/multipart/lib/generateId.js
var require_generateId = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const HEX = [
		"00",
		"01",
		"02",
		"03",
		"04",
		"05",
		"06",
		"07",
		"08",
		"09",
		"0a",
		"0b",
		"0c",
		"0d",
		"0e",
		"0f",
		"10",
		"11",
		"12",
		"13",
		"14",
		"15",
		"16",
		"17",
		"18",
		"19",
		"1a",
		"1b",
		"1c",
		"1d",
		"1e",
		"1f",
		"20",
		"21",
		"22",
		"23",
		"24",
		"25",
		"26",
		"27",
		"28",
		"29",
		"2a",
		"2b",
		"2c",
		"2d",
		"2e",
		"2f",
		"30",
		"31",
		"32",
		"33",
		"34",
		"35",
		"36",
		"37",
		"38",
		"39",
		"3a",
		"3b",
		"3c",
		"3d",
		"3e",
		"3f",
		"40",
		"41",
		"42",
		"43",
		"44",
		"45",
		"46",
		"47",
		"48",
		"49",
		"4a",
		"4b",
		"4c",
		"4d",
		"4e",
		"4f",
		"50",
		"51",
		"52",
		"53",
		"54",
		"55",
		"56",
		"57",
		"58",
		"59",
		"5a",
		"5b",
		"5c",
		"5d",
		"5e",
		"5f",
		"60",
		"61",
		"62",
		"63",
		"64",
		"65",
		"66",
		"67",
		"68",
		"69",
		"6a",
		"6b",
		"6c",
		"6d",
		"6e",
		"6f",
		"70",
		"71",
		"72",
		"73",
		"74",
		"75",
		"76",
		"77",
		"78",
		"79",
		"7a",
		"7b",
		"7c",
		"7d",
		"7e",
		"7f",
		"80",
		"81",
		"82",
		"83",
		"84",
		"85",
		"86",
		"87",
		"88",
		"89",
		"8a",
		"8b",
		"8c",
		"8d",
		"8e",
		"8f",
		"90",
		"91",
		"92",
		"93",
		"94",
		"95",
		"96",
		"97",
		"98",
		"99",
		"9a",
		"9b",
		"9c",
		"9d",
		"9e",
		"9f",
		"a0",
		"a1",
		"a2",
		"a3",
		"a4",
		"a5",
		"a6",
		"a7",
		"a8",
		"a9",
		"aa",
		"ab",
		"ac",
		"ad",
		"ae",
		"af",
		"b0",
		"b1",
		"b2",
		"b3",
		"b4",
		"b5",
		"b6",
		"b7",
		"b8",
		"b9",
		"ba",
		"bb",
		"bc",
		"bd",
		"be",
		"bf",
		"c0",
		"c1",
		"c2",
		"c3",
		"c4",
		"c5",
		"c6",
		"c7",
		"c8",
		"c9",
		"ca",
		"cb",
		"cc",
		"cd",
		"ce",
		"cf",
		"d0",
		"d1",
		"d2",
		"d3",
		"d4",
		"d5",
		"d6",
		"d7",
		"d8",
		"d9",
		"da",
		"db",
		"dc",
		"dd",
		"de",
		"df",
		"e0",
		"e1",
		"e2",
		"e3",
		"e4",
		"e5",
		"e6",
		"e7",
		"e8",
		"e9",
		"ea",
		"eb",
		"ec",
		"ed",
		"ee",
		"ef",
		"f0",
		"f1",
		"f2",
		"f3",
		"f4",
		"f5",
		"f6",
		"f7",
		"f8",
		"f9",
		"fa",
		"fb",
		"fc",
		"fd",
		"fe",
		"ff"
	];
	const random = Math.random;
	function seed() {
		return HEX[255 * random() | 0] + HEX[255 * random() | 0] + HEX[255 * random() | 0] + HEX[255 * random() | 0] + HEX[255 * random() | 0] + HEX[255 * random() | 0] + HEX[255 * random() | 0];
	}
	module.exports.generateId = (function generateIdFn() {
		let num = 0;
		let str = seed();
		return function generateId() {
			return num === 255 ? (str = seed()) + HEX[num = 0] : str + HEX[++num];
		};
	})();
}));
//#endregion
//#region ../../node_modules/@fastify/multipart/lib/stream-consumer.js
var require_stream_consumer = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	module.exports = function streamToNull(stream) {
		return new Promise((resolve, reject) => {
			stream.on("data", () => {});
			stream.on("close", () => {
				resolve();
			});
			stream.on("end", () => {
				resolve();
			});
			stream.on("error", (error) => {
				reject(error);
			});
		});
	};
}));
//#endregion
//#region ../../node_modules/@fastify/multipart/index.js
var require_multipart = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	const Busboy = require_main();
	const os = __require("node:os");
	const fp = require_plugin();
	const { createWriteStream } = __require("node:fs");
	const { unlink } = __require("node:fs/promises");
	const path = __require("node:path");
	const { generateId } = require_generateId();
	const createError = require_error();
	const streamToNull = require_stream_consumer();
	const deepmergeAll = require_deepmerge()({ all: true });
	const { PassThrough, Readable } = __require("node:stream");
	const { pipeline: pump } = __require("node:stream/promises");
	const secureJSON = require_secure_json_parse();
	const kMultipart = Symbol("multipart");
	const kMultipartHandler = Symbol("multipartHandler");
	const kSavedRequestFilesResult = Symbol("savedRequestFilesResult");
	const PartsLimitError = createError("FST_PARTS_LIMIT", "reach parts limit", 413);
	const FilesLimitError = createError("FST_FILES_LIMIT", "reach files limit", 413);
	const FieldsLimitError = createError("FST_FIELDS_LIMIT", "reach fields limit", 413);
	const RequestFileTooLargeError = createError("FST_REQ_FILE_TOO_LARGE", "request file too large", 413);
	const PrototypeViolationError = createError("FST_PROTO_VIOLATION", "prototype property is not allowed as field name", 400);
	const InvalidMultipartContentTypeError = createError("FST_INVALID_MULTIPART_CONTENT_TYPE", "the request is not multipart", 406);
	const InvalidJSONFieldError = createError("FST_INVALID_JSON_FIELD_ERROR", "a request field is not a valid JSON as declared by its Content-Type", 406);
	const FileBufferNotFoundError = createError("FST_FILE_BUFFER_NOT_FOUND", "the file buffer was not found", 500);
	const NoFormData = createError("FST_NO_FORM_DATA", "FormData is not available", 500);
	function setMultipart(req, _payload, done) {
		req[kMultipart] = true;
		done();
	}
	function busboy(options) {
		try {
			return new Busboy(options);
		} catch (error) {
			const errorEmitter = new PassThrough();
			process.nextTick(function() {
				errorEmitter.emit("error", error);
			});
			return errorEmitter;
		}
	}
	function fastifyMultipart(fastify, options, done) {
		options.limits = {
			...options.limits,
			parts: options.limits?.parts || 1e3,
			fileSize: options.limits?.fileSize || fastify.initialConfig.bodyLimit
		};
		const attachFieldsToBody = options.attachFieldsToBody;
		if (attachFieldsToBody === true || attachFieldsToBody === "keyValues") {
			if (typeof options.sharedSchemaId === "string" && attachFieldsToBody === true) fastify.addSchema({
				$id: options.sharedSchemaId,
				type: "object",
				properties: {
					fieldname: { type: "string" },
					encoding: { type: "string" },
					filename: { type: "string" },
					mimetype: { type: "string" }
				}
			});
			fastify.addHook("preValidation", async function(req) {
				if (!req.isMultipart()) return;
				for await (const part of req.parts(req.routeOptions.config.multipartOptions)) {
					req.body = part.fields;
					if (part.file) if (options.onFile) await options.onFile.call(req, part);
					else await part.toBuffer();
				}
				if (attachFieldsToBody === "keyValues") {
					const body = {};
					if (req.body) {
						const reqBodyKeys = Object.keys(req.body);
						for (let i = 0; i < reqBodyKeys.length; ++i) {
							const key = reqBodyKeys[i];
							const field = req.body[key];
							if (field.value !== void 0) body[key] = field.value;
							else if (field._buf) body[key] = field._buf;
							else if (Array.isArray(field)) {
								const items = [];
								for (let i = 0; i < field.length; ++i) {
									const item = field[i];
									if (item.value !== void 0) items.push(item.value);
									else if (item._buf) items.push(item._buf);
								}
								if (items.length) body[key] = items;
							}
						}
					}
					req.body = body;
				}
			});
			/* istanbul ignore next */
			if (globalThis.FormData && !fastify.hasRequestDecorator("formData")) fastify.decorateRequest("formData", async function() {
				const formData = new FormData();
				for (const key in this.body) {
					const value = this.body[key];
					if (Array.isArray(value)) for (const item of value) await append(key, item);
					else await append(key, value);
				}
				async function append(key, entry) {
					/* c8 ignore next: Buffer.isBuffer is not covered and causing `npm test` to fail */
					if (entry.type === "file" || attachFieldsToBody === "keyValues" && Buffer.isBuffer(entry)) formData.append(key, new Blob([await entry.toBuffer()], { type: entry.mimetype }), entry.filename);
					else formData.append(key, entry.value);
				}
				return formData;
			});
		}
		/* istanbul ignore next */
		if (!fastify.hasRequestDecorator("formData")) fastify.decorateRequest("formData", async function() {
			/* c8 ignore next: Next line is not covered and causing `npm test` to fail */
			throw new NoFormData();
		});
		const defaultThrowFileSizeLimit = typeof options.throwFileSizeLimit === "boolean" ? options.throwFileSizeLimit : true;
		fastify.decorate("multipartErrors", {
			PartsLimitError,
			FilesLimitError,
			FieldsLimitError,
			PrototypeViolationError,
			InvalidMultipartContentTypeError,
			RequestFileTooLargeError,
			FileBufferNotFoundError
		});
		fastify.addContentTypeParser("multipart/form-data", setMultipart);
		fastify.decorateRequest(kMultipart, false);
		fastify.decorateRequest(kMultipartHandler, handleMultipart);
		fastify.decorateRequest(kSavedRequestFilesResult, null);
		fastify.decorateRequest("parts", getMultipartIterator);
		fastify.decorateRequest("isMultipart", isMultipart);
		fastify.decorateRequest("tmpUploads", null);
		fastify.decorateRequest("savedRequestFiles", null);
		fastify.decorateRequest("file", getMultipartFile);
		fastify.decorateRequest("files", getMultipartFiles);
		fastify.decorateRequest("saveRequestFiles", saveRequestFiles);
		fastify.decorateRequest("cleanRequestFiles", cleanRequestFiles);
		fastify.addHook("onResponse", async (request) => {
			await request.cleanRequestFiles();
		});
		function isMultipart() {
			return this[kMultipart];
		}
		function handleMultipart(opts = {}) {
			if (!this.isMultipart()) throw new InvalidMultipartContentTypeError();
			this.log.debug("starting multipart parsing");
			let values = [];
			let pendingHandler = null;
			const ch = (val) => {
				if (pendingHandler) {
					pendingHandler(val);
					pendingHandler = null;
				} else values.push(val);
			};
			const handle = (handler) => {
				if (values.length > 0) {
					const value = values[0];
					values = values.slice(1);
					handler(value);
				} else pendingHandler = handler;
			};
			const parts = () => {
				return new Promise((resolve, reject) => {
					handle((val) => {
						if (val instanceof Error) if (val.message === "Unexpected end of multipart data") resolve(null);
						else reject(val);
						else resolve(val);
					});
				});
			};
			const body = {};
			let lastError = null;
			let currentFile = null;
			const request = this.raw;
			const busboyOptions = deepmergeAll({ headers: request.headers }, options, opts);
			this.log.trace({ busboyOptions }, "Providing options to busboy");
			const bb = busboy(busboyOptions);
			request.on("close", cleanup);
			request.on("error", cleanup);
			bb.on("field", onField).on("file", onFile).on("end", cleanup).on("finish", cleanup).on("close", cleanup).on("error", cleanup);
			bb.on("partsLimit", function() {
				const err = new PartsLimitError();
				onError(err);
				process.nextTick(() => cleanup(err));
			});
			bb.on("filesLimit", function() {
				const err = new FilesLimitError();
				onError(err);
				process.nextTick(() => cleanup(err));
			});
			bb.on("fieldsLimit", function() {
				const err = new FieldsLimitError();
				onError(err);
				process.nextTick(() => cleanup(err));
			});
			request.pipe(bb);
			function onField(name, fieldValue, fieldnameTruncated, valueTruncated, encoding, contentType) {
				if (name in Object.prototype) {
					onError(new PrototypeViolationError());
					return;
				}
				if (contentType.startsWith("application/json")) {
					if (valueTruncated) {
						onError(new InvalidJSONFieldError());
						return;
					}
					try {
						fieldValue = secureJSON.parse(fieldValue);
						contentType = "application/json";
					} catch {
						onError(new InvalidJSONFieldError());
						return;
					}
				}
				const value = {
					type: "field",
					fieldname: name,
					mimetype: contentType,
					encoding,
					value: fieldValue,
					fieldnameTruncated,
					valueTruncated,
					fields: body
				};
				if (body[name] === void 0) body[name] = value;
				else if (Array.isArray(body[name])) body[name].push(value);
				else body[name] = [body[name], value];
				ch(value);
			}
			function onFile(name, file, filename, encoding, mimetype) {
				if (name in Object.prototype) {
					streamToNull(file).catch(() => {});
					onError(new PrototypeViolationError());
					return;
				}
				const throwFileSizeLimit = typeof opts.throwFileSizeLimit === "boolean" ? opts.throwFileSizeLimit : defaultThrowFileSizeLimit;
				const value = {
					type: "file",
					fieldname: name,
					filename,
					encoding,
					mimetype,
					file,
					fields: body,
					_buf: null,
					async toBuffer() {
						if (this._buf) return this._buf;
						const fileChunks = [];
						let err;
						for await (const chunk of this.file) {
							fileChunks.push(chunk);
							if (throwFileSizeLimit && this.file.truncated) {
								err = new RequestFileTooLargeError();
								err.part = this;
								onError(err);
								fileChunks.length = 0;
							}
						}
						if (err) throw err;
						this._buf = Buffer.concat(fileChunks);
						return this._buf;
					}
				};
				file.on("error", function(err) {
					if (err.message && err.message.includes("terminated early")) onError(err);
				});
				if (throwFileSizeLimit) file.on("limit", function() {
					const err = new RequestFileTooLargeError();
					err.part = value;
					onError(err);
				});
				if (body[name] === void 0) body[name] = value;
				else if (Array.isArray(body[name])) body[name].push(value);
				else body[name] = [body[name], value];
				currentFile = file;
				ch(value);
			}
			function onError(err) {
				lastError = err;
				currentFile = null;
			}
			function cleanup(err) {
				request.unpipe(bb);
				if ((err || request.aborted) && currentFile) {
					currentFile.destroy();
					currentFile = null;
				}
				ch(err || lastError || null);
			}
			return parts;
		}
		async function saveRequestFiles(options) {
			if (this[kSavedRequestFilesResult]) return this[kSavedRequestFilesResult];
			let parts;
			let values = {};
			if (attachFieldsToBody === true || attachFieldsToBody === "keyValues") {
				parts = this.body ? filesFromFields.call(this, this.body) : [];
				values = this.body || {};
			} else parts = this.parts(options);
			this.savedRequestFiles = [];
			const tmpdir = options?.tmpdir || os.tmpdir();
			this.tmpUploads = [];
			let i = 0;
			for await (const part of parts) {
				values = part.fields;
				if (!part.file) continue;
				const filepath = path.join(tmpdir, generateId() + path.extname(part.filename || "file" + i++));
				const target = createWriteStream(filepath);
				try {
					this.tmpUploads.push(filepath);
					await pump(part.file, target);
					this.savedRequestFiles.push({
						...part,
						filepath
					});
				} catch (err) {
					target.destroy();
					await this.cleanRequestFiles();
					this.log.error({ err }, "save request file");
					throw err;
				}
			}
			this[kSavedRequestFilesResult] = {
				files: this.savedRequestFiles,
				values
			};
			return this[kSavedRequestFilesResult];
		}
		function* filesFromFields(container) {
			try {
				const fields = Array.isArray(container) ? container : Object.values(container);
				for (let i = 0; i < fields.length; ++i) {
					const field = fields[i];
					if (Array.isArray(field)) for (const subField of filesFromFields.call(this, field)) yield subField;
					if (!field.file) continue;
					if (!field._buf) throw new FileBufferNotFoundError();
					field.file = Readable.from(field._buf);
					yield field;
				}
			} catch (err) {
				this.log.error({ err }, "save request file failed");
				throw err;
			}
		}
		async function cleanRequestFiles() {
			if (!this.tmpUploads) return;
			for (let i = 0; i < this.tmpUploads.length; ++i) {
				const filepath = this.tmpUploads[i];
				try {
					await unlink(filepath);
				} 				/* c8 ignore start */catch (error)  {
					this.log.error(error, "Could not delete file");
				}
			}
		}
		async function getMultipartFile(options) {
			const parts = this[kMultipartHandler](options);
			let part;
			while ((part = await parts()) != null) if (part.file) return part;
		}
		async function* getMultipartFiles(options) {
			const parts = this[kMultipartHandler](options);
			let part;
			while ((part = await parts()) != null) if (part.file) yield part;
		}
		async function* getMultipartIterator(options) {
			const parts = this[kMultipartHandler](options);
			let part;
			while ((part = await parts()) != null) yield part;
		}
		done();
	}
	/**
	* Adds a new type `isFile` to help @fastify/swagger generate the correct schema.
	*/
	function ajvFilePlugin(ajv) {
		return ajv.addKeyword({
			keyword: "isFile",
			compile: (_schema, parent) => {
				parent.type = "string";
				parent.format = "binary";
				delete parent.isFile;
				return (field) => !!field.file;
			},
			error: { message: "should be a file" }
		});
	}
	/**
	* These export configurations enable JS and TS developers
	* to consumer fastify in whatever way best suits their needs.
	*/
	module.exports = fp(fastifyMultipart, {
		fastify: "5.x",
		name: "@fastify/multipart"
	});
	module.exports.default = fastifyMultipart;
	module.exports.fastifyMultipart = fastifyMultipart;
	module.exports.ajvFilePlugin = ajvFilePlugin;
}));
//#endregion
export { require_secure_json_parse as n, require_multipart as t };
