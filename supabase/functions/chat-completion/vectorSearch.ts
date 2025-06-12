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

// Step 2: Enhanced detection for factual questions requiring specific information, especially time-related
function isSpecificFactualQuestion(question: string): boolean {
  const factualIndicators = [
    // Time-related questions (enhanced Swedish support with more comprehensive patterns)
    'när', 'vilken tid', 'tidsperiod', 'datum', 'tidpunkt', 'period', 'under', 'från', 'till', 'mellan',
    'genomfördes', 'genomförande', 'startade', 'avslutades', 'pågick', 'varade', 'slutfördes',
    'utvecklingsfas', 'projektfas', 'fas', 'etapp', 'milstolpe', 'leverans', 'slutleverans',
    'timeline', 'tidsplan', 'schema', 'kronologi', 'projektperiod', 'projektets gång',
    'projektets utveckling', 'hela projektet', 'kompletta', 'fullständig tidsperiod',
    // English equivalents
    'when', 'time period', 'from', 'to', 'between', 'during', 'timeline', 'conducted', 'carried out',
    'started', 'ended', 'completed', 'finished', 'phase', 'milestone', 'delivery',
    // Who/what/where questions
    'vem', 'vad', 'var', 'hur', 'varför', 'vilken', 'which', 'who', 'what', 'where', 'how',
    // Specific detail questions
    'detaljer', 'specifik', 'exakt', 'details', 'specific', 'exact', 'omfattning', 'scope',
    // Year patterns that might indicate time range questions
    '2023', '2024', '2025'
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
  const stopWords = [
    'summary', 'summarize', 'summarise', 'overview', 'brief', 'outline', 'extensive', 'detailed', 
    'comprehensive', 'complete', 'full', 'thorough', 'in-depth', 'lengthy', 'long', 'elaborate',
    'sammanfattning', 'översikt', 'huvudpunkter', 'utförlig', 'detaljerad', 'omfattande', 
    'fullständig', 'under', 'vilken', 'tidsperiod', 'genomfördes', 'när', 'datum', 'tidpunkt', 
    'period', 'av', 'på', 'i', 'för', 'från', 'till', 'med', 'och', 'eller', 'som', 'det', 
    'den', 'denna', 'detta', 'är', 'var', 'har', 'hade', 'kommer', 'kan', 'ska', 'vill', 
    'will', 'skulle', 'of', 'the', 'a', 'an', 'give', 'me', 'can', 'you', 'please', 'i', 
    'want', 'need', 'from', 'to', 'in', 'on', 'at', 'by', 'with', 'and', 'or', 'that', 
    'this', 'is', 'was', 'have', 'had', 'will', 'can', 'should', 'want', 'would'
  ]
  
  const cleanedQuestion = questionLower
    .split(/\s+/)
    .filter(word => !stopWords.includes(word) && word.length > 2)
    .join(' ')
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

/**
 * Helper function to select chunks distributed across a document for better coverage
 * Enhanced to prioritize time-related content and ensure chronological coverage
 */
function selectDistributedChunksFromArray(chunks: any[], count: number, isTimeQuery: boolean = false): any[] {
  if (chunks.length <= count) {
    return chunks
  }
  
  // For time-related queries, try to get chronological distribution
  if (isTimeQuery) {
    // Sort chunks by index to ensure document order
    const sortedChunks = chunks.sort((a, b) => {
      if (a.chunk_index !== undefined && b.chunk_index !== undefined) {
        return a.chunk_index - b.chunk_index
      }
      return 0
    })
    
    // Take chunks from beginning, middle, and end with emphasis on later sections
    const selected = []
    const totalChunks = sortedChunks.length
    
    // Take more chunks from the end for time queries (where completion dates might be)
    const endCount = Math.ceil(count * 0.4) // 40% from end
    const middleCount = Math.ceil(count * 0.3) // 30% from middle  
    const beginCount = count - endCount - middleCount // Rest from beginning
    
    // Beginning chunks
    for (let i = 0; i < beginCount && i < totalChunks; i++) {
      selected.push(sortedChunks[i])
    }
    
    // Middle chunks
    const middleStart = Math.floor(totalChunks * 0.4)
    for (let i = 0; i < middleCount && (middleStart + i) < totalChunks; i++) {
      selected.push(sortedChunks[middleStart + i])
    }
    
    // End chunks (prioritized for time queries)
    const endStart = Math.max(0, totalChunks - endCount)
    for (let i = endStart; i < totalChunks && selected.length < count; i++) {
      if (!selected.find(chunk => chunk.chunk_index === sortedChunks[i].chunk_index)) {
        selected.push(sortedChunks[i])
      }
    }
    
    return selected
  }
  
  // Standard distribution for non-time queries
  const selected = []
  const step = Math.max(1, Math.floor(chunks.length / count))
  
  for (let i = 0; i < count && i * step < chunks.length; i++) {
    selected.push(chunks[i * step])
  }
  
  return selected
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
      
      // Enhanced chunk retrieval for factual questions with better document coverage
      const chunkLimit = isFactualQuestion ? 20 : (isSummary ? (isExtensive ? 8 : 5) : 3) // Increased to 20 for factual questions
      console.log(`Using chunk limit of ${chunkLimit} for ${isFactualQuestion ? 'factual' : (isSummary ? (isExtensive ? 'extensive summary' : 'summary') : 'regular')} request`)
      
      const results: ContextSource[] = []
      
      for (const doc of titleBasedResults) {
        // Enhanced chunk selection for factual questions - get distributed chunks with time awareness
        let chunks
        if (isFactualQuestion) {
          // For factual questions, get chunks from different parts of the document with time priority
          const { data: allChunks, error } = await supabase
            .from('document_chunks')
            .select('content, chunk_index')
            .eq('document_id', doc.id)
            .order('chunk_index', { ascending: true })
          
          if (!error && allChunks && allChunks.length > 0) {
            // Check if this is a time-related query
            const isTimeQuery = /\b(tidsperiod|period|när|genomförd|timeline|från|till|mellan|datum|tid)\b/i.test(question)
            
            // Select distributed chunks with time awareness
            chunks = selectDistributedChunksFromArray(allChunks, chunkLimit, isTimeQuery)
            console.log(`Selected ${chunks.length} distributed chunks for factual question (time-aware: ${isTimeQuery})`)
          }
        } else {
          // Standard chunk retrieval for non-factual questions
          const { data: standardChunks, error } = await supabase
            .from('document_chunks')
            .select('content, chunk_index')
            .eq('document_id', doc.id)
            .order('chunk_index', { ascending: true })
            .limit(chunkLimit)
          
          if (!error) chunks = standardChunks
        }
        
        if (chunks && chunks.length > 0) {
          // Enhanced content length for factual questions
          const combinedContent = chunks.map(c => c.content).join(' ')
          const contentLength = isFactualQuestion ? 6000 : (isSummary ? (isExtensive ? 2500 : 1800) : 1500) // Increased to 6000 for factual questions
          
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
      
      // Try enhanced content-based search for factual questions with time-aware keywords
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

// Enhanced content search for factual questions with better time-related keyword detection
async function enhancedContentSearch(
  supabase: any,
  question: string,
  availableDocuments: DocumentInfo[],
  isFactualQuestion: boolean
): Promise<ContextSource[]> {
  console.log('=== Enhanced content search for factual questions with comprehensive time-awareness ===')
  
  // Enhanced keyword extraction with better Swedish support and comprehensive time-related terms
  const keywords = question
    .toLowerCase()
    .replace(/[^\wÅÄÖåäö\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !['när', 'vad', 'var', 'vem', 'hur', 'varför', 'vilken', 'under', 'what', 'where', 'when', 'how', 'why', 'which', 'the', 'is', 'are', 'was', 'were', 'about', 'document', 'report', 'och', 'eller', 'som', 'det', 'den', 'denna', 'detta', 'för', 'från', 'till', 'med', 'på', 'av'].includes(word))
  
  // Enhanced time-related keywords for factual questions - more comprehensive coverage
  if (isFactualQuestion) {
    const timeKeywords = [
      // Swedish time-related terms
      'datum', 'tid', 'period', 'tidsperiod', 'år', 'månad', 'vecka', 'dag', 'genomförande', 'genomfördes',
      'start', 'startade', 'slut', 'slutade', 'avslutades', 'mellan', 'från', 'till', 'under', 'pågick',
      'utvecklingsfas', 'projektfas', 'fas', 'etapp', 'milstolpe', 'leverans', 'slutleverans',
      'projektperiod', 'projektets', 'implementation', 'implementering', 'upphandling', 'kontrakt',
      // Year and month patterns - expanded to catch 2024
      '2023', '2024', '2025', 'januari', 'februari', 'mars', 'april', 'maj', 'juni',
      'juli', 'augusti', 'september', 'oktober', 'november', 'december',
      // English equivalents
      'january', 'february', 'march', 'april', 'may', 'june', 'july', 'august',
      'september', 'october', 'november', 'december', 'phase', 'milestone', 'delivery',
      'completion', 'finalization', 'closure', 'wrap-up', 'conclusion'
    ]
    keywords.push(...timeKeywords.filter(kw => !keywords.includes(kw)))
  }
  
  if (keywords.length === 0) {
    console.log('No useful keywords extracted from question')
    return []
  }
  
  console.log('Enhanced keywords for comprehensive time-aware search:', keywords)
  
  const results: ContextSource[] = []
  
  for (const doc of availableDocuments) {
    // Enhanced search for chunks containing the keywords with better text search
    let query = supabase
      .from('document_chunks')
      .select('content, chunk_index')
      .eq('document_id', doc.id)
    
    // For factual questions, search for any of the keywords (OR logic) with enhanced search
    const searchTerms = keywords.join(' | ')
    query = query.textSearch('content', searchTerms, { type: 'websearch', config: 'swedish' })
    
    const chunkLimit = isFactualQuestion ? 12 : 3 // Increased for factual questions
    const { data: chunks, error } = await query
      .order('chunk_index', { ascending: true })
      .limit(chunkLimit)
    
    if (!error && chunks && chunks.length > 0) {
      const contentLength = isFactualQuestion ? 5000 : 1200 // Increased for factual questions
      const combinedContent = chunks.map(c => c.content).join(' ').substring(0, contentLength)
      results.push({
        document_title: doc.title,
        chunk_content: combinedContent,
        document_id: doc.id,
        document_url: doc.url
      })
      console.log(`Found enhanced comprehensive time-aware content match in document: ${doc.title} (${chunks.length} chunks)`)
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
