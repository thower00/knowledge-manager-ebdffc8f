import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProxyConnectionStatus } from "@/components/admin/document-extraction/hooks/useProxyConnectionStatus";
import { Plug, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

export function ProxyConnectionPanel() {
  const { toast } = useToast();
  const {
    connectionStatus,
    connectionError,
    checkConnection,
    getConnectionStability,
  } = useProxyConnectionStatus();

  const [correlationId, setCorrelationId] = useState(() =>
    Math.random().toString(36).slice(2, 10)
  );
  const stability = getConnectionStability();

  const statusBadge = useMemo(() => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Badge>
            <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
          </Badge>
        );
      case "checking":
        return (
          <Badge variant="secondary">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> Checking
          </Badge>
        );
      case "error":
        return (
          <Badge variant="outline">
            <XCircle className="h-3 w-3 mr-1" /> Error
          </Badge>
        );
      default:
        return <Badge variant="secondary">Idle</Badge>;
    }
  }, [connectionStatus]);

  const handleForceCheck = async () => {
    const result = await checkConnection(true);
    if (result === "connected") {
      toast({ title: "Proxy connected", description: "Connection is healthy" });
    } else {
      toast({
        variant: "destructive",
        title: "Proxy not reachable",
        description: connectionError || "Connection check failed",
      });
    }
  };

  const handlePingWithCorrelation = async () => {
    const newId = Math.random().toString(36).slice(2, 10);
    setCorrelationId(newId);
    try {
      const { data, error } = await supabase.functions.invoke("pdf-proxy", {
        body: {
          action: "connection_test",
          correlationId: newId,
          timestamp: Date.now(),
        },
      });

      if (error) throw error;

      toast({
        title: "Ping successful",
        description: `Correlation: ${newId}`,
      });
      // also refresh status
      await checkConnection(true);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Ping failed",
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  return (
    <div className="border rounded-md p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4" />
          <span className="font-medium">PDF Proxy Connection</span>
          {statusBadge}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleForceCheck}>
            Check now
          </Button>
          <Button size="sm" onClick={handlePingWithCorrelation}>
            Ping (with correlation)
          </Button>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Stability: {stability.percentage}% {stability.stable ? "(stable)" : "(unstable)"}
      </div>

      {connectionError && (
        <div className="text-sm text-muted-foreground">
          Last error: {connectionError}
        </div>
      )}

      <Separator />
      <div className="text-xs text-muted-foreground">Correlation ID: {correlationId}</div>
    </div>
  );
}
