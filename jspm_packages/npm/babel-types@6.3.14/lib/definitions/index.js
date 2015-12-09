/* */ 
"use strict";
var _getIterator = require('babel-runtime/core-js/get-iterator')["default"];
var _interopRequireWildcard = require('babel-runtime/helpers/interop-require-wildcard')["default"];
exports.__esModule = true;
exports.assertEach = assertEach;
exports.assertOneOf = assertOneOf;
exports.assertNodeType = assertNodeType;
exports.assertNodeOrValueType = assertNodeOrValueType;
exports.assertValueType = assertValueType;
exports.chain = chain;
exports["default"] = defineType;
var _index = require('../index');
var t = _interopRequireWildcard(_index);
var VISITOR_KEYS = {};
exports.VISITOR_KEYS = VISITOR_KEYS;
var ALIAS_KEYS = {};
exports.ALIAS_KEYS = ALIAS_KEYS;
var NODE_FIELDS = {};
exports.NODE_FIELDS = NODE_FIELDS;
var BUILDER_KEYS = {};
exports.BUILDER_KEYS = BUILDER_KEYS;
var DEPRECATED_KEYS = {};
exports.DEPRECATED_KEYS = DEPRECATED_KEYS;
function getType(val) {
  if (Array.isArray(val)) {
    return "array";
  } else if (val === null) {
    return "null";
  } else if (val === undefined) {
    return "undefined";
  } else {
    return typeof val;
  }
}
function assertEach(callback) {
  return function(node, key, val) {
    if (!Array.isArray(val))
      return;
    for (var i = 0; i < val.length; i++) {
      callback(node, key + "[" + i + "]", val[i]);
    }
  };
}
function assertOneOf() {
  for (var _len = arguments.length,
      vals = Array(_len),
      _key = 0; _key < _len; _key++) {
    vals[_key] = arguments[_key];
  }
  function validate(node, key, val) {
    if (vals.indexOf(val) < 0) {
      throw new TypeError("Property " + key + " expected value to be one of " + JSON.stringify(vals) + " but got " + JSON.stringify(val));
    }
  }
  validate.oneOf = vals;
  return validate;
}
function assertNodeType() {
  for (var _len2 = arguments.length,
      types = Array(_len2),
      _key2 = 0; _key2 < _len2; _key2++) {
    types[_key2] = arguments[_key2];
  }
  function validate(node, key, val) {
    var valid = false;
    for (var _iterator = types,
        _isArray = Array.isArray(_iterator),
        _i = 0,
        _iterator = _isArray ? _iterator : _getIterator(_iterator); ; ) {
      var _ref;
      if (_isArray) {
        if (_i >= _iterator.length)
          break;
        _ref = _iterator[_i++];
      } else {
        _i = _iterator.next();
        if (_i.done)
          break;
        _ref = _i.value;
      }
      var type = _ref;
      if (t.is(type, val)) {
        valid = true;
        break;
      }
    }
    if (!valid) {
      throw new TypeError("Property " + key + " of " + node.type + " expected node to be of a type " + JSON.stringify(types) + " but instead got " + JSON.stringify(val && val.type));
    }
  }
  validate.oneOfNodeTypes = types;
  return validate;
}
function assertNodeOrValueType() {
  for (var _len3 = arguments.length,
      types = Array(_len3),
      _key3 = 0; _key3 < _len3; _key3++) {
    types[_key3] = arguments[_key3];
  }
  function validate(node, key, val) {
    var valid = false;
    for (var _iterator2 = types,
        _isArray2 = Array.isArray(_iterator2),
        _i2 = 0,
        _iterator2 = _isArray2 ? _iterator2 : _getIterator(_iterator2); ; ) {
      var _ref2;
      if (_isArray2) {
        if (_i2 >= _iterator2.length)
          break;
        _ref2 = _iterator2[_i2++];
      } else {
        _i2 = _iterator2.next();
        if (_i2.done)
          break;
        _ref2 = _i2.value;
      }
      var type = _ref2;
      if (getType(val) === type || t.is(type, val)) {
        valid = true;
        break;
      }
    }
    if (!valid) {
      throw new TypeError("Property " + key + " of " + node.type + " expected node to be of a type " + JSON.stringify(types) + " but instead got " + JSON.stringify(val && val.type));
    }
  }
  validate.oneOfNodeOrValueTypes = types;
  return validate;
}
function assertValueType(type) {
  function validate(node, key, val) {
    var valid = getType(val) === type;
    if (!valid) {
      throw new TypeError("Property " + key + " expected type of " + type + " but got " + getType(val));
    }
  }
  validate.type = type;
  return validate;
}
function chain() {
  for (var _len4 = arguments.length,
      fns = Array(_len4),
      _key4 = 0; _key4 < _len4; _key4++) {
    fns[_key4] = arguments[_key4];
  }
  return function() {
    for (var _iterator3 = fns,
        _isArray3 = Array.isArray(_iterator3),
        _i3 = 0,
        _iterator3 = _isArray3 ? _iterator3 : _getIterator(_iterator3); ; ) {
      var _ref3;
      if (_isArray3) {
        if (_i3 >= _iterator3.length)
          break;
        _ref3 = _iterator3[_i3++];
      } else {
        _i3 = _iterator3.next();
        if (_i3.done)
          break;
        _ref3 = _i3.value;
      }
      var fn = _ref3;
      fn.apply(undefined, arguments);
    }
  };
}
function defineType(type) {
  var opts = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
  var inherits = opts.inherits && store[opts.inherits] || {};
  opts.fields = opts.fields || inherits.fields || {};
  opts.visitor = opts.visitor || inherits.visitor || [];
  opts.aliases = opts.aliases || inherits.aliases || [];
  opts.builder = opts.builder || inherits.builder || opts.visitor || [];
  if (opts.deprecatedAlias) {
    DEPRECATED_KEYS[opts.deprecatedAlias] = type;
  }
  for (var _iterator4 = (opts.visitor.concat(opts.builder)),
      _isArray4 = Array.isArray(_iterator4),
      _i4 = 0,
      _iterator4 = _isArray4 ? _iterator4 : _getIterator(_iterator4); ; ) {
    var _ref4;
    if (_isArray4) {
      if (_i4 >= _iterator4.length)
        break;
      _ref4 = _iterator4[_i4++];
    } else {
      _i4 = _iterator4.next();
      if (_i4.done)
        break;
      _ref4 = _i4.value;
    }
    var key = _ref4;
    opts.fields[key] = opts.fields[key] || {};
  }
  for (var key in opts.fields) {
    var field = opts.fields[key];
    if (field["default"] === undefined) {
      field["default"] = null;
    } else if (!field.validate) {
      field.validate = assertValueType(getType(field["default"]));
    }
  }
  VISITOR_KEYS[type] = opts.visitor;
  BUILDER_KEYS[type] = opts.builder;
  NODE_FIELDS[type] = opts.fields;
  ALIAS_KEYS[type] = opts.aliases;
  store[type] = opts;
}
var store = {};
