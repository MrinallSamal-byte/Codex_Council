import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import type { Repository } from "@/lib/contracts/domain";

import { frameworkDetector } from "../analyzers/framework-detector";
import { getStorageAdapter } from "../db";
import { createDemoBundle } from "../demo/data";
import {
  downloadGithubRepositoryArchive,
  fetchGithubRepositoryMetadata,
  parseGithubRepositoryUrl,
} from "./github";
import { createRunWorkspace, extractZipArchive } from "./workspace";

function inferRepoNameFromUrl(gitUrl: string) {
  const pathname = new URL(gitUrl).pathname;
  return pathname.split("/").filter(Boolean).pop()?.replace(/\.git$/, "") ?? "imported-repo";
}

export async function importDemoRepository() {
  const storage = getStorageAdapter();
  const demoBundle = createDemoBundle();
  const sampleRepoPath = path.resolve(process.cwd(), "sample-repos/demo-commerce");
  const workspacePath = await createRunWorkspace(demoBundle.repository.name, "demo");

  await fs.rm(workspacePath, { recursive: true, force: true });
  await fs.mkdir(path.dirname(workspacePath), { recursive: true });
  await fs.cp(sampleRepoPath, workspacePath, { recursive: true });

  return storage.createRepository({
    ...demoBundle.repository,
    id: `repo_demo_${randomUUID()}`,
    metadata: {
      ...demoBundle.repository.metadata,
      workspacePath,
    },
  });
}

export async function importGitRepository(gitUrl: string) {
  const storage = getStorageAdapter();
  const parsedGithubUrl = parseGithubRepositoryUrl(gitUrl);
  const repositoryMetadata = await fetchGithubRepositoryMetadata(
    parsedGithubUrl.owner,
    parsedGithubUrl.repo,
  );
  const repoName = inferRepoNameFromUrl(repositoryMetadata.htmlUrl);
  const workspacePath = await createRunWorkspace(repoName, randomUUID());
  const archive = await downloadGithubRepositoryArchive({
    owner: parsedGithubUrl.owner,
    repo: parsedGithubUrl.repo,
    ref: parsedGithubUrl.ref,
  });
  const extractedWorkspace = await extractZipArchive(
    `${repoName}.zip`,
    archive,
    workspacePath,
    {
      rootFolderName: repoName,
      stripFirstPathSegment: true,
    },
  );
  const stackDetection = await frameworkDetector.execute({ workspacePath: extractedWorkspace });

  return storage.createRepository({
    id: randomUUID(),
    name: repoName,
    sourceType: "github",
    gitUrl: parsedGithubUrl.ref
      ? `${parsedGithubUrl.canonicalUrl}/tree/${parsedGithubUrl.ref}`
      : repositoryMetadata.htmlUrl,
    defaultBranch: repositoryMetadata.defaultBranch,
    stackDetection,
    metadata: {
      workspacePath: extractedWorkspace,
      importStrategy: "github-zipball",
      repoOwner: parsedGithubUrl.owner,
      repoName: parsedGithubUrl.repo,
      repoRef: parsedGithubUrl.ref ?? repositoryMetadata.defaultBranch,
    },
  });
}

export async function importZipRepository(fileName: string, archive: ArrayBuffer) {
  const storage = getStorageAdapter();
  const repoName = fileName.replace(/\.zip$/i, "") || "uploaded-repo";
  const workspacePath = await createRunWorkspace(repoName, randomUUID());
  const extractedWorkspace = await extractZipArchive(fileName, archive, workspacePath);
  const stackDetection = await frameworkDetector.execute({ workspacePath: extractedWorkspace });

  return storage.createRepository({
    id: randomUUID(),
    name: repoName,
    sourceType: "zip_upload",
    gitUrl: null,
    defaultBranch: null,
    stackDetection,
    metadata: {
      workspacePath: extractedWorkspace,
    },
  });
}

export async function getRepositoryOrThrow(repositoryId: string): Promise<Repository> {
  const storage = getStorageAdapter();
  const repository = await storage.getRepository(repositoryId);
  if (!repository) {
    throw new Error(`Repository ${repositoryId} was not found.`);
  }
  return repository;
}
