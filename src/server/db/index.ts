import { runtimeCapabilities } from "@/env";

import { DemoStorageAdapter } from "./demo-storage";
import { PrismaStorageAdapter } from "./prisma-storage";
import type { StorageAdapter } from "./storage";

let storageAdapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (storageAdapter) {
    return storageAdapter;
  }

  storageAdapter = runtimeCapabilities.hasDatabase
    ? new PrismaStorageAdapter()
    : new DemoStorageAdapter();

  return storageAdapter;
}
