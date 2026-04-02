import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["error"],
});

const now = new Date();
const interruptedMessage =
  "Analysis was interrupted during process restart. Resume the run from the latest checkpoint.";

try {
  const runningRuns = await prisma.analysisRun.findMany({
    where: {
      status: {
        in: ["RUNNING", "PENDING"],
      },
    },
    select: {
      id: true,
      summary: true,
    },
  });

  for (const run of runningRuns) {
    const existingSummary =
      run.summary && typeof run.summary === "object" && !Array.isArray(run.summary)
        ? run.summary
        : {};

    await prisma.analysisRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: now,
        summary: {
          ...existingSummary,
          interrupted: true,
          interruptedAt: now.toISOString(),
          recoverable: true,
          error: interruptedMessage,
        },
      },
    });
  }

  if (runningRuns.length > 0) {
    console.log(
      JSON.stringify({
        event: "recovered_interrupted_runs",
        count: runningRuns.length,
      }),
    );
  }
} finally {
  await prisma.$disconnect();
}
