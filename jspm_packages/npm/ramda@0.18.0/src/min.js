/* */ 
var _curry2 = require('./internal/_curry2');
module.exports = _curry2(function min(a, b) {
  return b < a ? b : a;
});
