const path = require('path');

// Autolink the SDK straight from the repo root instead of installing it from
// npm. Deliberately NOT a `file:../..` dependency in package.json: npm would
// run the root's `prepare` (bob build) on install, and we want this app to
// exercise src/ as it sits in the working tree, instrumentation included.
module.exports = {
  dependencies: {
    'react-native-cashfree-pg-sdk': {
      root: path.resolve(__dirname, '..', '..'),
    },
  },
};
