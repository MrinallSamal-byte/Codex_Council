const port = process.env.PORT ?? "3000";

try {
  const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Health endpoint returned ${response.status}`);
  }

  process.exit(0);
} catch (error) {
  console.error(
    `[repocouncil:healthcheck] ${error instanceof Error ? error.message : "Unknown error"}`,
  );
  process.exit(1);
}
