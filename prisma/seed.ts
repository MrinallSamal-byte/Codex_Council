import { createDemoBundle } from "@/server/demo/data";
import { PrismaStorageAdapter } from "@/server/db/prisma-storage";

async function main() {
  const bundle = createDemoBundle();
  const storage = new PrismaStorageAdapter();

  await storage.createRepository(bundle.repository);
  await storage.createAnalysisRun(bundle.run);
  await storage.saveGraph(bundle.run.id, bundle.graph.nodes, bundle.graph.edges);

  for (const turn of bundle.turns) {
    await storage.appendAgentTurn(bundle.run.id, turn);
  }

  await storage.saveFindings(bundle.run.id, bundle.findings);
  await storage.saveFeatures(bundle.run.id, bundle.features);
  await storage.savePatches(bundle.run.id, bundle.patches);
  await storage.saveSnapshots(bundle.run.id, bundle.snapshots);
  await storage.saveToolExecutions(bundle.run.id, bundle.tools);
  await storage.saveReport(bundle.run.id, bundle.reports[0]);
  await storage.upsertModelSettings(bundle.modelSettings);
}

main()
  .then(async () => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to seed Prisma demo data", error);
    process.exit(1);
  });
