import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // seo-autopilot/ ist eigenständiges CommonJS (require) mit eigenen Tests – nicht Teil der Next-App.
  { ignores: ["node_modules/**", ".next/**", "out/**", "next-env.d.ts", "seo-autopilot/**"] },
];

export default eslintConfig;
