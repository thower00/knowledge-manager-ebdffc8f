
import React, { useCallback } from "react";
import { Upload, File as FileIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SelfTestUploadProps {
  selectedFile: File | null;
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  onReset?: () => void;
}

export const SelfTestUpload: React.FC<SelfTestUploadProps> = ({
  selectedFile,
  onFileSelect,
  disabled,
  onReset,
}) => {
  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  }, [onFileSelect]);

  const triggerFileSelect = useCallback(() => {
    const input = document.getElementById("selftest-pdf-upload") as HTMLInputElement | null;
    input?.click();
  }, []);

  return (
    <div className="space-y-3">
      <div
        className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
        onClick={disabled ? undefined : triggerFileSelect}
        aria-disabled={disabled}
      >
        {selectedFile ? (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <FileIcon className="h-6 w-6" />
            <span className="font-medium">{selectedFile.name}</span>
            <span className="text-sm text-muted-foreground">
              ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
            </span>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <p className="text-lg font-medium">Släpp din PDF här</p>
              <p className="text-sm text-muted-foreground">eller klicka för att välja fil</p>
            </div>
          </div>
        )}

        <input
          id="selftest-pdf-upload"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={!!disabled}
        />
      </div>

      <div className="flex gap-2 justify-end">
        {selectedFile && onReset && (
          <Button variant="outline" onClick={onReset} disabled={disabled}>
            Återställ
          </Button>
        )}
        {!selectedFile && (
          <Button variant="outline" onClick={triggerFileSelect} disabled={disabled}>
            Välj PDF
          </Button>
        )}
      </div>
    </div>
  );
};

export default SelfTestUpload;
