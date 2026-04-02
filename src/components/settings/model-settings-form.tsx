"use client";

import { useState, useTransition } from "react";

import type { ModelSetting } from "@/lib/contracts/domain";
import type { ModelVerification } from "@/server/models/verify";
import { titleCase } from "@/lib/utils";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

export function ModelSettingsForm({
  initialSettings,
  initialVerification,
}: {
  initialSettings: ModelSetting[];
  initialVerification: ModelVerification[];
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [verification, setVerification] = useState(initialVerification);
  const [isPending, startTransition] = useTransition();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model routing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {settings.map((setting, index) => (
          <div
            key={`${setting.agentName}_${index}`}
            className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 md:grid-cols-5"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Agent</p>
              <p className="mt-1 text-sm font-medium text-white">
                {titleCase(setting.agentName)}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={verification[index]?.ready ? "low" : "high"}>
                  {verification[index]?.ready ? "Ready" : "Fallback only"}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Provider</p>
              <Input
                value={setting.provider}
                onChange={(event) =>
                  setSettings((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, provider: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Model</p>
              <Input
                value={setting.model}
                onChange={(event) =>
                  setSettings((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, model: event.target.value } : item,
                    ),
                  )
                }
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fallbacks</p>
              <Input
                value={setting.fallbackModels.join(", ")}
                onChange={(event) =>
                  setSettings((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...item,
                            fallbackModels: event.target.value
                              .split(",")
                              .map((value) => value.trim())
                              .filter(Boolean),
                          }
                        : item,
                    ),
                  )
                }
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Temperature</p>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.1}
                value={setting.temperature}
                onChange={(event) =>
                  setSettings((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, temperature: Number(event.target.value) }
                        : item,
                    ),
                  )
                }
              />
            </div>
            <div className="md:col-span-5">
              <p className="text-xs text-slate-400">{verification[index]?.reason}</p>
            </div>
          </div>
        ))}
        <Button
          onClick={() =>
            startTransition(async () => {
              const response = await fetch("/api/settings/models", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ settings }),
              });
              if (!response.ok) {
                return;
              }
              const payload = (await response.json()) as {
                settings: ModelSetting[];
                verification: ModelVerification[];
              };
              setSettings(payload.settings);
              setVerification(payload.verification);
            })
          }
          disabled={isPending}
        >
          Save model settings
        </Button>
      </CardContent>
    </Card>
  );
}
