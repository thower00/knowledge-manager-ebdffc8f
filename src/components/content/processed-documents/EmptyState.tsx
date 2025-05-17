
interface EmptyStateProps {
  message?: string;
}

export function EmptyState({ message = "No documents have been processed yet." }: EmptyStateProps) {
  return (
    <div className="text-center p-8 text-muted-foreground">
      {message}
    </div>
  );
}
