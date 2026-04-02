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

function parseInteger(name, fallback, options = {}) {
  const { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = options;
  const rawValue = process.env[name] ?? String(fallback);
  const value = Number(rawValue);

  if (!Number.isInteger(value)) {
    fail(`${name} must be an integer, received "${rawValue}".`);
  }

  if (value < min || value > max) {
    const bounds =
      Number.isFinite(min) && Number.isFinite(max)
        ? `between ${min} and ${max}`
        : Number.isFinite(min)
          ? `greater than or equal to ${min}`
          : `less than or equal to ${max}`;
    fail(`${name} must be ${bounds}, received "${rawValue}".`);
  }

  return value;
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

const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
if (process.env.NODE_ENV === "production" && ["localhost", "127.0.0.1"].includes(appUrl.hostname)) {
  console.warn(
    "[repocouncil:preflight] NEXT_PUBLIC_APP_URL still points at localhost. App Platform should usually bind this to ${APP_URL}.",
  );
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

const port = parseInteger("PORT", 3000, { min: 1, max: 65535 });
const concurrency = parseInteger("ANALYSIS_MAX_CONCURRENCY", 1, { min: 1 });
const askMaxConcurrency = parseInteger("ASK_MAX_CONCURRENCY", 1, { min: 1 });
const askMaxActiveAgents = parseInteger("ASK_MAX_ACTIVE_AGENTS", 2, { min: 1, max: 6 });
const askMaxParticipants = parseInteger("ASK_MAX_PARTICIPANTS", 6, { min: 1, max: 6 });
const dbConnectMaxRetries = parseInteger("DB_CONNECT_MAX_RETRIES", 10, { min: 1 });

if (askMaxActiveAgents > askMaxParticipants) {
  fail("ASK_MAX_ACTIVE_AGENTS cannot be greater than ASK_MAX_PARTICIPANTS.");
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
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
      demoMode,
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      redisConfigured: Boolean(process.env.REDIS_URL),
      port,
      analysisMaxConcurrency: concurrency,
      askMaxConcurrency,
      askMaxActiveAgents,
      askMaxParticipants,
      dbConnectMaxRetries,
      nodeOptions: process.env.NODE_OPTIONS ?? "",
    },
    null,
    2,
  ),
);
