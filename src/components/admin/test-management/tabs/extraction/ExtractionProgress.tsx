
interface ExtractionProgressProps {
  extractionProgress: number;
  isProgressiveMode?: boolean;
  pagesProcessed?: number;
  totalPages?: number;
  status?: string;
}

export const ExtractionProgress = ({
  extractionProgress,
  isProgressiveMode,
  pagesProcessed,
  totalPages,
  status,
}: ExtractionProgressProps) => {
  return (
    <div className="mt-2 space-y-2">
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-green-500 transition-all duration-300 ease-in-out" 
          style={{ width: `${extractionProgress}%` }}
        ></div>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        {isProgressiveMode && pagesProcessed !== undefined && totalPages ? (
          <>
            Processing page {pagesProcessed} of {totalPages} ({extractionProgress}% complete)
            {status && <span className="block mt-1 italic">{status}</span>}
          </>
        ) : (
          <>
            {extractionProgress}% complete
            {status && <span className="block mt-1 italic">{status}</span>}
          </>
        )}
      </p>
    </div>
  );
};
