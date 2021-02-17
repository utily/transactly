const path = require("path")
// const webpack = require("webpack")
// const TerserPlugin = require('terser-webpack-plugin');

const mode = process.env.NODE_ENV || "production"

module.exports = {
	entry: {
		main: "./worker.ts",
	},
	output: {
		filename: `worker.${mode}.js`,
		path: path.join(__dirname, "dist"),
	},
	mode,
	// optimization: {
	// 	usedExports: true,
	// 	minimizer: [
	// 		new TerserPlugin()
	// 	]
	// },
	resolve: {
		extensions: [".ts", ".tsx", ".js"],
		plugins: [],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: "ts-loader",
				options: {
					transpileOnly: true,
				},
			},
		],
	},
}
