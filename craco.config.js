const webpack = require('webpack');

module.exports = {
    webpack: {
        configure: (webpackConfig) => {
            // Add fallback for Node.js modules
            webpackConfig.resolve.fallback = {
                ...webpackConfig.resolve.fallback,
                "crypto": false,
                "stream": false,
                "util": false,
                "buffer": false,
                "process": false,
                "path": false,
                "fs": false,
            };

            // Add plugin to handle import.meta
            webpackConfig.plugins.push(
                new webpack.DefinePlugin({
                    'import.meta': '({})',
                })
            );

            return webpackConfig;
        },
    },
};
