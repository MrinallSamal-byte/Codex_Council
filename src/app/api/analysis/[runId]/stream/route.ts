import { subscribeToRun } from "@/server/orchestration/progress-bus";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ runId: string }> },
) {
  const { runId } = await params;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const push = (event: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      push({
        type: "analysis.progress",
        runId,
        message: "SSE stream connected",
        percent: 0,
      });

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
    },
  });
}
