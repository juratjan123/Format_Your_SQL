const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');

module.exports = {
  target: 'node',
  mode: 'production',
  devtool: false,
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                "module": "commonjs"
              }
            }
          }
        ]
      }
    ]
  },
  plugins: [
    new CircularDependencyPlugin({
      exclude: /node_modules/,
      failOnError: true,
      allowAsyncCycles: false,
      cwd: process.cwd(),
    })
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log']
          },
          mangle: true
        },
        extractComments: false
      }),
    ],
    usedExports: true,
    sideEffects: false
  },
  performance: {
    hints: false
  }
}; 