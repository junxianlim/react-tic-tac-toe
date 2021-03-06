/* */ 
"use strict";

var _getIterator = require("babel-runtime/core-js/get-iterator")["default"];

var _interopRequireWildcard = require("babel-runtime/helpers/interop-require-wildcard")["default"];

var _interopRequireDefault = require("babel-runtime/helpers/interop-require-default")["default"];

exports.__esModule = true;

var _babelTypes = require("babel-types");

var t = _interopRequireWildcard(_babelTypes);

var _babelHelperFunctionName = require("babel-helper-function-name");

var _babelHelperFunctionName2 = _interopRequireDefault(_babelHelperFunctionName);

exports["default"] = function () {
  return {
    visitor: {
      "ArrowFunctionExpression|FunctionExpression": {
        exit: function exit(path) {
          if (path.key !== "value" && !path.parentPath.isObjectProperty()) {
            var replacement = _babelHelperFunctionName2["default"](path);
            if (replacement) path.replaceWith(replacement);
          }
        }
      },

      ObjectExpression: function ObjectExpression(path) {
        var props /*: Array<Object>*/ = path.get("properties");

        for (var _iterator = props, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _getIterator(_iterator);;) {
          var _ref;

          if (_isArray) {
            if (_i >= _iterator.length) break;
            _ref = _iterator[_i++];
          } else {
            _i = _iterator.next();
            if (_i.done) break;
            _ref = _i.value;
          }

          var prop = _ref;

          if (prop.isObjectMethod({ kind: "method", computed: false })) {
            var node = prop.node;
            prop.replaceWith(t.objectProperty(node.key, t.functionExpression(null, node.params, node.body, node.generator, node.async)));
          }

          if (prop.isObjectProperty()) {
            var value = prop.get("value");
            if (value.isFunction()) {
              var newNode = _babelHelperFunctionName2["default"](value);
              if (newNode) value.replaceWith(newNode);
            }
          }
        }
      }
    }
  };
};

module.exports = exports["default"];