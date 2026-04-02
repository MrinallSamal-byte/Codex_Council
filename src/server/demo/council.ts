import type { AskSessionBundle } from "@/lib/contracts/domain";

const sessionId = "ask_demo_001";
const now = "2026-04-02T15:12:00.000Z";

export function createDemoAskSessionBundle(): AskSessionBundle {
  return {
    session: {
      id: sessionId,
      title: "Should a two-person startup build with a monolith or microservices?",
      threadId: "ask_thread_demo_001",
      status: "completed",
      question: "Should a two-person startup build with a monolith or microservices?",
      mode: "debate",
      agentCount: 4,
      modelStrategy: "auto",
      answerStyle: "balanced",
      priority: "quality",
      showDebateProcess: true,
      finalAnswerOnly: false,
      webLookupAllowed: false,
      toolsAllowed: false,
      maxActiveAgents: 2,
      requestedModel: null,
      requestedProvider: null,
      finalAnswer:
        "Start with a modular monolith. It keeps deployment and debugging simple for a two-person team while still letting you carve out services later if a real scaling or ownership boundary appears.",
      canonicalSummary: {
        taskType: "architecture",
        classification: "technology strategy",
        contextSummary:
          "The council framed this as an early-stage systems-design decision with high operational trade-offs and limited engineering bandwidth.",
        keySupportingViewpoints: [
          "A monolith minimizes operational surface area while product-market fit is still uncertain.",
          "Service boundaries can be designed inside the codebase before they need to be deployed independently.",
          "Microservices only become net-positive once team structure, scaling pressure, or isolation needs justify the extra complexity.",
        ],
        disagreements: [
          "The skeptic warned that payments and compliance-heavy domains may justify earlier isolation.",
        ],
        actionPlan: [
          "Adopt a modular monolith with explicit domain folders and internal APIs.",
          "Track hotspots that could later become standalone services.",
          "Re-evaluate after sustained scaling, reliability, or team-growth pressure.",
        ],
        minorityView:
          "If the startup already has strict regulatory isolation or multiple independently deployed customer-facing surfaces, a small number of services could be justified earlier.",
        confidence: 0.88,
        finalAnswerModel: "qwen/qwen3.6-plus:free",
        finalAnswerProvider: "openrouter",
        assignments: [
          {
            role: "strategist",
            label: "Strategist",
            rationale: "Structure the decision and trade-offs.",
            provider: "openrouter",
            model: "qwen/qwen3.6-plus:free",
            fallbackModels: [],
            active: true,
          },
          {
            role: "skeptic",
            label: "Skeptic",
            rationale: "Stress-test hidden complexity and risk.",
            provider: "openrouter",
            model: "qwen/qwen3.6-plus:free",
            fallbackModels: [],
            active: true,
          },
          {
            role: "builder",
            label: "Builder",
            rationale: "Translate the decision into a practical implementation path.",
            provider: "openrouter",
            model: "qwen/qwen3-coder:free",
            fallbackModels: [],
            active: true,
          },
          {
            role: "judge",
            label: "Judge",
            rationale: "Synthesize the best answer.",
            provider: "openrouter",
            model: "qwen/qwen3.6-plus:free",
            fallbackModels: [],
            active: true,
          },
        ],
        history: [
          {
            question: "Should a two-person startup build with a monolith or microservices?",
            finalAnswer:
              "Start with a modular monolith and revisit service boundaries when scale or org structure demands it.",
            createdAt: now,
          },
        ],
      },
      metadata: {
        latestRound: "judgment",
      },
      createdAt: now,
      updatedAt: "2026-04-02T15:18:00.000Z",
      completedAt: "2026-04-02T15:18:00.000Z",
    },
    turns: [
      {
        id: "ask_turn_1",
        sessionId,
        role: "strategist",
        roundIndex: 1,
        roundType: "opening",
        turnIndex: 1,
        status: "completed",
        model: "qwen/qwen3.6-plus:free",
        provider: "openrouter",
        inputSummary: "Frame the architecture choice for a very small team.",
        outputJson: {
          summary: "Bias toward a modular monolith because team bandwidth is the scarcest resource.",
          answer:
            "Optimize for shipping speed, simple deploys, and easy local debugging. Use modular boundaries inside one codebase so the architecture can evolve without locking the team into distributed-systems overhead too early.",
          keyPoints: [
            "Fewer moving pieces accelerates iteration.",
            "Clear module boundaries preserve future optionality.",
          ],
          critiques: [],
          recommendations: ["Use domain modules and internal contracts from day one."],
          confidence: 0.85,
        },
        summaryText: "Strategist recommended a modular monolith.",
        createdAt: "2026-04-02T15:13:00.000Z",
      },
      {
        id: "ask_turn_2",
        sessionId,
        role: "skeptic",
        roundIndex: 2,
        roundType: "critique",
        turnIndex: 2,
        status: "completed",
        model: "qwen/qwen3.6-plus:free",
        provider: "openrouter",
        inputSummary: "Challenge the default monolith recommendation.",
        outputJson: {
          summary: "Monolith is usually right, but regulated or highly spiky domains change the answer.",
          answer:
            "The default advice fails if one domain needs strong isolation, independent scaling, or different uptime expectations. Payments, ML inference, or enterprise integrations can create those exceptions early.",
          keyPoints: [
            "Not all startup architectures have the same operational risk profile.",
          ],
          critiques: ["Do not confuse 'simple now' with 'cheap to unwind later' if the domain is highly constrained."],
          recommendations: ["Document triggers that would justify an early service split."],
          confidence: 0.74,
        },
        summaryText: "Skeptic highlighted exceptions driven by risk and isolation.",
        createdAt: "2026-04-02T15:15:00.000Z",
      },
      {
        id: "ask_turn_3",
        sessionId,
        role: "judge",
        roundIndex: 3,
        roundType: "judgment",
        turnIndex: 3,
        status: "completed",
        model: "qwen/qwen3.6-plus:free",
        provider: "openrouter",
        inputSummary: "Synthesize the council answer with a recommendation and caveats.",
        outputJson: {
          summary: "Choose a modular monolith first, with explicit triggers for splitting later.",
          answer:
            "A modular monolith is the best default for a two-person startup because it maximizes execution speed and minimizes operational drag. Build it in a way that makes future extraction possible, and only split services when the business earns that complexity.",
          keySupportingViewpoints: [
            "Speed and focus matter more than early distributed isolation for tiny teams.",
            "Good internal boundaries create a path to future services.",
          ],
          disagreements: [
            "Exception cases exist for compliance-heavy or sharply isolated workloads.",
          ],
          actionPlan: [
            "Set domain boundaries now.",
            "Define extraction triggers.",
            "Review architecture quarterly.",
          ],
          minorityView:
            "Start with selective services only if one domain truly demands operational isolation from day one.",
          confidence: 0.88,
        },
        summaryText: "Judge delivered the final architecture recommendation.",
        createdAt: "2026-04-02T15:18:00.000Z",
      },
    ],
    exports: [],
  };
}
