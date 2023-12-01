"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toQueryString = exports.getMin = exports.getMax = exports.buildWhere = exports.batchLoad = void 0;
var lodash_1 = require("lodash");
function batchLoad(executor, keys, limit) {
    if (limit === void 0) { limit = 1000; }
    return __awaiter(this, void 0, void 0, function () {
        var array, where, offset, batchSize, query, batch;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (keys.length === 0) {
                        return [2 /*return*/, []];
                    }
                    array = new Array();
                    where = buildWhere(keys);
                    offset = 0;
                    batchSize = 0;
                    _a.label = 1;
                case 1:
                    query = { where: where, skip: offset, take: limit };
                    return [4 /*yield*/, executor(query)];
                case 2:
                    batch = _a.sent();
                    array.push.apply(array, batch);
                    batchSize = batch.length;
                    offset += batchSize;
                    _a.label = 3;
                case 3:
                    if (batchSize === limit) return [3 /*break*/, 1];
                    _a.label = 4;
                case 4: return [2 /*return*/, array];
            }
        });
    });
}
exports.batchLoad = batchLoad;
function buildWhere(loadKeys) {
    if (loadKeys.length === 0) {
        return {};
    }
    var map = loadKeys.reduce(function (acc, loadKey) {
        Object.entries(loadKey).forEach(function (entry) {
            var _a;
            var array = (_a = acc[entry[0]]) !== null && _a !== void 0 ? _a : [];
            array.push(entry[1]);
            acc[entry[0]] = array;
        });
        return acc;
    }, {});
    var allKeys = Object.keys(map);
    var singleKeys = Object.entries(map)
        .filter(function (entry) { return new Set(entry[1]).size === 1; })
        .map(function (entry) { return entry[0]; });
    var singleKeySet = new Set(singleKeys);
    var multiKeys = allKeys.filter(function (key) { return !singleKeySet.has(key); });
    var where = Object.entries(loadKeys[0])
        .filter(function (entry) { return singleKeySet.has(entry[0]); })
        .reduce(function (acc, entry) {
        acc[entry[0]] = entry[1];
        return acc;
    }, {});
    if (multiKeys.length === 0) {
        return where;
    }
    if (multiKeys.length === 1) {
        where[multiKeys[0]] = { in: map[multiKeys[0]] };
        return where;
    }
    where["OR"] = loadKeys.map(function (loadKey) { return (0, lodash_1.omit)(loadKey, singleKeys); });
    return where;
}
exports.buildWhere = buildWhere;
function getMin(array) {
    return array.reduce(function (acc, value) {
        return (0, lodash_1.isNil)(value) ? acc : (0, lodash_1.isNil)(acc) ? value : acc < value ? acc : value;
    }, null);
}
exports.getMin = getMin;
function getMax(array) {
    return array.reduce(function (acc, value) {
        return (0, lodash_1.isNil)(value) ? acc : (0, lodash_1.isNil)(acc) ? value : acc > value ? acc : value;
    }, null);
}
exports.getMax = getMax;
function toQueryString(query) {
    query = (0, lodash_1.omitBy)(query, lodash_1.isUndefined);
    Object.keys(query)
        .filter(function (key) { return query[key] instanceof Date; })
        .forEach(function (key) { return (query[key] = query[key].toISOString()); });
    return new URLSearchParams(query).toString();
}
exports.toQueryString = toQueryString;
//# sourceMappingURL=index.js.map