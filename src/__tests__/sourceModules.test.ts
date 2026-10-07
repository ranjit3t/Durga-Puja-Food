import { describe, expect, it, jest } from "@jest/globals";
import { readdirSync } from "node:fs";
import { relative, resolve } from "node:path";

const workspaceRoot = resolve(__dirname, "../..");
const sourceRoot = resolve(workspaceRoot, "src");

function collectSourceModules(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceModules(entryPath);
    }

    if (!/\.tsx?$/.test(entry.name) || /\.(test|spec|stories)\.[jt]sx?$/.test(entry.name)) {
      return [];
    }

    return [entryPath];
  });
}

const sourceModules = [
  resolve(workspaceRoot, "App.tsx"),
  resolve(workspaceRoot, "index.ts"),
  ...collectSourceModules(sourceRoot),
].sort();

describe.each(sourceModules.map((filePath) => [relative(workspaceRoot, filePath), filePath]))(
  "source module %s",
  (_relativePath, filePath) => {
    it("loads without invoking a native runtime", () => {
      jest.isolateModules(() => {
        expect(require(filePath as string)).toBeDefined();
      });
    });
  },
);