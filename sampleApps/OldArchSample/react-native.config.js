const path = require('path');

module.exports = {
  project: {
    ios: {
      automaticPodsInstallation: true,
    },
  },
  assets: ['./src/assets/'],
  // Autolink the SDK from the repo root rather than installing it from npm.
  // Before this, the app depended on react-native-cashfree-pg-sdk@^2.4.0, so
  // it verified the *published* package and never the working tree — which
  // made it useless as a control for the New Architecture investigation.
  dependencies: {
    'react-native-cashfree-pg-sdk': {
      root: path.resolve(__dirname, '..', '..'),
    },
  },
};
