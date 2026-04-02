const requiredInProduction = ["NEXT_PUBLIC_APP_URL"];

function fail(message) {
  console.error(`[repocouncil:preflight] ${message}`);
  process.exit(1);
}

for (const key of requiredInProduction) {
  if (!process.env[key]) {
    fail(`Missing required environment variable: ${key}`);
  }
}

try {
  new URL(process.env.NEXT_PUBLIC_APP_URL);
} catch {
  fail("NEXT_PUBLIC_APP_URL must be a valid absolute URL.");
}

const demoMode = process.env.DEMO_MODE !== "false";
if (!demoMode && !process.env.DATABASE_URL) {
  fail("DATABASE_URL is required when DEMO_MODE=false.");
}

const concurrency = Number(process.env.ANALYSIS_MAX_CONCURRENCY ?? "1");
if (!Number.isFinite(concurrency) || concurrency < 1) {
  fail("ANALYSIS_MAX_CONCURRENCY must be a positive integer.");
}

if (!process.env.OPENROUTER_API_KEY) {
  console.warn(
    "[repocouncil:preflight] OPENROUTER_API_KEY is missing. The app will fall back to heuristic agent output.",
  );
}

console.log(
  JSON.stringify(
    {
      event: "runtime_preflight_ok",
      nodeEnv: process.env.NODE_ENV ?? "production",
      demoMode,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      redisConfigured: Boolean(process.env.REDIS_URL),
      analysisMaxConcurrency: concurrency,
    },
    null,
    2,
  ),
);
