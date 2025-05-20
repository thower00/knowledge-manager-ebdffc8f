
import { AlertTriangle, ExternalLink } from "lucide-react";

export const TroubleshootingPanel = () => {
  return (
    <div className="mt-2 p-3 border border-amber-300 bg-amber-50 text-amber-800 rounded-md">
      <p className="font-medium flex items-center">
        <AlertTriangle className="h-4 w-4 mr-1" />
        PDF Worker Troubleshooting:
      </p>
      <ul className="list-disc ml-5 mt-1 text-sm">
        <li>If extraction fails with worker errors, try using a different browser or network</li>
        <li>Some corporate networks block worker script downloads from CDNs</li>
        <li>The system will attempt multiple CDN sources and a local fallback</li>
        <li>
          <a 
            href="https://mozilla.github.io/pdf.js/getting_started/" 
            className="text-amber-600 hover:text-amber-800 flex items-center" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Learn more about PDF.js workers
          </a>
        </li>
      </ul>
    </div>
  );
};
