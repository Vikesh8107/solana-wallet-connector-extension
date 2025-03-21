const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: './src/popup.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  resolve: {
    fallback: {
      "crypto": false,
      "stream": false,
      "path": false,
      "fs": false,
      "buffer": require.resolve("buffer/")
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ]
}; 