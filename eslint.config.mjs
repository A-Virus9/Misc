import globals from "globals";
import pluginJs from "@eslint/js";


export default [
  {rules: {
      "no-undef": off
  }},
  {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
];