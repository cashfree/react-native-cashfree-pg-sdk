"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var config_plugins_1 = require("expo/config-plugins");
var withIosPlugin = function (config) {
    // Define the custom message
    return (0, config_plugins_1.withInfoPlist)(config, function (config) {
        var schemes = [
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
        config.modResults.LSApplicationQueriesSchemes = Array.from(new Set(__spreadArray(__spreadArray([], config.modResults.LSApplicationQueriesSchemes, true), schemes, true)));
        return config;
    });
};
var withPlugin = function (config) {
    // apply iOS modifications and return
    return withIosPlugin(config);
};
exports.default = withPlugin;
