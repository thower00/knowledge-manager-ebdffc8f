
interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Generating preview..." }: LoadingStateProps) {
  return (
    <div className="h-60 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
