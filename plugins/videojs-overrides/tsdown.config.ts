import { defineConfig } from "tsdown";

export default defineConfig({
  format: ["esm", "cjs"],
  entry: ["src/main.ts"],
  dts: false,
  copy: { from: 'public/*', flatten: true }
});