import { ConfigPlugin, withInfoPlist } from 'expo/config-plugins';

const withIosPlugin: ConfigPlugin = (config) => {
  // Define the custom message

  return withInfoPlist(config, (config) => {
    const schemes = [
      'phonepe',
      'tez',
      'paytmmp',
      'bhim',
      'amazonpay',
      'credpay',
    ];

    // Ensure LSApplicationQueriesSchemes exists
    if (!Array.isArray(config.modResults.LSApplicationQueriesSchemes)) {
      config.modResults.LSApplicationQueriesSchemes = [];
    }

    // Merge without duplicates
    config.modResults.LSApplicationQueriesSchemes = Array.from(
      new Set([...config.modResults.LSApplicationQueriesSchemes, ...schemes])
    );

    return config;
  });
};

const withPlugin: ConfigPlugin = (config) => {
  // apply iOS modifications and return
  return withIosPlugin(config);
};

export default withPlugin;
