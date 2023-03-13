// This library allows us to combine paths easily
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: path.resolve(__dirname, 'src', 'index.js'),
    mode: 'development',

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'bundle.js',
        clean: true
    },
    plugins: [
        // Takes the src/index.html and builds it in dist
        new HtmlWebpackPlugin({
            hash: true,
            template: path.resolve(__dirname, 'src', 'index.html'),
        })
    ],
    devServer: {
        static: {
            // Local filesystem directory where static html files are served
            directory: path.resolve(__dirname, 'src')
        },

        // Don't really like live reloading; prefer to reload myself
        liveReload: false,
        hot: false
    },
    resolve: {
        extensions: ['.js']
    },
    module: {
        rules: [
            {
                test: /\.js/,
                use: {
                    loader: 'babel-loader',
                    options: { presets: ['@babel/preset-env'] }
                }
            },
            {
                test: /\.scss/,
                // Note that postcss loader must come before sass-loader
                use: ['style-loader', 'css-loader', 'postcss-loader', 'sass-loader']
            },
            {
                test: /\.css$/,
                use: [ 'style-loader', 'css-loader', 'postcss-loader' ]
            },
            {
                test: /\.(woff|woff2|eot|ttf|otf)$/i,
                type: 'asset/resource',
            },
            // {
            //     test: /\.woff/,
            //     loader: "url-loader?limit=10000&mimetype=application/font-woff"
            // }, {
            //     test: /\.(ttf|eot|svg)/,
            //     loader: "file-loader"
            // }
        ]
    }
};