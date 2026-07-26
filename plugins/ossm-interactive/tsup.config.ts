import { defineConfig } from "tsup";

export default defineConfig(() => {
  return {
    format: ["esm", "cjs"],
    entryPoints: ["src/main.ts", "ossm-Interactive.yml"],
    dts: false,
    loader: {
      '.yml': 'copy',
    },
    publicDir: true
  };
});