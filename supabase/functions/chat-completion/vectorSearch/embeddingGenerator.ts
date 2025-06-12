
export async function generateQueryEmbedding(question: string, config: any): Promise<number[]> {
  console.log('=== Attempting OpenAI embedding generation ===')
  console.log('API Key available:', !!config.apiKey)
  console.log('Embedding model:', config.embeddingModel)
  console.log('Question length:', question.length)
  
  let embeddingResponse;
  try {
    embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.embeddingModel,
        input: question,
      }),
    })
    
    console.log('OpenAI embedding response status:', embeddingResponse.status)
    console.log('OpenAI embedding response ok:', embeddingResponse.ok)
    
  } catch (fetchError) {
    console.error('=== Fetch error when calling OpenAI embeddings ===')
    console.error('Fetch error details:', {
      message: fetchError.message,
      stack: fetchError.stack,
      name: fetchError.name
    })
    throw new Error(`Network error calling OpenAI embeddings: ${fetchError.message}`)
  }
  
  if (!embeddingResponse.ok) {
    const errorData = await embeddingResponse.text()
    console.error('=== OpenAI embedding API error ===')
    console.error('Status:', embeddingResponse.status)
    console.error('Status text:', embeddingResponse.statusText)
    console.error('Error response:', errorData)
    throw new Error(`Embedding generation failed: ${embeddingResponse.status} - ${errorData}`)
  }
  
  let embeddingData;
  try {
    embeddingData = await embeddingResponse.json()
    console.log('Successfully parsed embedding response')
  } catch (parseError) {
    console.error('=== Error parsing embedding response ===')
    console.error('Parse error:', parseError.message)
    throw new Error(`Failed to parse embedding response: ${parseError.message}`)
  }
  
  if (!embeddingData.data || !embeddingData.data[0] || !embeddingData.data[0].embedding) {
    console.error('=== Invalid embedding data structure ===')
    console.error('Embedding data:', embeddingData)
    throw new Error('Invalid embedding data received from OpenAI')
  }
  
  const queryEmbedding = embeddingData.data[0].embedding
  console.log('Generated embedding with dimensions:', queryEmbedding.length)
  
  return queryEmbedding
}
