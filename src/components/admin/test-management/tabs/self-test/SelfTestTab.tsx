import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useProcessingConfiguration } from "@/components/content/processing/hooks/useProcessingConfiguration";
import { supabase } from "@/integrations/supabase/client";
import { DocumentProcessingService, type ProcessingConfig } from "@/services/documentProcessingService";
import { TestDataCleanupService } from "../../services/testDataCleanupService";
import SelfTestUpload from "./SelfTestUpload";

export const SelfTestTab: React.FC = () => {
  const { toast } = useToast();
  const { config: processingConfig, isLoading: isConfigLoading } = useProcessingConfiguration();
  const [isRunning, setIsRunning] = useState(false);
  const [counts, setCounts] = useState<{documents:number;chunks:number;embeddings:number}>({documents:0,chunks:0,embeddings:0});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const cleanupService = useMemo(() => new TestDataCleanupService(), []);

  const loadCounts = useCallback(async () => {
    const c = await cleanupService.getTestDataCounts();
    setCounts(c);
  }, [cleanupService]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  const buildProcessingConfig = useCallback((): ProcessingConfig => {
    const { chunking, embedding } = processingConfig;
    return {
      chunking,
      embedding: {
        provider: embedding.provider as any,
        model: embedding.model,
        apiKey: embedding.apiKey,
        batchSize: embedding.batchSize,
        similarityThreshold: embedding.similarityThreshold,
        embeddingMetadata: { is_test: true },
        vectorStorage: "supabase",
      },
    };
  }, [processingConfig]);

  const handleFileSelect = useCallback((file: File) => {
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast({ title: "Ogiltig filtyp", description: "Välj en PDF-fil.", variant: "destructive" });
      return;
    }
    const maxBytes = 50 * 1024 * 1024; // 50MB (matchar storage-config)
    if (file.size > maxBytes) {
      toast({ title: "Filen är för stor", description: "Max 50 MB tillåts.", variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  }, [toast]);

  const handleRun = useCallback(async () => {
    if (!selectedFile) {
      toast({ title: "Ingen fil vald", description: "Välj en PDF för att köra self-test.", variant: "destructive" });
      return;
    }

    setIsRunning(true);
    try {
      // 1) Ladda upp filen till Supabase Storage (public bucket: documents)
      const uniquePath = `self-tests/${Date.now()}-${selectedFile.name}`;
      const uploadRes = await supabase.storage
        .from("documents")
        .upload(uniquePath, selectedFile, {
          cacheControl: "3600",
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadRes.error) {
        throw new Error(uploadRes.error.message || "Uppladdning misslyckades");
      }

      const { data: pub } = supabase.storage.from("documents").getPublicUrl(uniquePath);
      const publicUrl = pub?.publicUrl;
      if (!publicUrl) throw new Error("Kunde inte hämta publik URL för den uppladdade filen");

      // 2) Skapa processed_documents-rad (automatisk titel)
      const autoTitle = `TEST: ${selectedFile.name}`;
      const { data: inserted, error: insertError } = await supabase
        .from("processed_documents")
        .insert({
          title: autoTitle,
          source_type: "test",
          source_id: "self-test",
          mime_type: "application/pdf",
          status: "pending",
          url: publicUrl,
          size: selectedFile.size,
        })
        .select("id, title")
        .single();

      if (insertError || !inserted) {
        throw new Error(insertError?.message || "Kunde inte skapa testdokument");
      }

      // 3) Kör bearbetningspipeline
      const processingConfig = buildProcessingConfig();
      const svc = new DocumentProcessingService(processingConfig, (p) => {
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
  }, [selectedFile, buildProcessingConfig, toast, loadCounts]);

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

  const resetSelection = useCallback(() => {
    setSelectedFile(null);
  }, []);

  const hasApiKey = !!processingConfig.embedding.apiKey;
  const handleOpenConfig = useCallback(() => {
    window.open('/configuration-management', '_blank');
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>E2E Test</CardTitle>
          <CardDescription>
            Ladda upp en PDF för end-to-end-test. En testpost skapas och bearbetas till chunks och embeddings som blir sökbara i chatten.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isConfigLoading ? (
            <div>Laddar konfiguration...</div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Leverantör</div>
                  <div className="font-medium capitalize">{processingConfig.embedding.provider}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Modell</div>
                  <div className="font-medium">{processingConfig.embedding.model}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">API-nyckel</div>
                  <div className="font-medium">{hasApiKey ? "Konfigurerad" : "Saknas"}</div>
                </div>
              </div>
              {!hasApiKey && (
                <Alert>
                  <AlertTitle>API-nyckel saknas</AlertTitle>
                  <AlertDescription>
                    Lägg till API-nyckel i Konfigurationshantering för att kunna köra self-test.
                    <div className="mt-2">
                      <Button variant="outline" size="sm" onClick={handleOpenConfig}>
                        Öppna Konfigurationshantering
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}

          <SelfTestUpload
            selectedFile={selectedFile}
            onFileSelect={handleFileSelect}
            disabled={isRunning}
            onReset={resetSelection}
          />

          <div className="flex gap-3">
            <Button onClick={handleRun} disabled={isRunning || !selectedFile || isConfigLoading || !hasApiKey}>Kör E2E Test</Button>
          </div>

          <Alert>
            <AlertTitle>Observera</AlertTitle>
            <AlertDescription>
              Testdatan markeras som test (source_type = "test" och titel prefixad med "TEST:"). Den ligger kvar efter testet så att du kan verifiera i chatten.
              Använd panelen nedan för att rensa när du är klar.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Rensa testdata</CardTitle>
              <CardDescription>Rensar enbart data som är märkt som test.</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadCounts}
            >
              Uppdatera
            </Button>
          </div>
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
