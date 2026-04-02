"use client";

import ReactMarkdown from "react-markdown";

import type { AnalysisBundle } from "@/lib/contracts/domain";

import { useLiveAnalysisBundle } from "../providers/use-live-analysis-bundle";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export function ReportView({ initialBundle }: { initialBundle: AnalysisBundle }) {
  const { bundle } = useLiveAnalysisBundle(initialBundle);

  if (!bundle) {
    return null;
  }

  const report = bundle.reports[0];
  return (
    <Card>
      <CardHeader>
        <CardTitle>{report?.title ?? "Final report"}</CardTitle>
      </CardHeader>
      <CardContent className="prose prose-invert max-w-none prose-headings:text-white prose-p:text-slate-300 prose-li:text-slate-300">
        <ReactMarkdown>{report?.content ?? "No report available yet."}</ReactMarkdown>
      </CardContent>
    </Card>
  );
}
