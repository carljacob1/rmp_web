import { useState } from "react";
import { Upload, FileSpreadsheet, Download, X, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { dbPut } from "@/lib/indexeddb";

interface BulkUploadProps {
  businessType: string;
  storeName: 'products' | 'services' | 'medicines';
  fields: {
    name: string;
    label: string;
    type: 'text' | 'number';
    required?: boolean;
  }[];
  onUploadComplete?: () => void;
}

export function BulkUpload({ businessType, storeName, fields, onUploadComplete }: BulkUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [csvData, setCsvData] = useState<string>("");
  const [preview, setPreview] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid File",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvData(text);
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;

    // Get headers from first line
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    
    // Parse data rows
    const data: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const item: any = { id: `${storeName}_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}` };
      
      fields.forEach(field => {
        const headerIndex = headers.findIndex(h => h === field.name.toLowerCase());
        if (headerIndex >= 0) {
          let value = values[headerIndex];
          if (field.type === 'number') {
            value = parseFloat(value) || 0;
          }
          item[field.name] = value;
        }
      });
      
      // Set defaults for missing fields
      fields.forEach(field => {
        if (field.required && !item[field.name]) {
          if (field.type === 'number') {
            item[field.name] = 0;
          } else {
            item[field.name] = '';
          }
        }
      });
      
      data.push(item);
    }
    
    setPreview(data);
  };

  const handleUpload = async () => {
    if (preview.length === 0) {
      toast({
        title: "No Data",
        description: "Please upload a CSV file with data",
        variant: "destructive"
      });
      return;
    }

    // Validate required fields
    const requiredFields = fields.filter(f => f.required);
    const invalid = preview.some(item => 
      requiredFields.some(field => !item[field.name])
    );

    if (invalid) {
      toast({
        title: "Validation Error",
        description: "Please ensure all required fields are filled",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      // Upload each item to IndexedDB
      for (const item of preview) {
        await dbPut(storeName, item);
      }

      toast({
        title: "Success",
        description: `Successfully uploaded ${preview.length} items`,
      });

      // Reset
      setCsvData("");
      setPreview([]);
      setIsOpen(false);
      
      if (onUploadComplete) {
        onUploadComplete();
      }
    } catch (error) {
      console.error('Error uploading data:', error);
      toast({
        title: "Error",
        description: "Failed to upload data. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const headers = fields.map(f => f.label).join(',');
    const exampleRow = fields.map(f => {
      if (f.type === 'number') return '0';
      return `Example ${f.label}`;
    }).join(',');
    
    const csv = `${headers}\n${exampleRow}`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storeName}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getFieldLabel = (fieldName: string) => {
    return fields.find(f => f.name === fieldName)?.label || fieldName;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Bulk Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload {storeName.charAt(0).toUpperCase() + storeName.slice(1)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Instructions</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
              <p>1. Download the CSV template</p>
              <p>2. Fill in your data (first row should be headers)</p>
              <p>3. Upload the CSV file</p>
              <p>4. Review the preview and confirm upload</p>
            </CardContent>
          </Card>

          {/* Template Download */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium mb-1">Required Fields:</p>
              <p className="text-xs text-muted-foreground">
                {fields.filter(f => f.required).map(f => f.label).join(', ')}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Template
            </Button>
          </div>

          {/* File Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Upload CSV File</label>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-accent"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Choose CSV File</span>
              </label>
              {csvData && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCsvData("");
                    setPreview([]);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Preview */}
          {preview.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview ({preview.length} items)</CardTitle>
                <CardDescription>Review your data before uploading</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        {fields.map(field => (
                          <th key={field.name} className="text-left p-2">
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 10).map((item, index) => (
                        <tr key={index} className="border-b">
                          {fields.map(field => (
                            <td key={field.name} className="p-2">
                              {item[field.name] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 10 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Showing first 10 of {preview.length} items
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={preview.length === 0 || uploading}
            >
              {uploading ? (
                "Uploading..."
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Upload {preview.length} Items
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

