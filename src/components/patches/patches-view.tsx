"use client";

import type { AnalysisBundle } from "@/lib/contracts/domain";

import { useLiveAnalysisBundle } from "../providers/use-live-analysis-bundle";
import { PatchPlanViewer } from "./patch-plan-viewer";

export function PatchesView({ initialBundle }: { initialBundle: AnalysisBundle }) {
  const { bundle } = useLiveAnalysisBundle(initialBundle);
  if (!bundle) {
    return null;
  }

  return <PatchPlanViewer patches={bundle.patches} />;
}
