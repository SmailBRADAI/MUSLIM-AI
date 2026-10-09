import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { IDBFactory } from "fake-indexeddb";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { closeDbForTests } from "../../src/data/db";

afterEach(async () => {
  cleanup();
  await closeDbForTests();
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
});
