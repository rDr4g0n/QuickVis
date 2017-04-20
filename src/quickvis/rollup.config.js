/* jshint node: true */
import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import babel from "rollup-plugin-babel";

const {ENTRY, DEST} = process.env;

if(!ENTRY || !DEST){
    console.error("Missing ENTRY or DEST");
    process.exit(1);
}

let config = {
    entry: ENTRY,
    dest: DEST,
    moduleName: 'quickvis',
    format: 'iife',
    sourceMap: true,
    plugins: [ resolve(), commonjs(), babel() ]
};

export default config;
