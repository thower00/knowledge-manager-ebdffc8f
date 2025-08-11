
import React, { useCallback } from "react";
import { File as FileIcon } from "lucide-react";
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
      {selectedFile ? (
        <div className="flex items-center gap-2">
          <FileIcon className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">{selectedFile.name}</span>
          <span className="text-sm text-muted-foreground">
            ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
          </span>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">Välj en PDF att ladda upp.</div>
      )}

      <input
        id="selftest-pdf-upload"
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileInputChange}
        className="hidden"
        disabled={!!disabled}
      />

      <div className="flex gap-2">
        {selectedFile && onReset && (
          <Button variant="outline" onClick={onReset} disabled={disabled}>
            Återställ
          </Button>
        )}
        <Button variant="outline" onClick={triggerFileSelect} disabled={disabled}>
          {selectedFile ? "Byt fil" : "Välj PDF"}
        </Button>
      </div>
    </div>
  );
};

export default SelfTestUpload;
