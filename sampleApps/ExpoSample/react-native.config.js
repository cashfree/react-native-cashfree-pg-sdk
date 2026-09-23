const path = require('path');

// Autolink the SDK from the repo root instead of npm, so this app exercises the
// working tree. Expo picks this up during `expo prebuild` (bare workflow) —
// the SDK ships no Expo config plugin, and src/index.ts:27 states plainly that
// the managed workflow is unsupported.
module.exports = {
  dependencies: {
    'react-native-cashfree-pg-sdk': {
      root: path.resolve(__dirname, '..', '..'),
    },
  },
};
