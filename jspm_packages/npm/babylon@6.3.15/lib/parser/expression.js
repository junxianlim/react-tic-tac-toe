/* */ 
"use strict";
var _Object$create = require('babel-runtime/core-js/object/create')["default"];
var _getIterator = require('babel-runtime/core-js/get-iterator')["default"];
var _interopRequireDefault = require('babel-runtime/helpers/interop-require-default')["default"];
var _tokenizerTypes = require('../tokenizer/types');
var _index = require('./index');
var _index2 = _interopRequireDefault(_index);
var _utilIdentifier = require('../util/identifier');
var pp = _index2["default"].prototype;
pp.checkPropClash = function(prop, propHash) {
  if (prop.computed)
    return;
  var key = prop.key;
  var name = undefined;
  switch (key.type) {
    case "Identifier":
      name = key.name;
      break;
    case "StringLiteral":
    case "NumericLiteral":
      name = String(key.value);
      break;
    default:
      return;
  }
  if (name === "__proto__" && prop.kind === "init") {
    if (propHash.proto)
      this.raise(key.start, "Redefinition of __proto__ property");
    propHash.proto = true;
  }
};
pp.parseExpression = function(noIn, refShorthandDefaultPos) {
  var startPos = this.state.start,
      startLoc = this.state.startLoc;
  var expr = this.parseMaybeAssign(noIn, refShorthandDefaultPos);
  if (this.match(_tokenizerTypes.types.comma)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.expressions = [expr];
    while (this.eat(_tokenizerTypes.types.comma)) {
      node.expressions.push(this.parseMaybeAssign(noIn, refShorthandDefaultPos));
    }
    this.toReferencedList(node.expressions);
    return this.finishNode(node, "SequenceExpression");
  }
  return expr;
};
pp.parseMaybeAssign = function(noIn, refShorthandDefaultPos, afterLeftParse) {
  if (this.match(_tokenizerTypes.types._yield) && this.state.inGenerator) {
    return this.parseYield();
  }
  var failOnShorthandAssign = undefined;
  if (refShorthandDefaultPos) {
    failOnShorthandAssign = false;
  } else {
    refShorthandDefaultPos = {start: 0};
    failOnShorthandAssign = true;
  }
  var startPos = this.state.start;
  var startLoc = this.state.startLoc;
  if (this.match(_tokenizerTypes.types.parenL) || this.match(_tokenizerTypes.types.name)) {
    this.state.potentialArrowAt = this.state.start;
  }
  var left = this.parseMaybeConditional(noIn, refShorthandDefaultPos);
  if (afterLeftParse)
    left = afterLeftParse.call(this, left, startPos, startLoc);
  if (this.state.type.isAssign) {
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.state.value;
    node.left = this.match(_tokenizerTypes.types.eq) ? this.toAssignable(left) : left;
    refShorthandDefaultPos.start = 0;
    this.checkLVal(left);
    if (left.extra && left.extra.parenthesized) {
      var errorMsg = undefined;
      if (left.type === "ObjectPattern") {
        errorMsg = "`({a}) = 0` use `({a} = 0)`";
      } else if (left.type === "ArrayPattern") {
        errorMsg = "`([a]) = 0` use `([a] = 0)`";
      }
      if (errorMsg) {
        this.raise(left.start, "You're trying to assign to a parenthesized expression, eg. instead of " + errorMsg);
      }
    }
    this.next();
    node.right = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "AssignmentExpression");
  } else if (failOnShorthandAssign && refShorthandDefaultPos.start) {
    this.unexpected(refShorthandDefaultPos.start);
  }
  return left;
};
pp.parseMaybeConditional = function(noIn, refShorthandDefaultPos) {
  var startPos = this.state.start,
      startLoc = this.state.startLoc;
  var expr = this.parseExprOps(noIn, refShorthandDefaultPos);
  if (refShorthandDefaultPos && refShorthandDefaultPos.start)
    return expr;
  if (this.eat(_tokenizerTypes.types.question)) {
    var node = this.startNodeAt(startPos, startLoc);
    node.test = expr;
    node.consequent = this.parseMaybeAssign();
    this.expect(_tokenizerTypes.types.colon);
    node.alternate = this.parseMaybeAssign(noIn);
    return this.finishNode(node, "ConditionalExpression");
  }
  return expr;
};
pp.parseExprOps = function(noIn, refShorthandDefaultPos) {
  var startPos = this.state.start,
      startLoc = this.state.startLoc;
  var expr = this.parseMaybeUnary(refShorthandDefaultPos);
  if (refShorthandDefaultPos && refShorthandDefaultPos.start) {
    return expr;
  } else {
    return this.parseExprOp(expr, startPos, startLoc, -1, noIn);
  }
};
pp.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, noIn) {
  var prec = this.state.type.binop;
  if (prec != null && (!noIn || !this.match(_tokenizerTypes.types._in))) {
    if (prec > minPrec) {
      var node = this.startNodeAt(leftStartPos, leftStartLoc);
      node.left = left;
      node.operator = this.state.value;
      if (node.operator === "**" && left.type === "UnaryExpression" && left.extra && !left.extra.parenthesizedArgument) {
        this.raise(left.argument.start, "Illegal expression. Wrap left hand side or entire exponentiation in parentheses.");
      }
      var op = this.state.type;
      this.next();
      var startPos = this.state.start;
      var startLoc = this.state.startLoc;
      node.right = this.parseExprOp(this.parseMaybeUnary(), startPos, startLoc, op.rightAssociative ? prec - 1 : prec, noIn);
      this.finishNode(node, op === _tokenizerTypes.types.logicalOR || op === _tokenizerTypes.types.logicalAND ? "LogicalExpression" : "BinaryExpression");
      return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, noIn);
    }
  }
  return left;
};
pp.parseMaybeUnary = function(refShorthandDefaultPos) {
  if (this.state.type.prefix) {
    var node = this.startNode();
    var update = this.match(_tokenizerTypes.types.incDec);
    node.operator = this.state.value;
    node.prefix = true;
    this.next();
    var argType = this.state.type;
    this.addExtra(node, "parenthesizedArgument", argType === _tokenizerTypes.types.parenL);
    node.argument = this.parseMaybeUnary();
    if (refShorthandDefaultPos && refShorthandDefaultPos.start) {
      this.unexpected(refShorthandDefaultPos.start);
    }
    if (update) {
      this.checkLVal(node.argument);
    } else if (this.state.strict && node.operator === "delete" && node.argument.type === "Identifier") {
      this.raise(node.start, "Deleting local variable in strict mode");
    }
    return this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
  }
  var startPos = this.state.start,
      startLoc = this.state.startLoc;
  var expr = this.parseExprSubscripts(refShorthandDefaultPos);
  if (refShorthandDefaultPos && refShorthandDefaultPos.start)
    return expr;
  while (this.state.type.postfix && !this.canInsertSemicolon()) {
    var node = this.startNodeAt(startPos, startLoc);
    node.operator = this.state.value;
    node.prefix = false;
    node.argument = expr;
    this.checkLVal(expr);
    this.next();
    expr = this.finishNode(node, "UpdateExpression");
  }
  return expr;
};
pp.parseExprSubscripts = function(refShorthandDefaultPos) {
  var startPos = this.state.start,
      startLoc = this.state.startLoc;
  var potentialArrowAt = this.state.potentialArrowAt;
  var expr = this.parseExprAtom(refShorthandDefaultPos);
  if (expr.type === "ArrowFunctionExpression" && expr.start === potentialArrowAt) {
    return expr;
  }
  if (refShorthandDefaultPos && refShorthandDefaultPos.start) {
    return expr;
  }
  return this.parseSubscripts(expr, startPos, startLoc);
};
pp.parseSubscripts = function(base, startPos, startLoc, noCalls) {
  for (; ; ) {
    if (!noCalls && this.eat(_tokenizerTypes.types.doubleColon)) {
      var node = this.startNodeAt(startPos, startLoc);
      node.object = base;
      node.callee = this.parseNoCallExpr();
      return this.parseSubscripts(this.finishNode(node, "BindExpression"), startPos, startLoc, noCalls);
    } else if (this.eat(_tokenizerTypes.types.dot)) {
      var node = this.startNodeAt(startPos, startLoc);
      node.object = base;
      node.property = this.parseIdentifier(true);
      node.computed = false;
      base = this.finishNode(node, "MemberExpression");
    } else if (this.eat(_tokenizerTypes.types.bracketL)) {
      var node = this.startNodeAt(startPos, startLoc);
      node.object = base;
      node.property = this.parseExpression();
      node.computed = true;
      this.expect(_tokenizerTypes.types.bracketR);
      base = this.finishNode(node, "MemberExpression");
    } else if (!noCalls && this.match(_tokenizerTypes.types.parenL)) {
      var possibleAsync = this.state.potentialArrowAt === base.start && base.type === "Identifier" && base.name === "async" && !this.canInsertSemicolon();
      this.next();
      var node = this.startNodeAt(startPos, startLoc);
      node.callee = base;
      node.arguments = this.parseCallExpressionArguments(_tokenizerTypes.types.parenR, this.hasPlugin("trailingFunctionCommas"), possibleAsync);
      base = this.finishNode(node, "CallExpression");
      if (possibleAsync && this.shouldParseAsyncArrow()) {
        return this.parseAsyncArrowFromCallExpression(this.startNodeAt(startPos, startLoc), node);
      } else {
        this.toReferencedList(node.arguments);
      }
    } else if (this.match(_tokenizerTypes.types.backQuote)) {
      var node = this.startNodeAt(startPos, startLoc);
      node.tag = base;
      node.quasi = this.parseTemplate();
      base = this.finishNode(node, "TaggedTemplateExpression");
    } else {
      return base;
    }
  }
};
pp.parseCallExpressionArguments = function(close, allowTrailingComma, possibleAsyncArrow) {
  var innerParenStart = undefined;
  var elts = [],
      first = true;
  while (!this.eat(close)) {
    if (first) {
      first = false;
    } else {
      this.expect(_tokenizerTypes.types.comma);
      if (allowTrailingComma && this.eat(close))
        break;
    }
    if (this.match(_tokenizerTypes.types.parenL) && !innerParenStart) {
      innerParenStart = this.state.start;
    }
    elts.push(this.parseExprListItem());
  }
  if (possibleAsyncArrow && innerParenStart && this.shouldParseAsyncArrow()) {
    this.unexpected();
  }
  return elts;
};
pp.shouldParseAsyncArrow = function() {
  return this.match(_tokenizerTypes.types.arrow);
};
pp.parseAsyncArrowFromCallExpression = function(node, call) {
  if (!this.hasPlugin("asyncFunctions"))
    this.unexpected();
  this.expect(_tokenizerTypes.types.arrow);
  return this.parseArrowExpression(node, call.arguments, true);
};
pp.parseNoCallExpr = function() {
  var startPos = this.state.start,
      startLoc = this.state.startLoc;
  return this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true);
};
pp.parseExprAtom = function(refShorthandDefaultPos) {
  var node = undefined,
      canBeArrow = this.state.potentialArrowAt === this.state.start;
  switch (this.state.type) {
    case _tokenizerTypes.types._super:
      if (!this.state.inMethod && !this.options.allowSuperOutsideMethod) {
        this.raise(this.state.start, "'super' outside of function or class");
      }
      node = this.startNode();
      this.next();
      if (!this.match(_tokenizerTypes.types.parenL) && !this.match(_tokenizerTypes.types.bracketL) && !this.match(_tokenizerTypes.types.dot)) {
        this.unexpected();
      }
      if (this.match(_tokenizerTypes.types.parenL) && this.state.inMethod !== "constructor" && !this.options.allowSuperOutsideMethod) {
        this.raise(node.start, "super() outside of class constructor");
      }
      return this.finishNode(node, "Super");
    case _tokenizerTypes.types._this:
      node = this.startNode();
      this.next();
      return this.finishNode(node, "ThisExpression");
    case _tokenizerTypes.types._yield:
      if (this.state.inGenerator)
        this.unexpected();
    case _tokenizerTypes.types.name:
      node = this.startNode();
      var allowAwait = this.hasPlugin("asyncFunctions") && this.state.value === "await" && this.state.inAsync;
      var allowYield = this.shouldAllowYieldIdentifier();
      var id = this.parseIdentifier(allowAwait || allowYield);
      if (this.hasPlugin("asyncFunctions")) {
        if (id.name === "await") {
          if (this.state.inAsync || this.inModule) {
            return this.parseAwait(node);
          }
        } else if (id.name === "async" && this.match(_tokenizerTypes.types._function) && !this.canInsertSemicolon()) {
          this.next();
          return this.parseFunction(node, false, false, true);
        } else if (canBeArrow && id.name === "async" && this.match(_tokenizerTypes.types.name)) {
          var params = [this.parseIdentifier()];
          this.expect(_tokenizerTypes.types.arrow);
          return this.parseArrowExpression(node, params, true);
        }
      }
      if (canBeArrow && !this.canInsertSemicolon() && this.eat(_tokenizerTypes.types.arrow)) {
        return this.parseArrowExpression(node, [id]);
      }
      return id;
    case _tokenizerTypes.types._do:
      if (this.hasPlugin("doExpressions")) {
        var _node = this.startNode();
        this.next();
        var oldInFunction = this.state.inFunction;
        var oldLabels = this.state.labels;
        this.state.labels = [];
        this.state.inFunction = false;
        _node.body = this.parseBlock(false, true);
        this.state.inFunction = oldInFunction;
        this.state.labels = oldLabels;
        return this.finishNode(_node, "DoExpression");
      }
    case _tokenizerTypes.types.regexp:
      var value = this.state.value;
      node = this.parseLiteral(value.value, "RegExpLiteral");
      node.pattern = value.pattern;
      node.flags = value.flags;
      return node;
    case _tokenizerTypes.types.num:
      return this.parseLiteral(this.state.value, "NumericLiteral");
    case _tokenizerTypes.types.string:
      return this.parseLiteral(this.state.value, "StringLiteral");
    case _tokenizerTypes.types._null:
      node = this.startNode();
      this.next();
      return this.finishNode(node, "NullLiteral");
    case _tokenizerTypes.types._true:
    case _tokenizerTypes.types._false:
      node = this.startNode();
      node.value = this.match(_tokenizerTypes.types._true);
      this.next();
      return this.finishNode(node, "BooleanLiteral");
    case _tokenizerTypes.types.parenL:
      return this.parseParenAndDistinguishExpression(null, null, canBeArrow);
    case _tokenizerTypes.types.bracketL:
      node = this.startNode();
      this.next();
      node.elements = this.parseExprList(_tokenizerTypes.types.bracketR, true, true, refShorthandDefaultPos);
      this.toReferencedList(node.elements);
      return this.finishNode(node, "ArrayExpression");
    case _tokenizerTypes.types.braceL:
      return this.parseObj(false, refShorthandDefaultPos);
    case _tokenizerTypes.types._function:
      return this.parseFunctionExpression();
    case _tokenizerTypes.types.at:
      this.parseDecorators();
    case _tokenizerTypes.types._class:
      node = this.startNode();
      this.takeDecorators(node);
      return this.parseClass(node, false);
    case _tokenizerTypes.types._new:
      return this.parseNew();
    case _tokenizerTypes.types.backQuote:
      return this.parseTemplate();
    case _tokenizerTypes.types.doubleColon:
      node = this.startNode();
      this.next();
      node.object = null;
      var callee = node.callee = this.parseNoCallExpr();
      if (callee.type === "MemberExpression") {
        return this.finishNode(node, "BindExpression");
      } else {
        this.raise(callee.start, "Binding should be performed on object property.");
      }
    default:
      this.unexpected();
  }
};
pp.parseFunctionExpression = function() {
  var node = this.startNode();
  var meta = this.parseIdentifier(true);
  if (this.state.inGenerator && this.eat(_tokenizerTypes.types.dot) && this.hasPlugin("functionSent")) {
    return this.parseMetaProperty(node, meta, "sent");
  } else {
    return this.parseFunction(node, false);
  }
};
pp.parseMetaProperty = function(node, meta, propertyName) {
  node.meta = meta;
  node.property = this.parseIdentifier(true);
  if (node.property.name !== propertyName) {
    this.raise(node.property.start, "The only valid meta property for new is " + meta.name + "." + propertyName);
  }
  return this.finishNode(node, "MetaProperty");
};
pp.parseLiteral = function(value, type) {
  var node = this.startNode();
  this.addExtra(node, "rawValue", value);
  this.addExtra(node, "raw", this.input.slice(this.state.start, this.state.end));
  node.value = value;
  this.next();
  return this.finishNode(node, type);
};
pp.parseParenExpression = function() {
  this.expect(_tokenizerTypes.types.parenL);
  var val = this.parseExpression();
  this.expect(_tokenizerTypes.types.parenR);
  return val;
};
pp.parseParenAndDistinguishExpression = function(startPos, startLoc, canBeArrow, isAsync) {
  startPos = startPos || this.state.start;
  startLoc = startLoc || this.state.startLoc;
  var val = undefined;
  this.next();
  var innerStartPos = this.state.start,
      innerStartLoc = this.state.startLoc;
  var exprList = [],
      first = true;
  var refShorthandDefaultPos = {start: 0},
      spreadStart = undefined,
      optionalCommaStart = undefined;
  while (!this.match(_tokenizerTypes.types.parenR)) {
    if (first) {
      first = false;
    } else {
      this.expect(_tokenizerTypes.types.comma);
      if (this.match(_tokenizerTypes.types.parenR) && this.hasPlugin("trailingFunctionCommas")) {
        optionalCommaStart = this.state.start;
        break;
      }
    }
    if (this.match(_tokenizerTypes.types.ellipsis)) {
      var spreadNodeStartPos = this.state.start,
          spreadNodeStartLoc = this.state.startLoc;
      spreadStart = this.state.start;
      exprList.push(this.parseParenItem(this.parseRest(), spreadNodeStartLoc, spreadNodeStartPos));
      break;
    } else {
      exprList.push(this.parseMaybeAssign(false, refShorthandDefaultPos, this.parseParenItem));
    }
  }
  var innerEndPos = this.state.start;
  var innerEndLoc = this.state.startLoc;
  this.expect(_tokenizerTypes.types.parenR);
  if (canBeArrow && !this.canInsertSemicolon() && this.eat(_tokenizerTypes.types.arrow)) {
    for (var _i = 0; _i < exprList.length; _i++) {
      var param = exprList[_i];
      if (param.extra && param.extra.parenthesized)
        this.unexpected(param.extra.parenStart);
    }
    return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, isAsync);
  }
  if (!exprList.length) {
    if (isAsync) {
      return;
    } else {
      this.unexpected(this.state.lastTokStart);
    }
  }
  if (optionalCommaStart)
    this.unexpected(optionalCommaStart);
  if (spreadStart)
    this.unexpected(spreadStart);
  if (refShorthandDefaultPos.start)
    this.unexpected(refShorthandDefaultPos.start);
  if (exprList.length > 1) {
    val = this.startNodeAt(innerStartPos, innerStartLoc);
    val.expressions = exprList;
    this.toReferencedList(val.expressions);
    this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
  } else {
    val = exprList[0];
  }
  this.addExtra(val, "parenthesized", true);
  this.addExtra(val, "parenStart", startPos);
  return val;
};
pp.parseParenItem = function(node) {
  return node;
};
pp.parseNew = function() {
  var node = this.startNode();
  var meta = this.parseIdentifier(true);
  if (this.eat(_tokenizerTypes.types.dot)) {
    return this.parseMetaProperty(node, meta, "target");
  }
  node.callee = this.parseNoCallExpr();
  if (this.eat(_tokenizerTypes.types.parenL)) {
    node.arguments = this.parseExprList(_tokenizerTypes.types.parenR, this.hasPlugin("trailingFunctionCommas"));
    this.toReferencedList(node.arguments);
  } else {
    node.arguments = [];
  }
  return this.finishNode(node, "NewExpression");
};
pp.parseTemplateElement = function() {
  var elem = this.startNode();
  elem.value = {
    raw: this.input.slice(this.state.start, this.state.end).replace(/\r\n?/g, "\n"),
    cooked: this.state.value
  };
  this.next();
  elem.tail = this.match(_tokenizerTypes.types.backQuote);
  return this.finishNode(elem, "TemplateElement");
};
pp.parseTemplate = function() {
  var node = this.startNode();
  this.next();
  node.expressions = [];
  var curElt = this.parseTemplateElement();
  node.quasis = [curElt];
  while (!curElt.tail) {
    this.expect(_tokenizerTypes.types.dollarBraceL);
    node.expressions.push(this.parseExpression());
    this.expect(_tokenizerTypes.types.braceR);
    node.quasis.push(curElt = this.parseTemplateElement());
  }
  this.next();
  return this.finishNode(node, "TemplateLiteral");
};
pp.parseObj = function(isPattern, refShorthandDefaultPos) {
  var decorators = [];
  var propHash = _Object$create(null);
  var first = true;
  var node = this.startNode();
  node.properties = [];
  this.next();
  while (!this.eat(_tokenizerTypes.types.braceR)) {
    if (first) {
      first = false;
    } else {
      this.expect(_tokenizerTypes.types.comma);
      if (this.eat(_tokenizerTypes.types.braceR))
        break;
    }
    while (this.match(_tokenizerTypes.types.at)) {
      decorators.push(this.parseDecorator());
    }
    var prop = this.startNode(),
        isGenerator = false,
        isAsync = false,
        startPos = undefined,
        startLoc = undefined;
    if (decorators.length) {
      prop.decorators = decorators;
      decorators = [];
    }
    if (this.hasPlugin("objectRestSpread") && this.match(_tokenizerTypes.types.ellipsis)) {
      prop = this.parseSpread();
      prop.type = isPattern ? "RestProperty" : "SpreadProperty";
      node.properties.push(prop);
      continue;
    }
    prop.method = false;
    prop.shorthand = false;
    if (isPattern || refShorthandDefaultPos) {
      startPos = this.state.start;
      startLoc = this.state.startLoc;
    }
    if (!isPattern) {
      isGenerator = this.eat(_tokenizerTypes.types.star);
    }
    if (!isPattern && this.hasPlugin("asyncFunctions") && this.isContextual("async")) {
      if (isGenerator)
        this.unexpected();
      var asyncId = this.parseIdentifier();
      if (this.match(_tokenizerTypes.types.colon) || this.match(_tokenizerTypes.types.parenL) || this.match(_tokenizerTypes.types.braceR)) {
        prop.key = asyncId;
      } else {
        isAsync = true;
        if (this.hasPlugin("asyncGenerators"))
          isGenerator = this.eat(_tokenizerTypes.types.star);
        this.parsePropertyName(prop);
      }
    } else {
      this.parsePropertyName(prop);
    }
    this.parseObjPropValue(prop, startPos, startLoc, isGenerator, isAsync, isPattern, refShorthandDefaultPos);
    this.checkPropClash(prop, propHash);
    if (prop.shorthand) {
      this.addExtra(prop, "shorthand", true);
    }
    node.properties.push(prop);
  }
  if (decorators.length) {
    this.raise(this.state.start, "You have trailing decorators with no property");
  }
  return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression");
};
pp.parseObjPropValue = function(prop, startPos, startLoc, isGenerator, isAsync, isPattern, refShorthandDefaultPos) {
  if (isAsync || isGenerator || this.match(_tokenizerTypes.types.parenL)) {
    if (isPattern)
      this.unexpected();
    prop.kind = "method";
    prop.method = true;
    this.parseMethod(prop, isGenerator, isAsync);
    return this.finishNode(prop, "ObjectMethod");
  }
  if (this.eat(_tokenizerTypes.types.colon)) {
    prop.value = isPattern ? this.parseMaybeDefault(this.state.start, this.state.startLoc) : this.parseMaybeAssign(false, refShorthandDefaultPos);
    return this.finishNode(prop, "ObjectProperty");
  }
  if (!prop.computed && prop.key.type === "Identifier" && (prop.key.name === "get" || prop.key.name === "set") && !this.match(_tokenizerTypes.types.comma) && !this.match(_tokenizerTypes.types.braceR)) {
    if (isGenerator || isAsync || isPattern)
      this.unexpected();
    prop.kind = prop.key.name;
    this.parsePropertyName(prop);
    this.parseMethod(prop, false);
    var paramCount = prop.kind === "get" ? 0 : 1;
    if (prop.params.length !== paramCount) {
      var start = prop.start;
      if (prop.kind === "get") {
        this.raise(start, "getter should have no params");
      } else {
        this.raise(start, "setter should have exactly one param");
      }
    }
    return this.finishNode(prop, "ObjectMethod");
  }
  if (!prop.computed && prop.key.type === "Identifier") {
    if (isPattern) {
      var illegalBinding = this.isKeyword(prop.key.name);
      if (!illegalBinding && this.state.strict) {
        illegalBinding = _utilIdentifier.reservedWords.strictBind(prop.key.name) || _utilIdentifier.reservedWords.strict(prop.key.name);
      }
      if (illegalBinding) {
        this.raise(prop.key.start, "Binding " + prop.key.name);
      }
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key.__clone());
    } else if (this.match(_tokenizerTypes.types.eq) && refShorthandDefaultPos) {
      if (!refShorthandDefaultPos.start) {
        refShorthandDefaultPos.start = this.state.start;
      }
      prop.value = this.parseMaybeDefault(startPos, startLoc, prop.key.__clone());
    } else {
      prop.value = prop.key.__clone();
    }
    prop.shorthand = true;
    return this.finishNode(prop, "ObjectProperty");
  }
  this.unexpected();
};
pp.parsePropertyName = function(prop) {
  if (this.eat(_tokenizerTypes.types.bracketL)) {
    prop.computed = true;
    prop.key = this.parseMaybeAssign();
    this.expect(_tokenizerTypes.types.bracketR);
    return prop.key;
  } else {
    prop.computed = false;
    return prop.key = this.match(_tokenizerTypes.types.num) || this.match(_tokenizerTypes.types.string) ? this.parseExprAtom() : this.parseIdentifier(true);
  }
};
pp.initFunction = function(node, isAsync) {
  node.id = null;
  node.generator = false;
  node.expression = false;
  if (this.hasPlugin("asyncFunctions")) {
    node.async = !!isAsync;
  }
};
pp.parseMethod = function(node, isGenerator, isAsync) {
  var oldInMethod = this.state.inMethod;
  this.state.inMethod = node.kind || true;
  this.initFunction(node, isAsync);
  this.expect(_tokenizerTypes.types.parenL);
  node.params = this.parseBindingList(_tokenizerTypes.types.parenR, false, this.hasPlugin("trailingFunctionCommas"));
  node.generator = isGenerator;
  this.parseFunctionBody(node);
  this.state.inMethod = oldInMethod;
  return node;
};
pp.parseArrowExpression = function(node, params, isAsync) {
  this.initFunction(node, isAsync);
  node.params = this.toAssignableList(params, true);
  this.parseFunctionBody(node, true);
  return this.finishNode(node, "ArrowFunctionExpression");
};
pp.parseFunctionBody = function(node, allowExpression) {
  var isExpression = allowExpression && !this.match(_tokenizerTypes.types.braceL);
  var oldInAsync = this.state.inAsync;
  this.state.inAsync = node.async;
  if (isExpression) {
    node.body = this.parseMaybeAssign();
    node.expression = true;
  } else {
    var oldInFunc = this.state.inFunction,
        oldInGen = this.state.inGenerator,
        oldLabels = this.state.labels;
    this.state.inFunction = true;
    this.state.inGenerator = node.generator;
    this.state.labels = [];
    node.body = this.parseBlock(true);
    node.expression = false;
    this.state.inFunction = oldInFunc;
    this.state.inGenerator = oldInGen;
    this.state.labels = oldLabels;
  }
  this.state.inAsync = oldInAsync;
  var checkLVal = this.state.strict;
  var checkLValStrict = false;
  var isStrict = false;
  if (allowExpression)
    checkLVal = true;
  if (!isExpression && node.body.directives.length) {
    for (var _iterator = (node.body.directives),
        _isArray = Array.isArray(_iterator),
        _i2 = 0,
        _iterator = _isArray ? _iterator : _getIterator(_iterator); ; ) {
      var _ref;
      if (_isArray) {
        if (_i2 >= _iterator.length)
          break;
        _ref = _iterator[_i2++];
      } else {
        _i2 = _iterator.next();
        if (_i2.done)
          break;
        _ref = _i2.value;
      }
      var directive = _ref;
      if (directive.value.value === "use strict") {
        isStrict = true;
        checkLVal = true;
        checkLValStrict = true;
        break;
      }
    }
  }
  if (isStrict && node.id && node.id.type === "Identifier" && node.id.name === "yield") {
    this.raise(node.id.start, "Binding yield in strict mode");
  }
  if (checkLVal) {
    var nameHash = _Object$create(null);
    var oldStrict = this.state.strict;
    if (checkLValStrict)
      this.state.strict = true;
    if (node.id) {
      this.checkLVal(node.id, true);
    }
    for (var _iterator2 = (node.params),
        _isArray2 = Array.isArray(_iterator2),
        _i3 = 0,
        _iterator2 = _isArray2 ? _iterator2 : _getIterator(_iterator2); ; ) {
      var _ref2;
      if (_isArray2) {
        if (_i3 >= _iterator2.length)
          break;
        _ref2 = _iterator2[_i3++];
      } else {
        _i3 = _iterator2.next();
        if (_i3.done)
          break;
        _ref2 = _i3.value;
      }
      var param = _ref2;
      this.checkLVal(param, true, nameHash);
    }
    this.state.strict = oldStrict;
  }
};
pp.parseExprList = function(close, allowTrailingComma, allowEmpty, refShorthandDefaultPos) {
  var elts = [],
      first = true;
  while (!this.eat(close)) {
    if (first) {
      first = false;
    } else {
      this.expect(_tokenizerTypes.types.comma);
      if (allowTrailingComma && this.eat(close))
        break;
    }
    elts.push(this.parseExprListItem(allowEmpty, refShorthandDefaultPos));
  }
  return elts;
};
pp.parseExprListItem = function(allowEmpty, refShorthandDefaultPos) {
  var elt = undefined;
  if (allowEmpty && this.match(_tokenizerTypes.types.comma)) {
    elt = null;
  } else if (this.match(_tokenizerTypes.types.ellipsis)) {
    elt = this.parseSpread(refShorthandDefaultPos);
  } else {
    elt = this.parseMaybeAssign(false, refShorthandDefaultPos);
  }
  return elt;
};
pp.parseIdentifier = function(liberal) {
  var node = this.startNode();
  if (this.match(_tokenizerTypes.types.name)) {
    if (!liberal && this.state.strict && _utilIdentifier.reservedWords.strict(this.state.value)) {
      this.raise(this.state.start, "The keyword '" + this.state.value + "' is reserved");
    }
    node.name = this.state.value;
  } else if (liberal && this.state.type.keyword) {
    node.name = this.state.type.keyword;
  } else {
    this.unexpected();
  }
  if (!liberal && node.name === "await" && this.state.inAsync) {
    this.raise(node.start, "invalid use of await inside of an async function");
  }
  this.next();
  return this.finishNode(node, "Identifier");
};
pp.parseAwait = function(node) {
  if (!this.state.inAsync) {
    this.unexpected();
  }
  if (this.isLineTerminator()) {
    this.unexpected();
  }
  node.all = this.eat(_tokenizerTypes.types.star);
  node.argument = this.parseMaybeUnary();
  return this.finishNode(node, "AwaitExpression");
};
pp.parseYield = function() {
  var node = this.startNode();
  this.next();
  if (this.match(_tokenizerTypes.types.semi) || this.canInsertSemicolon() || !this.match(_tokenizerTypes.types.star) && !this.state.type.startsExpr) {
    node.delegate = false;
    node.argument = null;
  } else {
    node.delegate = this.eat(_tokenizerTypes.types.star);
    node.argument = this.parseMaybeAssign();
  }
  return this.finishNode(node, "YieldExpression");
};
