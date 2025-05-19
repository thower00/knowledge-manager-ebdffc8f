
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle } from "lucide-react";

interface ChunkingResultsProps {
  results: {
    documentId: string;
    documentTitle: string;
    chunkCount: number;
    success: boolean;
    error?: string;
  }[];
}

export function ChunkingResults({ results }: ChunkingResultsProps) {
  const successCount = results.filter(r => r.success).length;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Chunking Results</span>
          <Badge variant={successCount === results.length ? "default" : "destructive"}>
            {successCount}/{results.length} Successful
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">Status</TableHead>
              <TableHead>Document</TableHead>
              <TableHead className="text-right">Chunks Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.documentId}>
                <TableCell>
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{result.documentTitle}</div>
                    {!result.success && result.error && (
                      <div className="text-sm text-destructive">{result.error}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {result.success ? result.chunkCount : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
