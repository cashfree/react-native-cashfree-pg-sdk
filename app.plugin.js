const withCashfree = require('./plugin/withCashfree.js').default;

module.exports = function (config) {
  return withCashfree(config);
};
