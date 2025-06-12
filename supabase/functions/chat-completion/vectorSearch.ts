import { ChatConfig } from './config.ts'
import { ContextSource } from './types.ts'
import { VectorSearchResult, DocumentInfo } from './vectorSearch/types.ts'
import { discoverAvailableDocuments } from './vectorSearch/documentDiscovery.ts'
import { generateQueryEmbedding } from './vectorSearch/embeddingGenerator.ts'
import { performSimilaritySearch } from './vectorSearch/vectorSearchEngine.ts'
import { 
  handleFallbackDocumentRetrieval, 
  generateDocumentListingContext, 
  generateFinalFallbackContext 
} from './vectorSearch/fallbackHandler.ts'

// Step 1: Summary request detection functions
function isSummaryRequest(question: string): boolean {
  const summaryKeywords = [
    'summary', 'summarize', 'summarise', 'overview', 'brief', 'outline',
    'key points', 'main points', 'highlights', 'recap', 'digest',
    'sammanfattning', 'översikt', 'huvudpunkter' // Swedish equivalents
  ]
  
  const questionLower = question.toLowerCase()
  return summaryKeywords.some(keyword => questionLower.includes(keyword))
}

function isExtensiveSummary(question: string): boolean {
  const extensiveKeywords = [
    'extensive', 'detailed', 'comprehensive', 'complete', 'full', 'thorough',
    'in-depth', 'lengthy', 'long', 'elaborate',
    'utförlig', 'detaljerad', 'omfattande', 'fullständig' // Swedish equivalents
  ]
  
  const questionLower = question.toLowerCase()
  return isSummaryRequest(question) && 
         extensiveKeywords.some(keyword => questionLower.includes(keyword))
}

// Step 2: Enhanced detection for factual questions requiring specific information
function isSpecificFactualQuestion(question: string): boolean {
  const factualIndicators = [
    // Time-related questions
    'när', 'vilken tid', 'tidsperiod', 'datum', 'tidpunkt', 'period', 'under',
    'from', 'to', 'mellan', 'during', 'timeline',
    // Who/what/where questions
    'vem', 'vad', 'var', 'hur', 'varför', 'which', 'who', 'what', 'where', 'when', 'how',
    // Specific detail questions
    'detaljer', 'specifik', 'exakt', 'details', 'specific', 'exact',
    // Process/method questions
    'genomfördes', 'utfördes', 'implemented', 'conducted', 'carried out'
  ]
  
  const questionLower = question.toLowerCase()
  return factualIndicators.some(indicator => questionLower.includes(indicator))
}

// Step 3: Enhanced title-based search with better Swedish language support
function enhancedTitleSearch(question: string, availableDocuments: DocumentInfo[], isSummary: boolean): DocumentInfo[] {
  console.log('=== Enhanced title search with improved matching ===')
  
  const questionLower = question.toLowerCase()
  console.log('Processing question for title matching:', questionLower)
  
  // Extract potential document identifiers with better Swedish handling
  const cleanedQuestion = questionLower
    .replace(/\b(summary|summarize|summarise|overview|brief|outline|extensive|detailed|comprehensive|complete|full|thorough|in-depth|lengthy|long|elaborate|sammanfattning|översikt|huvudpunkter|utförlig|detaljerad|omfattande|fullständig|under|vilken|tidsperiod|genomfördes|när|datum|tidpunkt|period|av|på|i|för|från|till|med|och|eller|som|det|den|denna|detta|är|var|har|hade|kommer|kan|ska|vill|will|skulle)|of|the|a|an|give|me|can|you|please|i|want|need|from|to|in|on|at|by|with|and|or|that|this|is|was|have|had|will|can|should|want|would)\b/g, '')
    .replace(/[^\wÅÄÖåäö\s]/g, ' ')
    .trim()
  
  console.log('Cleaned question for matching:', cleanedQuestion)
  
  const questionWords = cleanedQuestion.split(/\s+/).filter(word => word.length > 2)
  console.log('Question words for matching:', questionWords)
  
  const matchingDocs = availableDocuments.filter(doc => {
    const titleLower = doc.title.toLowerCase()
    const titleWords = titleLower.split(/[\s\-_\.]+/).filter(word => word.length > 2)
    
    console.log(`Checking document: "${doc.title}"`)
    console.log(`Title words:`, titleWords)
    
    // Enhanced matching logic for better Swedish support
    let hasWordMatch = false
    let hasExactMatch = false
    let hasPartialMatch = false
    
    // Check for direct word matches
    hasWordMatch = questionWords.some(qWord => 
      titleWords.some(tWord => 
        tWord.includes(qWord) || qWord.includes(tWord)
      )
    )
    
    // Check for exact phrase matches
    hasExactMatch = questionWords.some(qWord => titleLower.includes(qWord))
    
    // Check for partial matches with minimum length requirement
    hasPartialMatch = questionWords.some(qWord => 
      qWord.length >= 4 && titleWords.some(tWord => 
        tWord.length >= 4 && (
          tWord.substring(0, Math.min(4, tWord.length)) === qWord.substring(0, Math.min(4, qWord.length)) ||
          // Check for Swedish word variations (common endings)
          (qWord.length > 5 && tWord.length > 5 && 
           qWord.substring(0, 5) === tWord.substring(0, 5))
        )
      )
    )
    
    // Special handling for Swedish compound words and specific terms
    const hasSwedishMatch = questionWords.some(qWord => {
      // Handle common Swedish words that might be part of compound words
      if (qWord === 'staden' && titleLower.includes('stad')) return true
      if (qWord === 'vägledning' && (titleLower.includes('vägled') || titleLower.includes('guidance'))) return true
      if (qWord === 'medborgar' && titleLower.includes('medborgare')) return true
      return false
    })
    
    const isMatch = hasWordMatch || hasExactMatch || hasPartialMatch || hasSwedishMatch
    console.log(`Match result for "${doc.title}":`, { 
      hasWordMatch, hasExactMatch, hasPartialMatch, hasSwedishMatch, isMatch 
    })
    
    return isMatch
  })
  
  console.log('Enhanced title search results:', matchingDocs.map(d => d.title))
  return matchingDocs
}

export async function performVectorSearch(
  supabase: any,
  question: string,
  config: ChatConfig
): Promise<VectorSearchResult> {
  const startTime = Date.now()
  let contextText = ''
  let relevantDocs: ContextSource[] = []
  
  try {
    console.log('=== Starting enhanced vector search ===')
    console.log('Question:', question)
    
    // Step 1: Enhanced request type detection
    const isSummary = isSummaryRequest(question)
    const isExtensive = isExtensiveSummary(question)
    const isFactualQuestion = isSpecificFactualQuestion(question)
    console.log('Enhanced request detection:', { isSummary, isExtensive, isFactualQuestion })
    
    // Enhanced query preprocessing to detect document-specific requests
    const isDocumentSpecific = /\b(the document|this document|document|summarize|summary|list.*documents|what.*documents|documents.*access|specific.*document|particular.*document)\b/i.test(question)
    console.log('Query is document-specific:', isDocumentSpecific)
    
    // Discover available documents
    const availableDocuments = await discoverAvailableDocuments(supabase)
    console.log('Available documents:', availableDocuments.map(d => d.title))

    // For document listing queries, return specific count and clear capabilities
    if (/\b(list.*documents|what.*documents|documents.*access|how many.*documents)\b/i.test(question)) {
      console.log('Processing document listing query...')
      contextText = generateDocumentListingContext(availableDocuments)
      console.log('Using detailed document access info with document list as context')
      return { contextText, relevantDocs, searchDuration: Date.now() - startTime }
    }
    
    // Step 2: Enhanced title-based search with improved matching
    const titleBasedResults = enhancedTitleSearch(question, availableDocuments, isSummary)
    
    if (titleBasedResults.length > 0) {
      console.log('Found documents by enhanced title search:', titleBasedResults.map(r => r.title))
      
      // Enhanced chunk retrieval for factual questions
      const chunkLimit = isFactualQuestion ? 8 : (isSummary ? (isExtensive ? 8 : 5) : 3)
      console.log(`Using chunk limit of ${chunkLimit} for ${isFactualQuestion ? 'factual' : (isSummary ? (isExtensive ? 'extensive summary' : 'summary') : 'regular')} request`)
      
      const results: ContextSource[] = []
      
      for (const doc of titleBasedResults) {
        // Get more chunks for factual questions to ensure we capture specific details
        const { data: chunks, error } = await supabase
          .from('document_chunks')
          .select('content, chunk_index')
          .eq('document_id', doc.id)
          .order('chunk_index', { ascending: true })
          .limit(chunkLimit)
        
        if (!error && chunks && chunks.length > 0) {
          // For factual questions, get more content to ensure we capture details
          const combinedContent = chunks.map(c => c.content).join(' ')
          const contentLength = isFactualQuestion ? 3000 : (isSummary ? (isExtensive ? 2500 : 1800) : 1500)
          
          results.push({
            document_title: doc.title,
            chunk_content: combinedContent.substring(0, contentLength),
            document_id: doc.id,
            document_url: doc.url
          })
          console.log(`Added ${chunks.length} chunks from title-matched document: ${doc.title} (${combinedContent.length} chars, truncated to ${contentLength})`)
        }
      }
      
      relevantDocs = results
      contextText = results
        .map(result => `Document: ${result.document_title}\nContent: ${result.chunk_content}`)
        .join('\n\n')
      
      return { contextText, relevantDocs, searchDuration: Date.now() - startTime }
    }
    
    console.log('No enhanced title matches found, proceeding with enhanced vector search...')
    
    // Step 3: Enhanced vector search with factual question awareness
    console.log('Generating embedding for question...')
    
    // Generate embedding for the user's question
    const queryEmbedding = await generateQueryEmbedding(question, config)

    // Perform similarity search with enhanced parameters for factual questions
    const searchResults = await performSimilaritySearch(
      supabase, 
      queryEmbedding, 
      config, 
      isDocumentSpecific,
      isSummary,
      isExtensive,
      isFactualQuestion  // Pass factual question flag for enhanced search
    )
    
    if (searchResults.length > 0) {
      relevantDocs = searchResults
      contextText = searchResults
        .map(result => `Document: ${result.document_title}\nContent: ${result.chunk_content}`)
        .join('\n\n')
      
      console.log('Found relevant content via enhanced vector search, total context length:', contextText.length)
      
      // Log unique documents found
      const uniqueDocs = [...new Set(searchResults.map(r => r.document_title))]
      console.log(`Enhanced vector search retrieved content from ${uniqueDocs.length} unique documents:`, uniqueDocs)
      
    } else {
      // Enhanced fallback for factual questions
      console.log('Vector search returned no results, trying enhanced content-based search...')
      
      // Try enhanced content-based search for factual questions
      const contentBasedResults = await enhancedContentSearch(supabase, question, availableDocuments, isFactualQuestion)
      if (contentBasedResults.length > 0) {
        console.log('Found enhanced content-based matches:', contentBasedResults.map(r => r.document_title))
        relevantDocs = contentBasedResults
        contextText = contentBasedResults
          .map(result => `Document: ${result.document_title}\nContent: ${result.chunk_content}`)
          .join('\n\n')
      } else {
        console.log('No relevant content found in any document')
        contextText = `I could not find any relevant information about "${question}" in the available documents. The available documents are:\n\n${availableDocuments.map(doc => `- ${doc.title}`).join('\n')}\n\nPlease make sure the document you're asking about has been properly processed and contains embeddings.`
      }
    }
    
  } catch (searchErr) {
    console.error('=== Document search error ===')
    console.error('Search error details:', {
      message: searchErr.message,
      stack: searchErr.stack,
      name: searchErr.name
    })
    contextText = 'I encountered an issue while trying to access document content. Please try again or contact support if the issue persists.'
    
    // Re-throw the error so the calling function can handle it
    throw searchErr
  }
  
  return { 
    contextText, 
    relevantDocs, 
    searchDuration: Date.now() - startTime 
  }
}

// Enhanced content search for factual questions
async function enhancedContentSearch(
  supabase: any,
  question: string,
  availableDocuments: DocumentInfo[],
  isFactualQuestion: boolean
): Promise<ContextSource[]> {
  console.log('=== Enhanced content search for factual questions ===')
  
  // Extract keywords with enhanced Swedish support
  const keywords = question
    .toLowerCase()
    .replace(/[^\wÅÄÖåäö\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !['när', 'vad', 'var', 'vem', 'hur', 'varför', 'vilken', 'under', 'what', 'where', 'when', 'how', 'why', 'which', 'the', 'is', 'are', 'was', 'were', 'about', 'document', 'report', 'och', 'eller', 'som', 'det', 'den', 'denna', 'detta', 'för', 'från', 'till', 'med', 'på', 'av'].includes(word))
  
  // Add time-related keywords for factual questions
  if (isFactualQuestion) {
    const timeKeywords = ['datum', 'tid', 'period', 'år', 'månad', 'vecka', 'dag', 'genomförande', 'start', 'slut', 'mellan', 'från', 'till']
    keywords.push(...timeKeywords.filter(kw => !keywords.includes(kw)))
  }
  
  if (keywords.length === 0) {
    console.log('No useful keywords extracted from question')
    return []
  }
  
  console.log('Enhanced keywords for search:', keywords)
  
  const results: ContextSource[] = []
  
  for (const doc of availableDocuments) {
    // Enhanced search for chunks containing the keywords
    let query = supabase
      .from('document_chunks')
      .select('content, chunk_index')
      .eq('document_id', doc.id)
    
    // For factual questions, search for any of the keywords (OR logic)
    const searchTerms = keywords.join(' | ')
    query = query.textSearch('content', searchTerms, { type: 'websearch', config: 'swedish' })
    
    const chunkLimit = isFactualQuestion ? 5 : 2
    const { data: chunks, error } = await query
      .order('chunk_index', { ascending: true })
      .limit(chunkLimit)
    
    if (!error && chunks && chunks.length > 0) {
      const contentLength = isFactualQuestion ? 2000 : 1200
      const combinedContent = chunks.map(c => c.content).join(' ').substring(0, contentLength)
      results.push({
        document_title: doc.title,
        chunk_content: combinedContent,
        document_id: doc.id,
        document_url: doc.url
      })
      console.log(`Found enhanced content match in document: ${doc.title} (${chunks.length} chunks)`)
    }
  }
  
  return results
}

// Step 4: Enhanced document retrieval for specific information
async function searchByDocumentTitle(
  supabase: any, 
  question: string, 
  availableDocuments: DocumentInfo[]
): Promise<ContextSource[]> {
  console.log('=== Searching by document title ===')
  
  // Extract potential document names/titles from the question
  const questionLower = question.toLowerCase()
  const matchingDocs = availableDocuments.filter(doc => {
    const titleLower = doc.title.toLowerCase()
    const titleWords = titleLower.split(/[\s\-_\.]+/).filter(word => word.length > 2)
    
    // Check if any significant words from the title appear in the question
    return titleWords.some(word => questionLower.includes(word)) ||
           questionLower.includes(titleLower) ||
           titleLower.includes(questionLower.replace(/[^\w\s]/g, ''))
  })
  
  if (matchingDocs.length === 0) {
    console.log('No documents found matching title keywords')
    return []
  }
  
  console.log('Found potential title matches:', matchingDocs.map(d => d.title))
  
  const results: ContextSource[] = []
  
  for (const doc of matchingDocs) {
    // Get some chunks from the matching document
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select('content, chunk_index')
      .eq('document_id', doc.id)
      .order('chunk_index', { ascending: true })
      .limit(3)
    
    if (!error && chunks && chunks.length > 0) {
      const combinedContent = chunks.map(c => c.content).join(' ').substring(0, 1500)
      results.push({
        document_title: doc.title,
        chunk_content: combinedContent,
        document_id: doc.id,
        document_url: doc.url
      })
      console.log(`Added content from title-matched document: ${doc.title}`)
    }
  }
  
  return results
}

async function searchByContent(
  supabase: any,
  question: string,
  availableDocuments: DocumentInfo[]
): Promise<ContextSource[]> {
  console.log('=== Searching by content keywords ===')
  
  // Extract keywords from the question (remove common words)
  const keywords = question
    .toLowerCase()
    .replace(/[^\w\sÅÄÖåäö]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !['what', 'where', 'when', 'how', 'why', 'the', 'is', 'are', 'was', 'were', 'about', 'document', 'report'].includes(word))
  
  if (keywords.length === 0) {
    console.log('No useful keywords extracted from question')
    return []
  }
  
  console.log('Searching for keywords:', keywords)
  
  const results: ContextSource[] = []
  
  for (const doc of availableDocuments) {
    // Search for chunks containing the keywords
    let query = supabase
      .from('document_chunks')
      .select('content, chunk_index')
      .eq('document_id', doc.id)
    
    // Add text search for each keyword
    for (const keyword of keywords) {
      query = query.textSearch('content', keyword, { type: 'plain', config: 'simple' })
    }
    
    const { data: chunks, error } = await query
      .order('chunk_index', { ascending: true })
      .limit(2)
    
    if (!error && chunks && chunks.length > 0) {
      const combinedContent = chunks.map(c => c.content).join(' ').substring(0, 1200)
      results.push({
        document_title: doc.title,
        chunk_content: combinedContent,
        document_id: doc.id,
        document_url: doc.url
      })
      console.log(`Found content match in document: ${doc.title}`)
    }
  }
  
  return results
}
