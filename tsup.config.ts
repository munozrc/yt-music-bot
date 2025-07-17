import type { Options } from "tsup";

export const tsup: Options = {
  clean: true,
  dts: false,
  entry: ["src/**/*.ts"],
  format: ["esm"],
  outDir: "dist",
  shims: true,
  skipNodeModulesBundle: true,
  splitting: true,
};
