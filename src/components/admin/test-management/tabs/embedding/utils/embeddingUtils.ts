
export const getDimensionsForModel = (modelId: string): number => {
  const dimensionMap: { [key: string]: number } = {
    "text-embedding-ada-002": 1536,
    "text-embedding-3-small": 1536,
    "text-embedding-3-large": 3072,
    "embed-english-v2.0": 4096,
    "embed-multilingual-v2.0": 768,
    "embed-english-light-v2.0": 1024,
    "sentence-transformers/all-mpnet-base-v2": 768,
    "sentence-transformers/all-MiniLM-L6-v2": 384,
    "sentence-transformers/multi-qa-mpnet-base-dot-v1": 768,
    "local-model": 512
  };
  return dimensionMap[modelId] || 1536;
};

export const downloadEmbeddings = (
  embeddingResults: any[], 
  loadedConfig: any, 
  sourceDocument?: string
) => {
  if (embeddingResults.length === 0) return;
  
  const embeddings = {
    metadata: {
      totalEmbeddings: embeddingResults.length,
      model: `${loadedConfig?.provider}/${loadedConfig?.specificModelId}`,
      dimensions: embeddingResults.length > 0 ? embeddingResults[0].embedding.length : getDimensionsForModel(loadedConfig?.specificModelId || "text-embedding-ada-002"),
      generatedAt: new Date().toISOString(),
      sourceDocument: sourceDocument,
      configuration: loadedConfig
    },
    embeddings: embeddingResults
  };
  
  const blob = new Blob([JSON.stringify(embeddings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `embeddings-${loadedConfig?.specificModelId}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
