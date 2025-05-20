
interface ExtractionProgressProps {
  extractionProgress: number;
}

export const ExtractionProgress = ({
  extractionProgress,
}: ExtractionProgressProps) => {
  return (
    <div className="mt-2 space-y-2">
      <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-blue-500 transition-all duration-300 ease-in-out" 
          style={{ width: `${extractionProgress}%` }}
        ></div>
      </div>
      <p className="text-xs text-center text-muted-foreground">
        {extractionProgress}% complete
      </p>
    </div>
  );
};
