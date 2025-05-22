
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export interface ExtractionOptionsType {
  extractFirstPagesOnly: boolean;
  pageLimit: number;
  timeout: number;
  extractionMode: "standard" | "progressive";
}

interface ExtractionOptionsProps {
  options: ExtractionOptionsType;
  setOptions: (options: ExtractionOptionsType) => void;
  isExtracting: boolean;
}

export function ExtractionOptions({
  options,
  setOptions,
  isExtracting
}: ExtractionOptionsProps) {
  return (
    <Accordion type="single" collapsible className="border rounded-md">
      <AccordionItem value="options">
        <AccordionTrigger className="px-4 py-2 hover:no-underline">
          <span className="text-sm font-medium">Extraction Options</span>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 space-y-3">
          {/* Extraction Mode Selection */}
          <div className="grid gap-2">
            <Label className="text-sm font-medium">Extraction Mode</Label>
            <RadioGroup 
              value={options.extractionMode} 
              onValueChange={(value) => 
                setOptions({
                  ...options,
                  extractionMode: value as "standard" | "progressive"
                })
              }
              disabled={isExtracting}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="standard-mode" />
                <Label htmlFor="standard-mode" className="text-sm">Standard</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="progressive" id="progressive-mode" />
                <Label htmlFor="progressive-mode" className="text-sm">Progressive</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Progressive mode processes pages one at a time and shows results immediately.
                        Recommended for large documents.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="extract-first-pages"
              checked={options.extractFirstPagesOnly}
              onCheckedChange={(checked) => 
                setOptions({
                  ...options,
                  extractFirstPagesOnly: checked === true
                })
              }
              disabled={isExtracting}
            />
            <div className="grid gap-1.5 leading-none">
              <div className="flex items-center">
                <Label
                  htmlFor="extract-first-pages"
                  className="text-sm font-medium mr-2"
                >
                  Extract First Pages Only
                </Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">
                        Use this option for large documents that might time out.
                        Only a limited number of pages will be processed.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs text-muted-foreground">
                Recommended for large documents to avoid timeouts
              </p>
            </div>
          </div>

          {options.extractFirstPagesOnly && (
            <div className="grid gap-2 pl-6">
              <Label htmlFor="page-limit" className="text-sm">
                Maximum Pages
              </Label>
              <Input
                id="page-limit"
                type="number"
                min={1}
                max={100}
                value={options.pageLimit}
                onChange={(e) =>
                  setOptions({
                    ...options,
                    pageLimit: parseInt(e.target.value) || 10
                  })
                }
                className="w-24"
                disabled={isExtracting}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="timeout" className="flex items-center text-sm">
              <span className="mr-2">Extraction Timeout (seconds)</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">
                      Maximum time allowed for the extraction process.
                      Increase for larger documents, decrease to fail faster.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="timeout"
              type="number"
              min={10}
              max={180}
              value={options.timeout}
              onChange={(e) =>
                setOptions({
                  ...options,
                  timeout: parseInt(e.target.value) || 60
                })
              }
              className="w-24"
              disabled={isExtracting}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

