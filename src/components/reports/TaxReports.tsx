import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, DollarSign, Receipt, Calculator, AlertTriangle, Plus, Edit, Database } from "lucide-react";
import { DateRange } from "./ReportsManager";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatIndianCurrency, calculateGST, calculateTDS, calculateIncomeTax, saveToIndexedDB, loadFromIndexedDB } from "@/lib/indian-tax-utils";
import { useOfflineStorage } from "@/hooks/useOfflineStorage";
import { toast } from "@/hooks/use-toast";

interface TaxReportsProps {
  reportType: string;
  dateRange: DateRange;
}

interface TaxEntry {
  id: string;
  date: string;
  description: string;
  type: 'income' | 'expense' | 'deduction';
  category: string;
  amount: number;
  taxableAmount: number;
  gstRate?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  tdsRate?: number;
  tdsAmount?: number;
  hsn?: string;
  gstinNumber?: string;
  status: 'pending' | 'filed' | 'paid';
  invoiceNumber?: string;
}

interface TaxSummary {
  totalIncome: number;
  totalExpenses: number;
  totalDeductions: number;
  taxableIncome: number;
  estimatedIncomeTax: number;
  totalGST: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  tdsDeducted: number;
  quarterlyGST: number;
  advanceTax: number;
}

const STORAGE_KEY = 'tax_entries';

export function TaxReports({ reportType, dateRange }: TaxReportsProps) {
  const {
    data: taxEntries,
    loading,
    error,
    saveData,
    updateData,
    deleteData
  } = useOfflineStorage<TaxEntry>('taxEntries', 'tax_entries');
  
  const [newEntry, setNewEntry] = useState<Partial<TaxEntry>>({
    type: 'income',
    category: '',
    status: 'pending'
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const calculateTaxSummary = (): TaxSummary => {
    const filtered = filterEntriesByDateRange(taxEntries);
    
    const totalIncome = filtered
      .filter(entry => entry.type === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const totalExpenses = filtered
      .filter(entry => entry.type === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0);
    
    const totalDeductions = filtered
      .filter(entry => entry.type === 'deduction')
      .reduce((sum, entry) => sum + entry.amount, 0);

    const taxableIncome = totalIncome - totalExpenses - totalDeductions;
    const estimatedIncomeTax = calculateIncomeTax(taxableIncome);
    
    // Calculate GST totals
    const gstEntries = filtered.filter(entry => entry.gstRate);
    const cgstTotal = gstEntries.reduce((sum, entry) => sum + (entry.cgst || 0), 0);
    const sgstTotal = gstEntries.reduce((sum, entry) => sum + (entry.sgst || 0), 0);
    const igstTotal = gstEntries.reduce((sum, entry) => sum + (entry.igst || 0), 0);
    const totalGST = cgstTotal + sgstTotal + igstTotal;
    
    // Calculate TDS
    const tdsDeducted = filtered.reduce((sum, entry) => sum + (entry.tdsAmount || 0), 0);

    return {
      totalIncome,
      totalExpenses,
      totalDeductions,
      taxableIncome,
      estimatedIncomeTax,
      totalGST,
      cgstTotal,
      sgstTotal,
      igstTotal,
      tdsDeducted,
      quarterlyGST: totalGST / 4,
      advanceTax: estimatedIncomeTax / 4
    };
  };

  const filterEntriesByDateRange = (entries: TaxEntry[]) => {
    const now = new Date();
    const startDate = new Date();

    switch (dateRange) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return entries;
    }

    return entries.filter(entry => new Date(entry.date) >= startDate);
  };

  const addTaxEntry = async () => {
    if (!newEntry.description || !newEntry.amount || !newEntry.category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const gstCalc = newEntry.gstRate ? calculateGST(newEntry.amount!, newEntry.gstRate) : null;
    const tdsAmount = newEntry.tdsRate ? calculateTDS(newEntry.amount!, newEntry.tdsRate) : 0;

    const entry: TaxEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      description: newEntry.description!,
      type: newEntry.type as 'income' | 'expense' | 'deduction',
      category: newEntry.category!,
      amount: newEntry.amount!,
      taxableAmount: newEntry.taxableAmount || newEntry.amount!,
      gstRate: newEntry.gstRate,
      cgst: gstCalc?.cgst,
      sgst: gstCalc?.sgst,
      igst: gstCalc?.igst,
      tdsRate: newEntry.tdsRate,
      tdsAmount,
      hsn: newEntry.hsn,
      gstinNumber: newEntry.gstinNumber,
      status: newEntry.status as 'pending' | 'filed' | 'paid',
      invoiceNumber: newEntry.invoiceNumber
    };

    await saveData(entry);
    setNewEntry({ type: 'income', category: '', status: 'pending' });
    setIsDialogOpen(false);
    
    toast({
      title: "Success",
      description: "Tax entry added successfully",
    });
  };

  const exportTaxData = (format: 'csv' | 'json' | 'gstr1' | 'gstr3b') => {
    const filtered = filterEntriesByDateRange(taxEntries);
    const summary = calculateTaxSummary();
    
    if (format === 'csv') {
      const csvHeaders = 'Date,Description,Type,Category,Amount,Taxable Amount,GST Rate,CGST,SGST,IGST,TDS Rate,TDS Amount,HSN,GSTIN,Invoice Number,Status\n';
      const csvData = filtered.map(entry => 
        `${entry.date},${entry.description},${entry.type},${entry.category},${entry.amount},${entry.taxableAmount},${entry.gstRate || ''},${entry.cgst || ''},${entry.sgst || ''},${entry.igst || ''},${entry.tdsRate || ''},${entry.tdsAmount || ''},${entry.hsn || ''},${entry.gstinNumber || ''},${entry.invoiceNumber || ''},${entry.status}`
      ).join('\n');
      
      const blob = new Blob([csvHeaders + csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax_report_${dateRange}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'gstr1' || format === 'gstr3b') {
      // Generate GST return format
      const gstData = {
        gstin: "Your_GSTIN_Number",
        period: dateRange,
        summary,
        entries: filtered.filter(entry => entry.gstRate),
        generated: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(gstData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${format}_${dateRange}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const data = { entries: filtered, summary, dateRange, exportDate: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tax_report_${dateRange}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }

    toast({
      title: "Export Complete",
      description: `${format.toUpperCase()} report exported successfully`,
    });
  };

  const summary = calculateTaxSummary();
  const filteredEntries = filterEntriesByDateRange(taxEntries);

  const renderTaxSummary = () => (
    <div className="space-y-6">

      {loading && (
        <Card className="border-info bg-info/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-info animate-pulse" />
              <span className="text-sm font-medium">Loading tax data...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium">Error: {error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Income</p>
                <p className="text-2xl font-bold text-success">{formatIndianCurrency(summary.totalIncome)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-destructive">{formatIndianCurrency(summary.totalExpenses)}</p>
              </div>
              <Receipt className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Deductions</p>
                <p className="text-2xl font-bold text-info">{formatIndianCurrency(summary.totalDeductions)}</p>
              </div>
              <Calculator className="h-8 w-8 text-info" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxable Income</p>
                <p className="text-2xl font-bold">{formatIndianCurrency(summary.taxableIncome)}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Income Tax</p>
                <p className="text-2xl font-bold text-warning">{formatIndianCurrency(summary.estimatedIncomeTax)}</p>
              </div>
              <Calculator className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total GST</p>
                <p className="text-2xl font-bold text-accent">{formatIndianCurrency(summary.totalGST)}</p>
              </div>
              <Receipt className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => exportTaxData('csv')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => exportTaxData('json')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export JSON
          </Button>
          <Button onClick={() => exportTaxData('gstr1')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            GSTR-1
          </Button>
          <Button onClick={() => exportTaxData('gstr3b')} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            GSTR-3B
          </Button>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Tax Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Tax Entry</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newEntry.description || ''}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter description"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={newEntry.type} onValueChange={(value) => setNewEntry(prev => ({ ...prev, type: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={newEntry.category || ''}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, category: e.target.value }))}
                  placeholder="e.g., Office supplies, Travel"
                />
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  value={newEntry.amount || ''}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="gstRate">GST Rate (%)</Label>
                <Select value={newEntry.gstRate?.toString()} onValueChange={(value) => setNewEntry(prev => ({ ...prev, gstRate: parseFloat(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select GST rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0% (Exempt)</SelectItem>
                    <SelectItem value="5">5%</SelectItem>
                    <SelectItem value="12">12%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="28">28%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tdsRate">TDS Rate (%)</Label>
                <Select value={newEntry.tdsRate?.toString()} onValueChange={(value) => setNewEntry(prev => ({ ...prev, tdsRate: parseFloat(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select TDS rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1% (Contractors)</SelectItem>
                    <SelectItem value="2">2% (Professional Services)</SelectItem>
                    <SelectItem value="5">5% (Commission/Brokerage)</SelectItem>
                    <SelectItem value="10">10% (Rent)</SelectItem>
                    <SelectItem value="20">20% (Interest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="hsn">HSN/SAC Code</Label>
                <Input
                  id="hsn"
                  value={newEntry.hsn || ''}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, hsn: e.target.value }))}
                  placeholder="e.g., 9954 for IT services"
                />
              </div>
              <div>
                <Label htmlFor="gstinNumber">GSTIN Number</Label>
                <Input
                  id="gstinNumber"
                  value={newEntry.gstinNumber || ''}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, gstinNumber: e.target.value }))}
                  placeholder="e.g., 29AABCT1332L000"
                />
              </div>
              <div>
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={newEntry.invoiceNumber || ''}
                  onChange={(e) => setNewEntry(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  placeholder="Invoice/Bill number"
                />
              </div>
              <Button onClick={addTaxEntry} className="w-full">
                Add Entry
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Add additional GST and TDS summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CGST</p>
                <p className="text-xl font-bold text-success">{formatIndianCurrency(summary.cgstTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">SGST</p>
                <p className="text-xl font-bold text-info">{formatIndianCurrency(summary.sgstTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">IGST</p>
                <p className="text-xl font-bold text-warning">{formatIndianCurrency(summary.igstTotal)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">TDS Deducted</p>
                <p className="text-xl font-bold text-destructive">{formatIndianCurrency(summary.tdsDeducted)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tax Entries ({filteredEntries.length})</CardTitle>
        </CardHeader>
        <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>GST</TableHead>
                  <TableHead>TDS</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
            <TableBody>
              {filteredEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell>
                    <Badge variant={entry.type === 'income' ? 'default' : entry.type === 'expense' ? 'destructive' : 'secondary'}>
                      {entry.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatIndianCurrency(entry.amount)}</TableCell>
                  <TableCell>{entry.gstRate ? `${entry.gstRate}%` : '-'}</TableCell>
                  <TableCell>{entry.tdsAmount ? formatIndianCurrency(entry.tdsAmount) : '-'}</TableCell>
                  <TableCell>
                    <Badge variant={entry.status === 'paid' ? 'default' : entry.status === 'filed' ? 'secondary' : 'outline'}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return renderTaxSummary();
}