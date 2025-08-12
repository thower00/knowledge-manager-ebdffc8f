import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";
import { maskSecretsInObject } from "@/utils/logging";
import { debugAuthState } from "@/integrations/supabase/client";

export function DiagnosticsTab() {
  const { toast } = useToast();
  const [level, setLevel] = useState(logger.getLevel());

  const sampleSecret = useMemo(() => ({
    apiKey: "abcd1234supersecretzyx",
    token: "tok_live_0123456789abcdef",
    authorization: "Bearer sk-secret-abc-123456",
    password: "P@ssw0rd!",
    providerApiKeys: {
      openai: "sk-openai-1234567890abcdef",
      anthropic: "sk-ant-abcdef0123456789",
      cohere: "cohere-xyz-abcdef0123456789",
    },
    nested: {
      notASecret: "hello",
      inner: { private_key: "-----BEGIN PRIVATE KEY-----MIIBVwIBADANBgkq...END" },
    },
  }), []);

  const applyLevel = (lvl: Parameters<typeof logger.setLevel>[0]) => {
    logger.setLevel(lvl);
    setLevel(lvl);
    toast({ title: "Log level updated", description: `Current level: ${lvl}` });
  };

  const runMaskingTest = () => {
    logger.info("Masking test object (should hide secrets):", sampleSecret);
    const masked = maskSecretsInObject(sampleSecret);
    toast({ title: "Masking test dispatched", description: "Check console for masked fields" });
    // Also show masked sample in console explicitly for clarity
    logger.debug("Masked sample (explicit):", masked);
  };

  const dumpAuth = async () => {
    toast({ title: "Dumping auth state", description: "See console for details" });
    try {
      const session = await debugAuthState();
      logger.debug("DiagnosticsTab - debugAuthState returned:", session);
    } catch (e) {
      logger.error("DiagnosticsTab - debugAuthState failed:", e);
    }
  };

  const throwError = () => {
    try {
      throw new Error("Diagnostics sample error");
    } catch (e) {
      logger.error("Caught error (should show name/message/stack)", e);
      toast({ variant: "destructive", title: "Error logged", description: "Inspect console output" });
    }
  };

  const writeAllLevels = () => {
    logger.debug("Sample DEBUG log", { note: "visible only at debug level" });
    logger.info("Sample INFO log", { context: "general info" });
    logger.warn("Sample WARN log", { impact: "non-fatal" });
    logger.error("Sample ERROR log", { action: "investigate" });
    toast({ title: "Sample logs emitted", description: `Active level: ${level}` });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logger Diagnostics</CardTitle>
        <CardDescription>
          Verify masked logging, auth debug output, and level filtering quickly.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">Current level: <span className="font-medium">{level.toUpperCase()}</span></div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => applyLevel("debug")}>Set DEBUG</Button>
            <Button variant="secondary" onClick={() => applyLevel("info")}>Set INFO</Button>
            <Button variant="secondary" onClick={() => applyLevel("warn")}>Set WARN</Button>
            <Button variant="secondary" onClick={() => applyLevel("error")}>Set ERROR</Button>
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button onClick={runMaskingTest}>Run masking test</Button>
          <Button onClick={dumpAuth} variant="outline">Dump auth state</Button>
          <Button onClick={throwError} variant="destructive">Throw & log error</Button>
          <Button onClick={writeAllLevels} variant="ghost">Emit sample logs</Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Open DevTools Console to observe logs. Secret-like fields (apiKey, token, authorization, password, private_key, providerApiKeys) should appear masked.
        </p>
      </CardContent>
    </Card>
  );
}
