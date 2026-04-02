const requiredInProduction = ["NEXT_PUBLIC_APP_URL"];

function parseBoolean(value, defaultValue) {
  if (value == null || value === "") {
    return defaultValue;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  fail(`Expected a boolean-like value, received "${value}".`);
}

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

const demoMode = parseBoolean(process.env.DEMO_MODE, true);
if (!demoMode && !process.env.DATABASE_URL) {
  fail("DATABASE_URL is required when DEMO_MODE=false.");
}

if (process.env.DATABASE_URL) {
  try {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
      fail("DATABASE_URL must use the postgres:// or postgresql:// protocol.");
    }
  } catch {
    fail("DATABASE_URL must be a valid PostgreSQL connection string.");
  }
}

for (const key of ["REPO_STORAGE_ROOT", "EXPORT_STORAGE_ROOT"]) {
  const value = process.env[key];
  if (!value) {
    fail(`${key} must be configured.`);
  }

  if (process.env.NODE_ENV === "production" && !value.startsWith("/")) {
    fail(`${key} must be an absolute path in production.`);
  }
}

const concurrency = Number(process.env.ANALYSIS_MAX_CONCURRENCY ?? "1");
if (!Number.isFinite(concurrency) || concurrency < 1) {
  fail("ANALYSIS_MAX_CONCURRENCY must be a positive integer.");
}

const dbConnectMaxRetries = Number(process.env.DB_CONNECT_MAX_RETRIES ?? "10");
if (!Number.isFinite(dbConnectMaxRetries) || dbConnectMaxRetries < 1) {
  fail("DB_CONNECT_MAX_RETRIES must be a positive integer.");
}

parseBoolean(process.env.RUN_DB_PUSH_ON_START, true);
parseBoolean(process.env.RECOVER_RUNNING_RUNS_ON_START, true);

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
      dbConnectMaxRetries,
      nodeOptions: process.env.NODE_OPTIONS ?? "",
    },
    null,
    2,
  ),
);
