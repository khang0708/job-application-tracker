const path = require('path');

module.exports = function (options) {
  return {
    ...options,
    entry: {
      main: path.resolve(__dirname, 'src/main.ts'),
      'create-app': path.resolve(__dirname, 'src/create-app.ts'),
    },
    output: {
      ...options.output,
      path: path.resolve(__dirname, 'dist'),
      filename: '[name].js',
      libraryTarget: 'commonjs2',
    },
    externals: [],
    stats: { warnings: true, errors: true },
  };
};
