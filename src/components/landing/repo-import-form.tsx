"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

export function RepoImportForm() {
  const router = useRouter();
  const [gitUrl, setGitUrl] = useState("");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [message, setMessage] = useState("Import a public repo or try the seeded demo project.");
  const [isPending, startTransition] = useTransition();

  function resolveErrorMessage(payload: unknown, fallback: string) {
    if (
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof payload.error === "string"
    ) {
      return payload.error;
    }

    return fallback;
  }

  async function startRun(repositoryId: string) {
    const response = await fetch("/api/analysis/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repositoryId,
        mode: "full",
      }),
    });
    const payload = (await response.json()) as { run: { id: string } };
    router.push(`/dashboard?runId=${payload.run.id}`);
  }

  return (
    <Card className="border-cyan-400/10 bg-slate-950/75">
      <CardHeader>
        <CardTitle>Import and analyze</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <Input
            placeholder="https://github.com/owner/repo"
            value={gitUrl}
            onChange={(event) => setGitUrl(event.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() =>
                startTransition(async () => {
                  try {
                    setMessage("Downloading the public GitHub repository and starting analysis.");
                    const response = await fetch("/api/repos/import", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ gitUrl }),
                    });
                    const payload = (await response.json()) as
                      | { repository: { id: string } }
                      | { error: string };

                    if (!response.ok || !("repository" in payload)) {
                      throw new Error(
                        resolveErrorMessage(payload, "GitHub repository import failed."),
                      );
                    }

                    await startRun(payload.repository.id);
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : "GitHub repository import failed.",
                    );
                  }
                })
              }
              disabled={!gitUrl || isPending}
            >
              Analyze GitHub repo
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                startTransition(async () => {
                  try {
                    setMessage("Bootstrapping the seeded demo repository.");
                    const response = await fetch("/api/repos/import", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ useDemo: true }),
                    });
                    const payload = (await response.json()) as
                      | { repository: { id: string } }
                      | { error: string };

                    if (!response.ok || !("repository" in payload)) {
                      throw new Error(resolveErrorMessage(payload, "Demo import failed."));
                    }

                    await startRun(payload.repository.id);
                  } catch (error) {
                    setMessage(
                      error instanceof Error ? error.message : "Demo import failed.",
                    );
                  }
                })
              }
              disabled={isPending}
            >
              Analyze demo repo
            </Button>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-white/10 p-4">
          <label className="mb-2 block text-sm font-medium text-white">Upload local zip</label>
          <Input
            type="file"
            accept=".zip"
            onChange={(event) => setZipFile(event.target.files?.[0] ?? null)}
          />
          <Button
            className="mt-3"
            variant="secondary"
            disabled={!zipFile || isPending}
            onClick={() =>
              startTransition(async () => {
                try {
                  const formData = new FormData();
                  formData.append("archive", zipFile!);
                  setMessage("Uploading the repository snapshot.");
                  const response = await fetch("/api/repos/import", {
                    method: "POST",
                    body: formData,
                  });
                  const payload = (await response.json()) as
                    | { repository: { id: string } }
                    | { error: string };

                  if (!response.ok || !("repository" in payload)) {
                    throw new Error(resolveErrorMessage(payload, "Zip import failed."));
                  }

                  await startRun(payload.repository.id);
                } catch (error) {
                  setMessage(
                    error instanceof Error ? error.message : "Zip import failed.",
                  );
                }
              })
            }
          >
            Upload and analyze
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
