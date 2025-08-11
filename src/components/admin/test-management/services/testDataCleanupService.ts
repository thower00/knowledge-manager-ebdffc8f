import { supabase } from "@/integrations/supabase/client";

export class TestDataCleanupService {
  async getTestDocumentIds(): Promise<string[]> {
    const { data, error } = await supabase
      .from("processed_documents")
      .select("id")
      .eq("source_type", "test");

    if (error) throw new Error(error.message);
    return (data || []).map((d: any) => d.id);
  }

  async getTestDataCounts(): Promise<{ documents: number; chunks: number; embeddings: number }> {
    const ids = await this.getTestDocumentIds();
    const documents = ids.length;

    if (documents === 0) return { documents: 0, chunks: 0, embeddings: 0 };

    const [{ count: chunkCount }, { count: embCount }] = await Promise.all([
      supabase.from("document_chunks").select("*", { count: "exact", head: true }).in("document_id", ids),
      supabase.from("document_embeddings").select("*", { count: "exact", head: true }).in("document_id", ids),
    ]);

    return {
      documents,
      chunks: chunkCount || 0,
      embeddings: embCount || 0,
    };
  }

  async clearTestData(): Promise<{ documents: number; chunks: number; embeddings: number }> {
    const ids = await this.getTestDocumentIds();
    const documents = ids.length;
    if (documents === 0) return { documents: 0, chunks: 0, embeddings: 0 };

    // Get counts before deletion for summary
    const preCounts = await this.getTestDataCounts();

    // Delete in correct order to satisfy FKs
    const { error: embErr } = await supabase
      .from("document_embeddings")
      .delete()
      .in("document_id", ids);
    if (embErr) throw new Error(embErr.message);

    const { error: chunkErr } = await supabase
      .from("document_chunks")
      .delete()
      .in("document_id", ids);
    if (chunkErr) throw new Error(chunkErr.message);

    const { error: docErr } = await supabase
      .from("processed_documents")
      .delete()
      .in("id", ids);
    if (docErr) throw new Error(docErr.message);

    return preCounts;
  }
}
