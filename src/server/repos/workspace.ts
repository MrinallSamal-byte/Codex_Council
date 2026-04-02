import { promises as fs } from "fs";
import path from "path";
import JSZip from "jszip";

import { env } from "@/env";
import { slugify } from "@/lib/utils";

export async function ensureWorkspaceRoot() {
  const workspaceRoot = path.resolve(process.cwd(), env.REPO_STORAGE_ROOT);
  await fs.mkdir(workspaceRoot, { recursive: true });
  return workspaceRoot;
}

export async function createRunWorkspace(repositoryName: string, runId: string) {
  const workspaceRoot = await ensureWorkspaceRoot();
  const workspacePath = path.join(workspaceRoot, `${slugify(repositoryName)}-${runId}`);
  await fs.mkdir(workspacePath, { recursive: true });
  return workspacePath;
}

export async function extractZipArchive(
  fileName: string,
  archive: ArrayBuffer,
  workspacePath: string,
  options?: {
    rootFolderName?: string;
    stripFirstPathSegment?: boolean;
  },
) {
  const zip = await JSZip.loadAsync(archive);
  const prefix =
    slugify(options?.rootFolderName ?? fileName.replace(/\.zip$/i, "")) || "repo";
  await fs.mkdir(workspacePath, { recursive: true });

  await Promise.all(
    Object.entries(zip.files).map(async ([relativePath, entry]) => {
      if (entry.dir) {
        return;
      }

      const sanitizedPath = path
        .normalize(relativePath)
        .replace(/^(\.\.(\/|\\|$))+/, "");
      const pathSegments = sanitizedPath.split(/[\\/]/).filter(Boolean);
      const outputSegments = options?.stripFirstPathSegment ? pathSegments.slice(1) : pathSegments;

      if (outputSegments.length === 0) {
        return;
      }

      const outputRelativePath = outputSegments.join(path.sep);
      const normalizedDestination = path.join(workspacePath, prefix, outputRelativePath);
      await fs.mkdir(path.dirname(normalizedDestination), { recursive: true });
      const content = await entry.async("nodebuffer");
      await fs.writeFile(normalizedDestination, content);
    }),
  );

  return path.join(workspacePath, prefix);
}
