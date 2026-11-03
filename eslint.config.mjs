import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextVitals,
  ...nextTypescript,
  {
    // Evita que los archivos sigan creciendo: un archivo de más de 400 líneas
    // suele mezclar responsabilidades y conviene dividirlo (ver README, "Convenciones").
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["**/*.test.{ts,tsx}", "**/__tests__/**"],
    rules: {
      "max-lines": ["warn", { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
];

export default eslintConfig;
