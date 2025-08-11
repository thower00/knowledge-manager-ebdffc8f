import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast, toast } from "@/hooks/use-toast";
import { useConfig } from "@/components/admin/document-processing/ConfigContext";
import { supabase } from "@/integrations/supabase/client";
import { DocumentProcessingService, type ProcessingConfig } from "@/services/documentProcessingService";
import { TestDataCleanupService } from "../../services/testDataCleanupService";

export const SelfTestTab: React.FC = () => {
  const { toast } = useToast();
  const { config } = useConfig();
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [counts, setCounts] = useState<{documents:number;chunks:number;embeddings:number}>({documents:0,chunks:0,embeddings:0});

  const cleanupService = useMemo(() => new TestDataCleanupService(), []);

  const loadCounts = useCallback(async () => {
    const c = await cleanupService.getTestDataCounts();
    setCounts(c);
  }, [cleanupService]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const buildProcessingConfig = useCallback((): ProcessingConfig => {
    const provider = (config.provider || "openai").toLowerCase();
    const model = config.specificModelId || config.embeddingModel || "text-embedding-ada-002";
    const apiKey = (config.providerApiKeys as Record<string, string>)[provider] || config.apiKey || "";

    return {
      chunking: {
        chunkSize: parseInt(config.chunkSize || "1000", 10),
        chunkOverlap: parseInt(config.chunkOverlap || "200", 10),
        chunkStrategy: config.chunkStrategy || "fixed_size",
      },
      embedding: {
        provider: provider as any,
        model,
        apiKey,
        batchSize: parseInt(config.embeddingBatchSize || "10", 10),
        similarityThreshold: config.similarityThreshold || "0.5",
        embeddingMetadata: { is_test: true },
        vectorStorage: "supabase",
      },
    };
  }, [config]);

  const handleRun = useCallback(async () => {
    if (!title || !url) {
      toast({ title: "Fält saknas", description: "Ange titel och PDF-URL.", variant: "destructive" });
      return;
    }
    setIsRunning(true);
    try {
      const prefixedTitle = title.startsWith("TEST:") ? title : `TEST: ${title}`;
      const { data: inserted, error: insertError } = await supabase
        .from("processed_documents")
        .insert({
          title: prefixedTitle,
          source_type: "test",
          source_id: "self-test",
          mime_type: "application/pdf",
          status: "pending",
          url,
        })
        .select("id, title")
        .single();

      if (insertError || !inserted) {
        throw new Error(insertError?.message || "Kunde inte skapa testdokument");
      }

      const processingConfig = buildProcessingConfig();
      const svc = new DocumentProcessingService(processingConfig, (p) => {
        // Optional: could set local progress state
        console.log("Self-test progress:", p);
      });

      const results = await svc.processDocuments([inserted.id]);
      const r = results[0];
      if (r?.success) {
        toast({ title: "Self-test klart", description: `Skapade ${r.chunksGenerated} chunks och ${r.embeddingsGenerated} embeddings.` });
      } else {
        throw new Error(r?.error || "Okänt fel vid bearbetning");
      }

      await loadCounts();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Fel vid self-test", description: e.message || String(e), variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  }, [title, url, buildProcessingConfig, toast, loadCounts]);

  const handleClear = useCallback(async () => {
    try {
      const summary = await cleanupService.clearTestData();
      toast({ title: "Rensning klar", description: `Tog bort ${summary.documents} dokument, ${summary.chunks} chunks, ${summary.embeddings} embeddings.` });
      await loadCounts();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Fel vid rensning", description: e.message || String(e), variant: "destructive" });
    }
  }, [cleanupService, toast, loadCounts]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>E2E Self-test</CardTitle>
          <CardDescription>Kör ett end-to-end-test mot ett PDF-dokument och skapa riktiga embeddings som blir sökbara i chatten.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Titel</Label>
              <Input id="title" placeholder="Ex: Produktblad v1" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">PDF-URL</Label>
              <Input id="url" placeholder="https://.../fil.pdf" value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={handleRun} disabled={isRunning}>Kör E2E Self-test</Button>
          </div>
          <Alert>
            <AlertTitle>Observera</AlertTitle>
            <AlertDescription>
              Testdatan markeras som test (source_type = "test"). Den ligger kvar efter testet så att du kan verifiera i chatten. Använd panelen nedan för att rensa när du är klar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rensa testdata</CardTitle>
          <CardDescription>Rensar enbart data som är märkt som test.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm">Testdokument</div>
              <div className="text-2xl font-semibold">{counts.documents}</div>
            </div>
            <div>
              <div className="text-sm">Chunks</div>
              <div className="text-2xl font-semibold">{counts.chunks}</div>
            </div>
            <div>
              <div className="text-sm">Embeddings</div>
              <div className="text-2xl font-semibold">{counts.embeddings}</div>
            </div>
          </div>
          <Separator />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={counts.documents === 0}>
                Rensa testdata
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Rensa testdata?</AlertDialogTitle>
                <AlertDialogDescription>
                  Detta tar bort {counts.documents} testdokument, {counts.chunks} chunks och {counts.embeddings} embeddings. Åtgärden går inte att ångra.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Avbryt</AlertDialogCancel>
                <AlertDialogAction onClick={handleClear}>Rensa</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default SelfTestTab;
