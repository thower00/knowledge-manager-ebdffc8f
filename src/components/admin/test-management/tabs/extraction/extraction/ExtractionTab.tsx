
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useProcessedDocumentsFetch } from "@/components/admin/document-extraction/hooks/useProcessedDocumentsFetch";
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Settings,
  Download,
  AlertTriangle,
  Database
} from "lucide-react";

interface ExtractionTabProps {
  isLoading: boolean;
  onRunTest: (data: any) => void;
}

interface TestResult {
  status: 'success' | 'error';
  message: string;
  data?: any;
  error?: string;
  details?: string;
}

export function ExtractionTab({ isLoading, onRunTest }: ExtractionTabProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string>("");
  const [testMode, setTestMode] = useState<"file" | "database">("file");
  const [currentTest, setCurrentTest] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [extractedText, setExtractedText] = useState<string>("");
  const [showDebugTests, setShowDebugTests] = useState(false);
  const { toast } = useToast();
  
  // Fetch processed documents from database
  const { data: processedDocuments = [], isLoading: documentsLoading } = useProcessedDocumentsFetch();

  const testSteps = [
    { key: 'basic', label: 'Basic Function Test', description: 'Test if the edge function is responding', requiresDocument: false },
    { key: 'credentials', label: 'Adobe Credentials', description: 'Verify Adobe API credentials are configured', requiresDocument: false },
    { key: 'upload', label: 'File Upload', description: 'Test file upload to Adobe services', requiresDocument: true },
    { key: 'extract', label: 'Extract Job', description: 'Test PDF text extraction job creation', requiresDocument: true },
    { key: 'full', label: 'Full Processing', description: 'Complete end-to-end PDF text extraction', requiresDocument: true }
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please select a PDF file"
        });
        return;
      }
      setSelectedFile(file);
      setTestMode("file");
      console.log('Selected PDF file:', file.name, 'Size:', file.size);
    }
  };

  const handleDocumentSelect = (documentId: string) => {
    setSelectedDocument(documentId);
    setTestMode("database");
  };

  const testWithStoredDocument = async (testStep: string) => {
    if (!selectedDocument) {
      toast({
        variant: "destructive",
        title: "No document selected",
        description: "Please select a document from the database"
      });
      return;
    }

    const document = processedDocuments.find(doc => doc.id === selectedDocument);
    if (!document) {
      toast({
        variant: "destructive",
        title: "Document not found",
        description: "The selected document could not be found"
      });
      return;
    }

    setCurrentTest(testStep);
    
    try {
      console.log(`Starting database document test: ${testStep} with document:`, document.title);
      
      const { data, error } = await supabase.functions.invoke('process-pdf', {
        body: {
          testStep: testStep,
          documentUrl: document.url,
          documentTitle: document.title,
          documentId: document.id,
          useStoredDocument: true
        }
      });

      console.log(`Database document test ${testStep} response:`, { data, error });

      if (error) {
        throw error;
      }

      const result: TestResult = {
        status: 'success',
        message: data.message || `${testStep} test with stored document completed successfully`,
        data: data
      };

      if (testStep === 'full' && data.extractedText) {
        setExtractedText(data.extractedText);
      }

      setTestResults(prev => ({
        ...prev,
        [`${testStep}_stored`]: result
      }));

      onRunTest(data);

      toast({
        title: "Test Completed",
        description: result.message
      });

    } catch (error) {
      console.error(`Database document test ${testStep} failed:`, error);
      
      const result: TestResult = {
        status: 'error',
        message: `${testStep} test with stored document failed`,
        error: error instanceof Error ? error.message : String(error)
      };

      setTestResults(prev => ({
        ...prev,
        [`${testStep}_stored`]: result
      }));

      toast({
        variant: "destructive",
        title: "Test Failed",
        description: result.error
      });
    } finally {
      setCurrentTest(null);
    }
  };

  const runTest = async (testStep: string) => {
    setCurrentTest(testStep);
    
    try {
      console.log(`Starting test: ${testStep}`);
      
      const formData = new FormData();
      formData.append('testStep', testStep);
      
      if (selectedFile && ['upload', 'extract', 'full'].includes(testStep)) {
        formData.append('file', selectedFile);
      }

      const { data, error } = await supabase.functions.invoke('process-pdf', {
        body: formData
      });

      console.log(`Test ${testStep} response:`, { data, error });

      if (error) {
        throw error;
      }

      const result: TestResult = {
        status: 'success',
        message: data.message || `${testStep} test completed successfully`,
        data: data
      };

      if (testStep === 'full' && data.extractedText) {
        setExtractedText(data.extractedText);
      }

      setTestResults(prev => ({
        ...prev,
        [testStep]: result
      }));

      onRunTest(data);

      toast({
        title: "Test Completed",
        description: result.message
      });

    } catch (error) {
      console.error(`Test ${testStep} failed:`, error);
      
      const result: TestResult = {
        status: 'error',
        message: `${testStep} test failed`,
        error: error instanceof Error ? error.message : String(error)
      };

      setTestResults(prev => ({
        ...prev,
        [testStep]: result
      }));

      toast({
        variant: "destructive",
        title: "Test Failed",
        description: result.error
      });
    } finally {
      setCurrentTest(null);
    }
  };

  const runAllTests = async () => {
    for (const step of testSteps) {
      if (step.requiresDocument) {
        if (testMode === "file" && !selectedFile) {
          toast({
            variant: "destructive",
            title: "No file selected",
            description: "Please select a PDF file before running file-dependent tests"
          });
          return;
        }
        if (testMode === "database" && !selectedDocument) {
          toast({
            variant: "destructive",
            title: "No document selected",
            description: "Please select a document from the database before running document-dependent tests"
          });
          return;
        }
      }
      
      if (testMode === "database" && step.requiresDocument) {
        await testWithStoredDocument(step.key);
      } else {
        await runTest(step.key);
      }
      // Add small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  const runSingleTest = async (testStep: string) => {
    const step = testSteps.find(s => s.key === testStep);
    if (step?.requiresDocument) {
      if (testMode === "file" && !selectedFile) {
        toast({
          variant: "destructive",
          title: "No file selected",
          description: "Please select a PDF file for this test"
        });
        return;
      }
      if (testMode === "database" && !selectedDocument) {
        toast({
          variant: "destructive",
          title: "No document selected",
          description: "Please select a document from the database for this test"
        });
        return;
      }
    }

    if (testMode === "database" && step?.requiresDocument) {
      await testWithStoredDocument(testStep);
    } else {
      await runTest(testStep);
    }
  };

  const getTestStatus = (testKey: string) => {
    const fileResult = testResults[testKey];
    const storedResult = testResults[`${testKey}_stored`];
    
    // Return the result based on current test mode
    if (testMode === "database" && storedResult) {
      return storedResult.status;
    }
    if (testMode === "file" && fileResult) {
      return fileResult.status;
    }
    
    return 'pending';
  };

  const downloadExtractedText = () => {
    if (!extractedText) return;
    
    const blob = new Blob([extractedText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `extracted-text-${selectedFile?.name || selectedDocument || 'document'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSelectedDocumentTitle = () => {
    if (!selectedDocument) return '';
    const doc = processedDocuments.find(d => d.id === selectedDocument);
    return doc?.title || '';
  };

  const canRunTest = (step: any) => {
    if (!step.requiresDocument) return true;
    
    if (testMode === "file") {
      return selectedFile !==  null;
    } else {
      return selectedDocument !== "";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Adobe PDF Text Extraction Test</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Test Mode Selection */}
          <div className="space-y-4">
            <Label>Select Test Mode</Label>
            <RadioGroup 
              value={testMode} 
              onValueChange={(value) => setTestMode(value as "file" | "database")}
              className="flex flex-col sm:flex-row gap-4"
            >
              <div className={`flex items-center space-x-2 border p-4 rounded-md w-full sm:w-1/2 cursor-pointer ${testMode === "file" ? "border-primary bg-primary/5" : "border-muted"}`}>
                <RadioGroupItem value="file" id="file-mode" />
                <Label htmlFor="file-mode" className="flex items-center space-x-2 cursor-pointer">
                  <Upload className="h-5 w-5" />
                  <span>Upload PDF File</span>
                </Label>
              </div>
              
              <div className={`flex items-center space-x-2 border p-4 rounded-md w-full sm:w-1/2 cursor-pointer ${testMode === "database" ? "border-primary bg-primary/5" : "border-muted"}`}>
                <RadioGroupItem value="database" id="database-mode" />
                <Label htmlFor="database-mode" className="flex items-center space-x-2 cursor-pointer">
                  <Database className="h-5 w-5" />
                  <span>Use Stored Document</span>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* File Upload Section */}
          {testMode === "file" && (
            <div className="space-y-2">
              <Label htmlFor="pdf-file">Select PDF File</Label>
              <div className="flex items-center space-x-4">
                <Input
                  id="pdf-file"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="flex-1"
                />
                {selectedFile && (
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <FileText className="h-3 w-3" />
                    <span>{selectedFile.name}</span>
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Database Documents Section */}
          {testMode === "database" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Document from Database</Label>
                <Select value={selectedDocument} onValueChange={handleDocumentSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder={documentsLoading ? "Loading documents..." : "Select a document from database"} />
                  </SelectTrigger>
                  <SelectContent>
                    {processedDocuments.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span>{doc.title}</span>
                          {doc.source_type === 'google_drive' && (
                            <Badge variant="outline" className="text-xs">Google Drive</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedDocument && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Database className="h-4 w-4" />
                    <span>Selected: {getSelectedDocumentTitle()}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <Separator />

          {/* Quick Test Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Quick Test</h3>
              <Button
                onClick={() => setShowDebugTests(!showDebugTests)}
                variant="outline"
                size="sm"
              >
                <Settings className="h-4 w-4 mr-2" />
                {showDebugTests ? 'Hide' : 'Show'} Debug Tests
              </Button>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={() => testMode === "database" ? testWithStoredDocument('full') : runTest('full')}
                disabled={
                  currentTest !== null || 
                  (testMode === "file" && !selectedFile) ||
                  (testMode === "database" && !selectedDocument)
                }
                className="flex-1"
              >
                {currentTest === 'full' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : testMode === "database" ? (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Extract Text from Stored Document
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Extract Text from Uploaded PDF
                  </>
                )}
              </Button>
              
              {showDebugTests && (
                <Button
                  onClick={runAllTests}
                  disabled={currentTest !== null}
                  variant="outline"
                >
                  Run All Tests
                </Button>
              )}
            </div>
          </div>

          {/* Debug Tests Section */}
          {showDebugTests && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Step-by-Step Debug Tests</h3>
                
                <div className="grid gap-3">
                  {testSteps.map((step) => (
                    <div key={step.key} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="flex-shrink-0">
                        {getTestStatus(step.key) === 'success' && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {getTestStatus(step.key) === 'error' && (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        {getTestStatus(step.key) === 'pending' && (
                          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                        )}
                        {currentTest === step.key && (
                          <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-medium">{step.label}</div>
                        <div className="text-sm text-muted-foreground">
                          {step.description}
                          {step.requiresDocument && (
                            <span className="ml-1 text-xs font-medium text-amber-500">
                              {testMode === "file" ? "(Requires PDF file)" : "(Requires document selection)"}
                            </span>
                          )}
                        </div>
                        {testMode === "database" && testResults[`${step.key}_stored`]?.error && (
                          <div className="text-sm text-red-600 mt-1">
                            {testResults[`${step.key}_stored`].error}
                          </div>
                        )}
                        {testMode === "file" && testResults[step.key]?.error && (
                          <div className="text-sm text-red-600 mt-1">
                            {testResults[step.key].error}
                          </div>
                        )}
                      </div>
                      
                      <Button
                        onClick={() => runSingleTest(step.key)}
                        disabled={currentTest !== null || !canRunTest(step)}
                        size="sm"
                        variant="outline"
                      >
                        Test
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Extracted Text Section */}
          {extractedText && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Extracted Text</h3>
                  <Button
                    onClick={downloadExtractedText}
                    size="sm"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Extracted {extractedText.length} characters from {testMode === "file" ? selectedFile?.name : getSelectedDocumentTitle()}
                  </div>
                  <Textarea
                    value={extractedText}
                    readOnly
                    className="min-h-[200px] font-mono text-sm"
                    placeholder="Extracted text will appear here..."
                  />
                </div>
              </div>
            </>
          )}

          {/* Status Section */}
          {(currentTest || Object.keys(testResults).length > 0) && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Test Status</h3>
                {currentTest && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Running: {testSteps.find(s => s.key === currentTest)?.label}</span>
                  </div>
                )}
                
                <div className="grid gap-2">
                  {Object.entries(testResults)
                    .filter(([key]) => {
                      // Only show results for the current test mode
                      if (testMode === "database") {
                        return key.includes('_stored');
                      } else {
                        return !key.includes('_stored');
                      }
                    })
                    .map(([key, result]) => (
                      <div key={key} className="flex items-center space-x-2 text-sm">
                        {result.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">
                          {key.includes('_stored') ? 
                            `${testSteps.find(s => s.key === key.replace('_stored', ''))?.label}` :
                            `${testSteps.find(s => s.key === key)?.label}`
                          }:
                        </span>
                        <span className={result.status === 'success' ? 'text-green-600' : 'text-red-600'}>
                          {result.message}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
