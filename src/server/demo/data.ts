import type { AnalysisBundle } from "@/lib/contracts/domain";

import { getDefaultModelSettings } from "../models/defaults";

const repositoryId = "repo_demo_repocouncil";
const runId = "run_demo_001";
const now = "2026-04-02T14:30:00.000Z";

export function createDemoBundle(): AnalysisBundle {
  return {
    repository: {
      id: repositoryId,
      name: "Acme Commerce Dashboard",
      sourceType: "demo",
      gitUrl: "https://github.com/example/acme-commerce-dashboard",
      defaultBranch: "main",
      stackDetection: {
        framework: "Next.js",
        runtime: "Node.js",
        language: "TypeScript",
        database: "Prisma/PostgreSQL",
        packageManager: "pnpm",
      },
      metadata: {
        workspacePath: ".repocouncil/demo/acme-commerce-dashboard",
      },
      createdAt: now,
    },
    run: {
      id: runId,
      repositoryId,
      status: "completed",
      startedAt: now,
      completedAt: "2026-04-02T14:33:42.000Z",
      summary: {
        totalFindings: 9,
        critical: 1,
        high: 3,
        medium: 3,
        low: 2,
      },
      threadId: "thread_demo_001",
    },
    graph: {
      nodes: [
        {
          id: "node_page_dashboard",
          analysisRunId: runId,
          nodeKey: "page:dashboard",
          type: "page",
          label: "Dashboard Page",
          filePath: "src/app/dashboard/page.tsx",
          symbol: "DashboardPage",
          position: { x: 80, y: 100 },
          metadata: { layer: "frontend" },
        },
        {
          id: "node_api_client",
          analysisRunId: runId,
          nodeKey: "module:api-client",
          type: "module",
          label: "api/client.ts",
          filePath: "src/lib/api/client.ts",
          symbol: "apiClient",
          position: { x: 320, y: 100 },
          metadata: { layer: "frontend" },
        },
        {
          id: "node_route_orders",
          analysisRunId: runId,
          nodeKey: "route:orders",
          type: "route",
          label: "GET /api/orders",
          filePath: "src/app/api/orders/route.ts",
          symbol: "GET",
          position: { x: 560, y: 90 },
          metadata: { layer: "backend" },
        },
        {
          id: "node_controller_orders",
          analysisRunId: runId,
          nodeKey: "controller:orders",
          type: "controller",
          label: "orders.controller",
          filePath: "src/server/controllers/orders.controller.ts",
          symbol: "getOrders",
          position: { x: 800, y: 90 },
          metadata: { layer: "backend" },
        },
        {
          id: "node_service_orders",
          analysisRunId: runId,
          nodeKey: "service:order-service",
          type: "service",
          label: "Order Service",
          filePath: "src/server/services/orders.service.ts",
          symbol: "fetchOrders",
          position: { x: 1040, y: 80 },
          metadata: { layer: "domain" },
        },
        {
          id: "node_model_order",
          analysisRunId: runId,
          nodeKey: "model:Order",
          type: "model",
          label: "Order Model",
          filePath: "prisma/schema.prisma",
          symbol: "model Order",
          position: { x: 1260, y: 40 },
          metadata: { layer: "data" },
        },
        {
          id: "node_external_stripe",
          analysisRunId: runId,
          nodeKey: "external:stripe",
          type: "external_api",
          label: "Stripe API",
          filePath: "src/server/integrations/stripe.ts",
          symbol: "stripe",
          position: { x: 1260, y: 160 },
          metadata: { layer: "integration" },
        },
        {
          id: "node_auth",
          analysisRunId: runId,
          nodeKey: "auth:session",
          type: "auth",
          label: "Auth Guard",
          filePath: "src/server/auth/require-session.ts",
          symbol: "requireSession",
          position: { x: 560, y: 260 },
          metadata: { layer: "cross-cutting" },
        },
        {
          id: "node_job_sync",
          analysisRunId: runId,
          nodeKey: "job:inventory-sync",
          type: "job",
          label: "Inventory Sync Job",
          filePath: "src/server/jobs/inventory-sync.ts",
          symbol: "runInventorySync",
          position: { x: 1040, y: 260 },
          metadata: { layer: "ops" },
        },
        {
          id: "node_config_env",
          analysisRunId: runId,
          nodeKey: "config:env",
          type: "config",
          label: "Environment Config",
          filePath: "src/env.ts",
          symbol: "env",
          position: { x: 1260, y: 300 },
          metadata: { layer: "ops" },
        },
      ],
      edges: [
        {
          id: "edge_1",
          analysisRunId: runId,
          edgeKey: "page:dashboard->module:api-client:uses",
          sourceNodeKey: "page:dashboard",
          targetNodeKey: "module:api-client",
          label: "uses",
          kind: "dependency",
          metadata: { flow: "ui-to-api" },
        },
        {
          id: "edge_2",
          analysisRunId: runId,
          edgeKey: "module:api-client->route:orders:fetches",
          sourceNodeKey: "module:api-client",
          targetNodeKey: "route:orders",
          label: "fetches",
          kind: "request",
          metadata: {},
        },
        {
          id: "edge_3",
          analysisRunId: runId,
          edgeKey: "route:orders->auth:session:guarded-by",
          sourceNodeKey: "route:orders",
          targetNodeKey: "auth:session",
          label: "guarded by",
          kind: "policy",
          metadata: {},
        },
        {
          id: "edge_4",
          analysisRunId: runId,
          edgeKey: "route:orders->controller:orders:delegates",
          sourceNodeKey: "route:orders",
          targetNodeKey: "controller:orders",
          label: "delegates",
          kind: "call",
          metadata: {},
        },
        {
          id: "edge_5",
          analysisRunId: runId,
          edgeKey: "controller:orders->service:order-service:calls",
          sourceNodeKey: "controller:orders",
          targetNodeKey: "service:order-service",
          label: "calls",
          kind: "call",
          metadata: {},
        },
        {
          id: "edge_6",
          analysisRunId: runId,
          edgeKey: "service:order-service->model:Order:reads",
          sourceNodeKey: "service:order-service",
          targetNodeKey: "model:Order",
          label: "reads",
          kind: "data",
          metadata: {},
        },
        {
          id: "edge_7",
          analysisRunId: runId,
          edgeKey: "service:order-service->external:stripe:charges",
          sourceNodeKey: "service:order-service",
          targetNodeKey: "external:stripe",
          label: "charges",
          kind: "integration",
          metadata: {},
        },
        {
          id: "edge_8",
          analysisRunId: runId,
          edgeKey: "job:inventory-sync->model:Order:updates",
          sourceNodeKey: "job:inventory-sync",
          targetNodeKey: "model:Order",
          label: "updates",
          kind: "data",
          metadata: {},
        },
        {
          id: "edge_9",
          analysisRunId: runId,
          edgeKey: "job:inventory-sync->config:env:uses",
          sourceNodeKey: "job:inventory-sync",
          targetNodeKey: "config:env",
          label: "uses",
          kind: "dependency",
          metadata: {},
        },
      ],
    },
    turns: [
      {
        id: "turn_scout_1",
        analysisRunId: runId,
        agentName: "scout",
        model: "qwen/qwen3.6-plus:free",
        provider: "openrouter",
        turnIndex: 1,
        inputSummary: "Initial repository crawl, stack classification, and hotspot scan.",
        outputJson: {
          repoSummary:
            "Next.js commerce dashboard with a thin frontend, a route/controller/service split, Prisma for persistence, and Stripe-backed checkout logic. Testing coverage is sparse around auth and payment paths.",
          frameworks: ["Next.js", "React", "TypeScript", "Prisma"],
          modules: ["dashboard", "orders-api", "stripe-integration", "inventory-job"],
          hotspots: [
            {
              module: "orders-api",
              rationale: "Handles sensitive order and payment flows.",
              severity: "high",
            },
            {
              module: "inventory-job",
              rationale: "Background mutation path without obvious validation hooks.",
              severity: "medium",
            },
          ],
          nextTools: ["route-extractor", "todo-finder", "semgrep"],
          evidence: [
            {
              toolName: "file-crawler",
              filePath: "src/app/api/orders/route.ts",
              note: "Sensitive read path discovered.",
            },
          ],
        },
        evidenceRefs: [
          {
            toolName: "file-crawler",
            filePath: "src/app/api/orders/route.ts",
          },
        ],
        createdAt: "2026-04-02T14:30:11.000Z",
      },
      {
        id: "turn_architect_1",
        analysisRunId: runId,
        agentName: "architect",
        model: "qwen/qwen3.6-plus:free",
        provider: "openrouter",
        turnIndex: 2,
        inputSummary: "Consume scout map and infer dependency flow.",
        outputJson: {
          architectureSummary:
            "The project is organized as a classic page -> API client -> route -> controller -> service -> Prisma flow. The main structural risk is that auth and validation appear to be route-local conventions rather than enforced cross-cutting infrastructure.",
          dependencyFlows: [
            {
              from: "Dashboard Page",
              to: "GET /api/orders",
              description: "Revenue and order cards pull directly from orders route.",
            },
            {
              from: "Order Service",
              to: "Stripe API",
              description: "Checkout and refund flows rely on the Stripe integration.",
            },
          ],
          hypotheses: [
            "Auth checks are inconsistent across route handlers.",
            "Background jobs bypass the same validation path as interactive routes.",
          ],
          blindSpots: ["No clear evidence yet for admin-only role enforcement."],
          evidence: [
            {
              toolName: "import-graph",
              filePath: "src/server/services/orders.service.ts",
            },
          ],
        },
        evidenceRefs: [
          {
            toolName: "import-graph",
            filePath: "src/server/services/orders.service.ts",
          },
        ],
        createdAt: "2026-04-02T14:30:44.000Z",
      },
      {
        id: "turn_security_1",
        analysisRunId: runId,
        agentName: "security",
        model: "qwen/qwen3.6-plus:free",
        provider: "openrouter",
        turnIndex: 3,
        inputSummary: "Evaluate auth, validation, secrets, and dangerous patterns.",
        outputJson: {
          summary:
            "The highest risk is a sensitive orders route that lacks explicit role enforcement and request schema validation. There is also evidence of a hard-coded fallback token in local development utilities.",
          findings: [],
          critiques: [
            "Feature additions that expand admin surfaces should be blocked until authorization is centralized.",
          ],
          evidence: [
            {
              toolName: "semgrep",
              filePath: "src/server/auth/require-session.ts",
            },
          ],
        },
        evidenceRefs: [
          {
            toolName: "semgrep",
            filePath: "src/server/auth/require-session.ts",
          },
        ],
        createdAt: "2026-04-02T14:31:08.000Z",
      },
      {
        id: "turn_implementation_1",
        analysisRunId: runId,
        agentName: "implementation",
        model: "qwen/qwen3-coder:free",
        provider: "openrouter",
        turnIndex: 4,
        inputSummary: "Inspect TODOs, stubs, dead paths, and disconnected flows.",
        outputJson: {
          summary:
            "The codebase shows a partially wired analytics dashboard, several TODOs in checkout error handling, and a refund button in UI that does not map to any server route.",
          findings: [],
          incompleteAreas: [
            "Refund workflow lacks backend implementation.",
            "Analytics dashboard cards rely on placeholder data.",
          ],
          evidence: [
            {
              toolName: "todo-finder",
              filePath: "src/app/dashboard/page.tsx",
            },
          ],
        },
        evidenceRefs: [
          {
            toolName: "todo-finder",
            filePath: "src/app/dashboard/page.tsx",
          },
        ],
        createdAt: "2026-04-02T14:31:31.000Z",
      },
      {
        id: "turn_product_1",
        analysisRunId: runId,
        agentName: "product",
        model: "qwen/qwen3.6-plus:free",
        provider: "openrouter",
        turnIndex: 5,
        inputSummary: "Propose five high-value features grounded in current product shape.",
        outputJson: {
          summary:
            "The best near-term product investments reinforce visibility and order operations without materially increasing compliance scope beyond the existing commerce surface.",
          features: [],
          evidence: [
            {
              toolName: "route-extractor",
              filePath: "src/app/dashboard/page.tsx",
            },
          ],
        },
        evidenceRefs: [
          {
            toolName: "route-extractor",
            filePath: "src/app/dashboard/page.tsx",
          },
        ],
        createdAt: "2026-04-02T14:31:59.000Z",
      },
      {
        id: "turn_judge_1",
        analysisRunId: runId,
        agentName: "judge",
        model: "qwen/qwen3.6-plus:free",
        provider: "openrouter",
        turnIndex: 6,
        inputSummary: "Resolve conflicts and produce a phased action plan.",
        outputJson: {
          summary:
            "Centralize authorization and validation first, then close incomplete order operations, then expand product value with admin-safe observability features.",
          urgentFixes: [
            "Add explicit authz and schema validation to order-sensitive routes.",
            "Remove development fallback token handling from shared utilities.",
          ],
          incompleteAreas: ["Refund workflow", "Analytics card wiring", "High-risk test coverage"],
          structuralRefactors: [
            "Introduce shared route guard middleware.",
            "Move checkout payload validation into service boundary contracts.",
          ],
          phasedRoadmap: [
            {
              phase: "Phase 1",
              goals: ["Secure order routes", "Backfill tests around auth and payments"],
            },
            {
              phase: "Phase 2",
              goals: ["Ship refund workflow", "Replace placeholder analytics data"],
            },
            {
              phase: "Phase 3",
              goals: ["Add advanced operations tooling and reporting"],
            },
          ],
          confidence: 0.84,
          openQuestions: ["Whether admin routes use a shared role guard outside the scanned subset."],
          evidence: [
            {
              toolName: "judge-synthesis",
              note: "Consensus derived from scout, architect, security, implementation, and product passes.",
            },
          ],
        },
        evidenceRefs: [
          {
            toolName: "judge-synthesis",
            note: "Consensus derived from all upstream agent turns.",
          },
        ],
        createdAt: "2026-04-02T14:32:40.000Z",
      },
    ],
    findings: [
      {
        id: "finding_1",
        analysisRunId: runId,
        category: "security",
        severity: "critical",
        confidence: 0.91,
        title: "Sensitive orders route lacks explicit role enforcement",
        description:
          "The orders API route appears authenticated but not authorized. High-value order data can likely be retrieved by any signed-in user unless downstream guards exist outside the scanned path.",
        filePath: "src/app/api/orders/route.ts",
        symbol: "GET",
        lineStart: 12,
        lineEnd: 38,
        impactedAreas: ["auth", "api"],
        evidence: [
          {
            toolName: "route-extractor",
            filePath: "src/app/api/orders/route.ts",
            lineStart: 12,
            lineEnd: 38,
          },
        ],
        status: "open",
        sourceAgent: "security",
      },
      {
        id: "finding_2",
        analysisRunId: runId,
        category: "security",
        severity: "high",
        confidence: 0.87,
        title: "Missing request payload validation in checkout service",
        description:
          "The checkout payload flows from route handlers into the order service without a validated schema boundary. This increases the risk of malformed payment metadata and downstream runtime faults.",
        filePath: "src/server/services/orders.service.ts",
        symbol: "createCheckoutSession",
        lineStart: 52,
        lineEnd: 117,
        impactedAreas: ["api", "services"],
        evidence: [
          {
            toolName: "semgrep",
            filePath: "src/server/services/orders.service.ts",
            lineStart: 52,
            lineEnd: 117,
          },
        ],
        status: "open",
        sourceAgent: "security",
      },
      {
        id: "finding_3",
        analysisRunId: runId,
        category: "security",
        severity: "high",
        confidence: 0.78,
        title: "Hard-coded development token fallback detected",
        description:
          "A shared utility contains a local fallback token string. Even if development-only, this pattern risks accidental propagation into preview environments and normalizes weak secret handling.",
        filePath: "src/server/auth/dev-token.ts",
        symbol: "getDevToken",
        lineStart: 8,
        lineEnd: 19,
        impactedAreas: ["auth", "config"],
        evidence: [
          {
            toolName: "semgrep",
            filePath: "src/server/auth/dev-token.ts",
            lineStart: 8,
            lineEnd: 19,
          },
        ],
        status: "open",
        sourceAgent: "security",
      },
      {
        id: "finding_4",
        analysisRunId: runId,
        category: "implementation",
        severity: "high",
        confidence: 0.86,
        title: "Refund button has no backend implementation",
        description:
          "The frontend exposes a refund action in the order detail view, but no corresponding refund route or server action was found. This creates a broken operational path.",
        filePath: "src/components/orders/order-actions.tsx",
        symbol: "RefundOrderButton",
        lineStart: 24,
        lineEnd: 61,
        impactedAreas: ["ui", "api"],
        evidence: [
          {
            toolName: "route-extractor",
            filePath: "src/components/orders/order-actions.tsx",
          },
        ],
        status: "open",
        sourceAgent: "implementation",
      },
      {
        id: "finding_5",
        analysisRunId: runId,
        category: "implementation",
        severity: "medium",
        confidence: 0.82,
        title: "Analytics cards still depend on placeholder metrics",
        description:
          "Dashboard summary cards are using placeholder values instead of repository-backed metrics, leaving the headline admin view partially incomplete.",
        filePath: "src/app/dashboard/page.tsx",
        symbol: "DashboardPage",
        lineStart: 43,
        lineEnd: 74,
        impactedAreas: ["ui", "api"],
        evidence: [
          {
            toolName: "todo-finder",
            filePath: "src/app/dashboard/page.tsx",
            lineStart: 43,
            lineEnd: 74,
          },
        ],
        status: "open",
        sourceAgent: "implementation",
      },
      {
        id: "finding_6",
        analysisRunId: runId,
        category: "maintainability",
        severity: "medium",
        confidence: 0.76,
        title: "Order service is accumulating unrelated concerns",
        description:
          "The order service handles querying, payment orchestration, retry logic, and formatting. This increases the cost of adding validation and makes testing narrower paths harder.",
        filePath: "src/server/services/orders.service.ts",
        symbol: "OrderService",
        lineStart: 1,
        lineEnd: 214,
        impactedAreas: ["services", "tests"],
        evidence: [
          {
            toolName: "import-graph",
            filePath: "src/server/services/orders.service.ts",
          },
        ],
        status: "open",
        sourceAgent: "architect",
      },
      {
        id: "finding_7",
        analysisRunId: runId,
        category: "maintainability",
        severity: "low",
        confidence: 0.74,
        title: "Inventory sync job lacks structured logging fields",
        description:
          "The background job emits plain log strings without stable identifiers, making incident investigation and replay analysis slower.",
        filePath: "src/server/jobs/inventory-sync.ts",
        symbol: "runInventorySync",
        lineStart: 17,
        lineEnd: 55,
        impactedAreas: ["infra", "services"],
        evidence: [
          {
            toolName: "file-crawler",
            filePath: "src/server/jobs/inventory-sync.ts",
          },
        ],
        status: "open",
        sourceAgent: "architect",
      },
      {
        id: "finding_8",
        analysisRunId: runId,
        category: "implementation",
        severity: "medium",
        confidence: 0.81,
        title: "High-risk payment flow has no end-to-end test coverage",
        description:
          "No tests were found covering checkout creation, Stripe callback handling, or refund-edge behavior in the scanned project subset.",
        filePath: "src/server/services/orders.service.ts",
        symbol: "createCheckoutSession",
        lineStart: 52,
        lineEnd: 117,
        impactedAreas: ["tests", "services"],
        evidence: [
          {
            toolName: "test-presence",
            filePath: "src/server/services/orders.service.ts",
          },
        ],
        status: "open",
        sourceAgent: "implementation",
      },
      {
        id: "finding_9",
        analysisRunId: runId,
        category: "architecture",
        severity: "low",
        confidence: 0.69,
        title: "Authorization policy appears route-local instead of centralized",
        description:
          "Multiple handlers likely implement guard logic directly. Even where secure today, this pattern scales poorly and tends to drift across new features.",
        filePath: "src/server/auth/require-session.ts",
        symbol: "requireSession",
        lineStart: 1,
        lineEnd: 32,
        impactedAreas: ["auth", "services"],
        evidence: [
          {
            toolName: "architect-review",
            filePath: "src/server/auth/require-session.ts",
          },
        ],
        status: "open",
        sourceAgent: "architect",
      },
    ],
    features: [
      {
        id: "feature_1",
        analysisRunId: runId,
        title: "Refund Operations Console",
        value: "Lets support staff resolve customer issues without direct database access.",
        rationale:
          "The UI already suggests a refund workflow, making this the most natural incomplete feature to finish.",
        impactedModules: ["orders-api", "dashboard", "stripe-integration"],
        effort: "M",
        risk: "Moderate because payment state transitions must be idempotent.",
        securityNotes: "Require explicit role checks and audit logging for every refund action.",
        dependencyImpact: "Touches payment orchestration and order service contracts.",
      },
      {
        id: "feature_2",
        analysisRunId: runId,
        title: "Order Health Alerts",
        value: "Warn operators about payment failures, inventory sync drift, and unusual refund spikes.",
        rationale:
          "The codebase already has background jobs and dashboard primitives that can surface operational alerts with strong user value.",
        impactedModules: ["inventory-job", "dashboard", "order-service"],
        effort: "M",
        risk: "Low to moderate; mostly analytics and notification wiring.",
        securityNotes: "Alert delivery should avoid leaking customer-identifying data into shared channels.",
        dependencyImpact: "Adds monitoring hooks and aggregate query load.",
      },
      {
        id: "feature_3",
        analysisRunId: runId,
        title: "Saved Filters for Order Ops",
        value: "Cuts investigation time for support and finance users by making repeated queue views persistent.",
        rationale:
          "The order-centric admin surface is already present and would benefit from operator workflow acceleration.",
        impactedModules: ["dashboard", "orders-api", "prisma-models"],
        effort: "S",
        risk: "Low.",
        securityNotes: "Persisted filter state must remain scoped to the current authorized operator.",
        dependencyImpact: "Adds a small persistence table and UI state handling.",
      },
      {
        id: "feature_4",
        analysisRunId: runId,
        title: "Customer Timeline View",
        value: "Combines order, refund, and support events into a single operator context pane.",
        rationale:
          "The current architecture already touches orders and payments, so consolidating event visibility is a natural product extension.",
        impactedModules: ["dashboard", "order-service", "external-stripe"],
        effort: "L",
        risk: "Moderate because event normalization can become noisy quickly.",
        securityNotes: "Timeline access must respect customer-data minimization and role-specific field masking.",
        dependencyImpact: "Requires new aggregation logic across existing service boundaries.",
      },
      {
        id: "feature_5",
        analysisRunId: runId,
        title: "Safe Admin Audit Export",
        value: "Gives finance and compliance users a point-in-time export of operational actions and order changes.",
        rationale:
          "The current maintainability and security issues point to a need for better visibility into who changed sensitive state.",
        impactedModules: ["orders-api", "auth", "reporting"],
        effort: "M",
        risk: "Moderate because export scope and data redaction need discipline.",
        securityNotes: "Exports should be permission-scoped, watermarkable, and omit raw secrets or tokens.",
        dependencyImpact: "Adds reporting queries and a controlled export pipeline.",
      },
    ],
    patches: [
      {
        id: "patch_1",
        analysisRunId: runId,
        findingId: "finding_1",
        title: "Add centralized role guard to orders routes",
        whyItMatters: "Protects order and payment data from broad authenticated access.",
        rootCause: "Route handlers authenticate sessions but do not enforce scoped roles consistently.",
        filesAffected: [
          "src/app/api/orders/route.ts",
          "src/server/auth/require-role.ts",
          "src/server/services/orders.service.ts",
        ],
        recommendedSteps: [
          "Introduce a reusable requireRole helper that accepts allowed capabilities.",
          "Call the helper at the route boundary before loading order data.",
          "Add integration tests for operator and non-operator access cases.",
        ],
        draftPatch:
          "const session = await requireSession(request);\nrequireRole(session, ['orders:read']);\nconst result = await orderService.fetchOrders(...);",
        confidence: 0.9,
        status: "draft",
      },
      {
        id: "patch_2",
        analysisRunId: runId,
        findingId: "finding_2",
        title: "Add schema validation for checkout payloads",
        whyItMatters: "Validation at the service edge reduces runtime faults and payment metadata corruption.",
        rootCause: "The order service trusts route payload shape implicitly.",
        filesAffected: [
          "src/server/services/orders.service.ts",
          "src/lib/contracts/checkout.ts",
        ],
        recommendedSteps: [
          "Define a Zod schema for checkout payloads.",
          "Parse and reject invalid payloads before side effects.",
          "Reuse the schema in route handlers and tests.",
        ],
        draftPatch:
          "const payload = CheckoutPayloadSchema.parse(input);\nreturn stripe.checkout.sessions.create(mapPayload(payload));",
        confidence: 0.88,
        status: "draft",
      },
      {
        id: "patch_3",
        analysisRunId: runId,
        findingId: "finding_4",
        title: "Implement refund route and connect the UI action",
        whyItMatters: "Removes a broken operator workflow and closes a visible product gap.",
        rootCause: "The frontend refund affordance shipped before the backend workflow existed.",
        filesAffected: [
          "src/components/orders/order-actions.tsx",
          "src/app/api/orders/[orderId]/refund/route.ts",
          "src/server/services/orders.service.ts",
        ],
        recommendedSteps: [
          "Add a refund route with explicit authz and validation.",
          "Use an idempotent refund service method with audit logging.",
          "Handle optimistic UI state and error display in the button component.",
        ],
        draftPatch: null,
        confidence: 0.84,
        status: "draft",
      },
      {
        id: "patch_4",
        analysisRunId: runId,
        findingId: "finding_8",
        title: "Backfill end-to-end tests for payment and refund paths",
        whyItMatters: "Tests reduce regression risk while auth and payment code is being hardened.",
        rootCause: "Critical flows evolved faster than automated coverage.",
        filesAffected: [
          "tests/orders/checkout.spec.ts",
          "tests/orders/refund.spec.ts",
        ],
        recommendedSteps: [
          "Add test fixtures for operator and customer personas.",
          "Mock Stripe edge responses and verify idempotency handling.",
          "Cover both happy-path and authorization-denied cases.",
        ],
        draftPatch: null,
        confidence: 0.8,
        status: "draft",
      },
    ],
    snapshots: [
      {
        id: "snapshot_1",
        analysisRunId: runId,
        snapshotType: "checkpoint",
        canonicalState: {
          repoSummary:
            "Commerce dashboard with orders, payments, jobs, and admin UI flows backed by Prisma.",
          architectureSummary:
            "Frontend dashboard routes call API handlers that delegate into controller/service modules and integrate with Stripe.",
          findingsByCategory: {
            security: ["finding_1", "finding_2", "finding_3"],
            implementation: ["finding_4", "finding_5", "finding_8"],
            maintainability: ["finding_6", "finding_7"],
            architecture: ["finding_9"],
          },
          openQuestions: ["Are admin routes guarded outside the scanned folder?"],
          contradictions: [
            "Product wants operations features quickly, while Security requires authorization centralization first.",
          ],
          unresolvedEvidenceGaps: ["No complete role-matrix source found in repo subset."],
          finalAgreedPoints: [
            "Authz and validation need to come before new operator features.",
          ],
          rejectedHypotheses: [
            "The repo is frontend-only; service and job modules prove a fuller backend surface.",
          ],
          nextRecommendedTools: ["package-audit", "dead-code-finder"],
        },
        summaryText: "Checkpoint after core agent passes and before judge synthesis.",
        tokenEstimate: 1980,
        createdAt: "2026-04-02T14:31:40.000Z",
      },
      {
        id: "snapshot_2",
        analysisRunId: runId,
        snapshotType: "compressed",
        canonicalState: {
          repoSummary:
            "Commerce admin dashboard with incomplete refund operations and weak authorization boundaries.",
          architectureSummary:
            "Page -> API -> controller -> service -> Prisma/Stripe is the primary request path.",
          findingsByCategory: {
            security: ["finding_1", "finding_2", "finding_3"],
            implementation: ["finding_4", "finding_5", "finding_8"],
            maintainability: ["finding_6", "finding_7"],
            architecture: ["finding_9"],
          },
          openQuestions: ["What is the authoritative role permission source?"],
          contradictions: [
            "Feature expansion is attractive, but the current authz layer is not strong enough yet.",
          ],
          unresolvedEvidenceGaps: ["Shared authz guard evidence missing."],
          finalAgreedPoints: [
            "Secure order operations first.",
            "Finish refund workflow second.",
            "Then expand admin features.",
          ],
          rejectedHypotheses: [],
          nextRecommendedTools: ["test-presence", "docs-parser"],
        },
        summaryText: "Compressed state suitable for debate resume.",
        tokenEstimate: 824,
        createdAt: "2026-04-02T14:32:12.000Z",
      },
    ],
    reports: [
      {
        id: "report_1",
        analysisRunId: runId,
        title: "RepoCouncil Demo Audit Report",
        format: "markdown",
        content: `# RepoCouncil Final Report

## Summary
- Highest priority: centralize authorization and input validation around order and payment flows.
- Largest implementation gap: the refund operation exists in UI but not on the server.
- Best feature direction: operator tools that improve visibility after the security baseline is repaired.

## Urgent Fixes
1. Add role-based authorization to order-sensitive routes.
2. Validate checkout and refund payloads with shared schemas.
3. Remove development token fallback logic from shared auth helpers.

## Incomplete Areas
- Refund workflow backend support
- Dashboard analytics card wiring
- Test coverage for payment and auth edge cases

## Structural Refactors
- Introduce route-level authz middleware
- Split the order service into payment orchestration and query modules
- Add structured logging to jobs and payment flows
`,
        createdAt: "2026-04-02T14:33:42.000Z",
      },
    ],
    tools: [
      {
        id: "tool_1",
        analysisRunId: runId,
        toolName: "file-crawler",
        input: { root: "." },
        output: { filesScanned: 218, ignored: 1443 },
        status: "completed",
        findingIds: [],
        createdAt: "2026-04-02T14:30:05.000Z",
      },
      {
        id: "tool_2",
        analysisRunId: runId,
        toolName: "import-graph",
        input: { entry: "src" },
        output: { nodes: 52, edges: 87 },
        status: "completed",
        findingIds: ["finding_6", "finding_9"],
        createdAt: "2026-04-02T14:30:36.000Z",
      },
      {
        id: "tool_3",
        analysisRunId: runId,
        toolName: "semgrep",
        input: { ruleset: "p/owasp-top-ten" },
        output: { findings: 3, enabled: true },
        status: "completed",
        findingIds: ["finding_1", "finding_2", "finding_3"],
        createdAt: "2026-04-02T14:31:02.000Z",
      },
      {
        id: "tool_4",
        analysisRunId: runId,
        toolName: "todo-finder",
        input: { patterns: ["TODO", "FIXME", "stub"] },
        output: { findings: 2 },
        status: "completed",
        findingIds: ["finding_4", "finding_5"],
        createdAt: "2026-04-02T14:31:19.000Z",
      },
      {
        id: "tool_5",
        analysisRunId: runId,
        toolName: "test-presence",
        input: { target: "src/server/services/orders.service.ts" },
        output: { matchingTests: [] },
        status: "completed",
        findingIds: ["finding_8"],
        createdAt: "2026-04-02T14:31:24.000Z",
      },
    ],
    modelSettings: getDefaultModelSettings(repositoryId).map((setting, index) => ({
      ...setting,
      id: `model_setting_${index + 1}`,
    })),
  };
}
