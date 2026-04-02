import { CouncilWorkspace } from "@/components/council/council-workspace";
import { runtimeCapabilities } from "@/env";
import { getLatestAskSessionBundle, listAskSessions } from "@/server/services/queries";

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string }>;
}) {
  const { sessionId } = await searchParams;
  const [bundle, sessions] = await Promise.all([
    getLatestAskSessionBundle(sessionId),
    listAskSessions(25),
  ]);

  return (
    <CouncilWorkspace
      initialBundle={bundle}
      initialSessions={sessions}
      maxParticipants={runtimeCapabilities.askMaxParticipants}
      maxActiveAgents={runtimeCapabilities.askMaxActiveAgents}
    />
  );
}
