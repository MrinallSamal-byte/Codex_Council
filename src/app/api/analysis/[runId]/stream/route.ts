import { getLatestAnalysisBundle } from "@/server/services/queries";
import { subscribeToRun } from "@/server/orchestration/progress-bus";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const push = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const bundle = await getLatestAnalysisBundle(runId);
      if (bundle) {
        if (bundle.graph.nodes.length > 0 || bundle.graph.edges.length > 0) {
          push({
            type: "graph.delta",
            runId,
            nodes: bundle.graph.nodes,
            edges: bundle.graph.edges,
          });
        }

        const latestTurn = bundle.turns.at(-1);
        if (bundle.run.status === "completed") {
          push({
            type: "analysis.completed",
            runId,
            bundle,
          });
        } else if (bundle.run.status === "failed") {
          push({
            type: "analysis.failed",
            runId,
            error:
              typeof bundle.run.summary?.error === "string"
                ? bundle.run.summary.error
                : "Analysis failed.",
          });
        } else {
          push({
            type: "analysis.progress",
            runId,
            message:
              latestTurn != null
                ? `Recovered live stream at ${latestTurn.agentName}`
                : bundle.run.status === "running"
                  ? "Recovered live stream for in-progress analysis"
                  : "Analysis is queued",
            percent:
              bundle.run.status === "running"
                ? Math.min(90, 20 + bundle.turns.length * 12)
                : 0,
          });

          if (latestTurn) {
            push({
              type: "agent.turn",
              runId,
              agentName: latestTurn.agentName,
              turnId: latestTurn.id,
            });
          }
        }
      } else {
        push({
          type: "analysis.progress",
          runId,
          message: "SSE stream connected",
          percent: 0,
        });
      }

      const unsubscribe = subscribeToRun(runId, (event) => push(event));
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": keep-alive\n\n"));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
