import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Download, 
  Upload, 
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Receipt
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { dbGetAll, dbPut } from "@/lib/indexeddb";
import { QRCodeSVG } from "qrcode.react";

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issueDate: string;
  dueDate: string;
  notes: string;
  description?: string; // Overall invoice description
  upiId?: string; // UPI ID for payment QR code
  createdAt: string;
  updatedAt: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  receipt?: string;
  notes: string;
  createdAt: string;
}

export function AccountingDashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  // Load data from IndexedDB
  useEffect(() => {
    (async () => {
      const [inv, exp] = await Promise.all([
        dbGetAll<Invoice>('invoices'),
        dbGetAll<Expense>('expenses')
      ]);
      setInvoices(inv);
      setExpenses(exp);
    })();
  }, []);

  // Calculate totals
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);
  
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  
  const pendingInvoices = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total, 0);

  const filteredInvoices = invoices.filter(invoice =>
    invoice.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportData = () => {
    const data = { invoices, expenses };
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `accounting-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Data Exported",
      description: "Accounting data has been exported successfully.",
    });
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (importedData.invoices && importedData.expenses) {
          setInvoices(importedData.invoices);
          setExpenses(importedData.expenses);
          toast({
            title: "Data Imported",
            description: "Accounting data imported successfully.",
          });
        } else {
          throw new Error("Invalid data format");
        }
      } catch (error) {
        toast({
          title: "Import Failed",
          description: "Failed to import data. Please check the file format.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Accounting & Invoicing</h2>
        <div className="flex gap-2">
          <input
            type="file"
            accept=".json"
            onChange={handleImportData}
            className="hidden"
            id="import-accounting-file"
          />
          <Button variant="outline" asChild>
            <label htmlFor="import-accounting-file" className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </label>
          </Button>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">₹{totalRevenue.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">₹{totalExpenses.toFixed(2)}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
                <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ₹{netProfit.toFixed(2)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Invoices</p>
                <p className="text-2xl font-bold text-orange-600">₹{pendingInvoices.toFixed(2)}</p>
              </div>
              <Receipt className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
        </TabsList>
        
        <TabsContent value="invoices">
          <InvoicesTab 
            invoices={filteredInvoices}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onCreateInvoice={() => setShowInvoiceForm(true)}
            onSelectInvoice={setSelectedInvoice}
            selectedInvoice={selectedInvoice}
            showInvoiceForm={showInvoiceForm}
            setShowInvoiceForm={setShowInvoiceForm}
            setInvoices={setInvoices}
          />
        </TabsContent>
        
        <TabsContent value="expenses">
          <ExpensesTab 
            expenses={expenses}
            showExpenseForm={showExpenseForm}
            setShowExpenseForm={setShowExpenseForm}
            setExpenses={setExpenses}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvoicesTab({ 
  invoices, 
  searchTerm, 
  setSearchTerm, 
  onCreateInvoice,
  onSelectInvoice,
  selectedInvoice,
  showInvoiceForm,
  setShowInvoiceForm,
  setInvoices
}: {
  invoices: Invoice[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  onCreateInvoice: () => void;
  onSelectInvoice: (invoice: Invoice | null) => void;
  selectedInvoice: Invoice | null;
  showInvoiceForm: boolean;
  setShowInvoiceForm: (show: boolean) => void;
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
}) {
  const getStatusColor = (status: Invoice['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'sent': return 'bg-blue-500';
      case 'paid': return 'bg-green-500';
      case 'overdue': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (showInvoiceForm) {
    return (
      <InvoiceForm 
        onSave={async (invoice) => {
          await dbPut('invoices', invoice);
          setInvoices(prev => [...prev, invoice]);
          setShowInvoiceForm(false);
        }}
        onCancel={() => setShowInvoiceForm(false)}
      />
    );
  }

  if (selectedInvoice) {
    return (
      <InvoiceDetails 
        invoice={selectedInvoice}
        onBack={() => onSelectInvoice(null)}
        onUpdate={async (updatedInvoice) => {
          await dbPut('invoices', updatedInvoice);
          setInvoices(prev => prev.map(inv => 
            inv.id === updatedInvoice.id ? updatedInvoice : inv
          ));
          onSelectInvoice(updatedInvoice);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onCreateInvoice}>
          <Plus className="h-4 w-4 mr-2" />
          Create Invoice
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices ({invoices.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => onSelectInvoice(invoice)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{invoice.invoiceNumber}</span>
                    <Badge className={getStatusColor(invoice.status)}>
                      {invoice.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {invoice.clientName} • Due: {invoice.dueDate}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">₹{invoice.total.toFixed(2)}</div>
                  <div className="text-sm text-muted-foreground">{invoice.issueDate}</div>
                </div>
              </div>
            ))}
            {invoices.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4" />
                <p>No invoices found</p>
                <p className="text-sm">Create your first invoice to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpensesTab({ 
  expenses, 
  showExpenseForm, 
  setShowExpenseForm, 
  setExpenses 
}: {
  expenses: Expense[];
  showExpenseForm: boolean;
  setShowExpenseForm: (show: boolean) => void;
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
}) {
  if (showExpenseForm) {
    return (
      <ExpenseForm 
        onSave={async (expense) => {
          await dbPut('expenses', expense);
          setExpenses(prev => [...prev, expense]);
          setShowExpenseForm(false);
        }}
        onCancel={() => setShowExpenseForm(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Expenses</h3>
        <Button onClick={() => setShowExpenseForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      <Card>
        <CardContent>
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{expense.description}</div>
                  <div className="text-sm text-muted-foreground">
                    {expense.category} • {expense.date}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-red-600">-₹{expense.amount.toFixed(2)}</div>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4" />
                <p>No expenses recorded</p>
                <p className="text-sm">Add your first expense to track spending</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceForm({ onSave, onCancel }: {
  onSave: (invoice: Invoice) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    invoiceNumber: `INV-${Date.now()}`,
    clientName: '',
    clientEmail: '',
    clientAddress: '',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    notes: '',
    description: '',
    taxRate: 18, // Default GST rate
    upiId: '',
  });
  
  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: '', quantity: 1, rate: 0, amount: 0 }
  ]);

  const { toast } = useToast();

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') {
          updated.amount = updated.quantity * updated.rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const addItem = () => {
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = subtotal * (formData.taxRate / 100);
  const total = subtotal + tax;

  const handleSave = () => {
    if (!formData.clientName || !formData.dueDate) {
      toast({
        title: "Missing Information",
        description: "Please fill in client name and due date.",
        variant: "destructive",
      });
      return;
    }

    const invoice: Invoice = {
      id: Date.now().toString(),
      ...formData,
      items: items.filter(item => item.description),
      subtotal,
      tax,
      taxRate: formData.taxRate,
      total,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(invoice);
    toast({
      title: "Invoice Created",
      description: `Invoice ${invoice.invoiceNumber} has been created.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Invoice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Invoice Number</label>
            <Input
              value={formData.invoiceNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Issue Date</label>
            <Input
              type="date"
              value={formData.issueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Client Name *</label>
            <Input
              value={formData.clientName}
              onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
              placeholder="Enter client name"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Due Date *</label>
            <Input
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Client Email</label>
          <Input
            type="email"
            value={formData.clientEmail}
            onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
            placeholder="Enter client email"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Client Address</label>
          <Textarea
            value={formData.clientAddress}
            onChange={(e) => setFormData(prev => ({ ...prev, clientAddress: e.target.value }))}
            placeholder="Enter client address"
          />
        </div>

        <div>
          <label className="text-sm font-medium">Invoice Description</label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter overall invoice description or terms..."
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Tax Rate (%)</label>
            <Input
              type="number"
              value={formData.taxRate}
              onChange={(e) => setFormData(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
              placeholder="18"
              min="0"
              max="100"
            />
            <p className="text-xs text-muted-foreground mt-1">Common rates: 5%, 12%, 18%, 28%</p>
          </div>
          <div>
            <label className="text-sm font-medium">UPI ID (for payment QR code)</label>
            <Input
              value={formData.upiId}
              onChange={(e) => setFormData(prev => ({ ...prev, upiId: e.target.value }))}
              placeholder="yourbusiness@upi or mobile@paytm"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Line Items</h3>
            <Button type="button" onClick={addItem} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>
          
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5">
                  <Input
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder="Rate"
                    value={item.rate}
                    onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    value={`₹${item.amount.toFixed(2)}`}
                    readOnly
                    className="bg-muted"
                  />
                </div>
                <div className="col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-end space-y-2">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Tax ({formData.taxRate}%):</span>
                <span>₹{tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Total:</span>
                <span>₹{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes or terms"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>Create Invoice</Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceDetails({ invoice, onBack, onUpdate }: {
  invoice: Invoice;
  onBack: () => void;
  onUpdate: (invoice: Invoice) => void;
}) {
  const { toast } = useToast();

  const updateStatus = (status: Invoice['status']) => {
    const updatedInvoice = {
      ...invoice,
      status,
      updatedAt: new Date().toISOString()
    };
    onUpdate(updatedInvoice);
    toast({
      title: "Status Updated",
      description: `Invoice marked as ${status}.`,
    });
  };

  const downloadInvoicePDF = () => {
    // Generate UPI payment string
    const upiPaymentString = invoice.upiId 
      ? `upi://pay?pa=${encodeURIComponent(invoice.upiId)}&am=${invoice.total}&cu=INR&tn=${encodeURIComponent(`Payment for ${invoice.invoiceNumber}`)}`
      : '';

    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { margin-bottom: 30px; }
            .invoice-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .section { margin-bottom: 20px; }
            .billing-info { display: flex; justify-content: space-between; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .items-table th, .items-table td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            .items-table th { background-color: #f5f5f5; }
            .total-section { text-align: right; margin-top: 20px; }
            .total-row { margin: 5px 0; }
            .total-final { font-size: 18px; font-weight: bold; border-top: 2px solid #000; padding-top: 10px; }
            .qr-code { text-align: center; margin: 20px 0; }
            .description { margin: 20px 0; padding: 10px; background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="invoice-title">INVOICE ${invoice.invoiceNumber}</div>
            <div>Issue Date: ${invoice.issueDate}</div>
            <div>Due Date: ${invoice.dueDate}</div>
          </div>
          
          <div class="billing-info">
            <div class="section">
              <h3>Bill To:</h3>
              <p><strong>${invoice.clientName}</strong></p>
              <p>${invoice.clientEmail || ''}</p>
              <p>${invoice.clientAddress || ''}</p>
            </div>
          </div>

          ${invoice.description ? `<div class="description"><strong>Description:</strong><br>${invoice.description}</div>` : ''}

          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td>₹${item.rate.toFixed(2)}</td>
                  <td>₹${item.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total-section">
            <div class="total-row">Subtotal: ₹${invoice.subtotal.toFixed(2)}</div>
            <div class="total-row">Tax (${invoice.taxRate}%): ₹${invoice.tax.toFixed(2)}</div>
            <div class="total-row total-final">Total: ₹${invoice.total.toFixed(2)}</div>
          </div>

          ${invoice.upiId ? `
            <div class="qr-code">
              <h3>Scan to Pay via UPI</h3>
              <div id="qrcode-container"></div>
              <p>UPI ID: ${invoice.upiId}</p>
            </div>
          ` : ''}

          ${invoice.notes ? `<div class="section"><strong>Notes:</strong><br>${invoice.notes}</div>` : ''}
        </body>
      </html>
    `;

    // Open in new window for printing/downloading
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for QR code if needed, then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 500);
      
      toast({
        title: "Invoice Opened",
        description: "Invoice opened in new window. Use browser print to save as PDF.",
      });
    }
  };

  const downloadInvoice = () => {
    downloadInvoicePDF();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <Button variant="ghost" onClick={onBack} className="mb-2">
              ← Back to Invoices
            </Button>
            <CardTitle className="text-2xl">{invoice.invoiceNumber}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={
                invoice.status === 'paid' ? 'bg-green-500' :
                invoice.status === 'overdue' ? 'bg-red-500' :
                invoice.status === 'sent' ? 'bg-blue-500' : 'bg-gray-500'
              }>
                {invoice.status}
              </Badge>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={downloadInvoice}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            {invoice.status === 'draft' && (
              <Button onClick={() => updateStatus('sent')}>
                Mark as Sent
              </Button>
            )}
            {invoice.status === 'sent' && (
              <Button onClick={() => updateStatus('paid')}>
                Mark as Paid
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold mb-2">Bill To:</h3>
            <div className="space-y-1">
              <p className="font-medium">{invoice.clientName}</p>
              <p className="text-muted-foreground">{invoice.clientEmail}</p>
              <p className="text-muted-foreground whitespace-pre-line">{invoice.clientAddress}</p>
            </div>
          </div>
          <div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Date:</span>
                <span>{invoice.issueDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span>{invoice.dueDate}</span>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-4">Items</h3>
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-4 bg-muted font-medium">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Rate</div>
              <div className="col-span-3 text-right">Amount</div>
            </div>
            {invoice.items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border-t">
                <div className="col-span-5">{item.description}</div>
                <div className="col-span-2">{item.quantity}</div>
                <div className="col-span-2">₹{item.rate.toFixed(2)}</div>
                <div className="col-span-3 text-right">₹{item.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>₹{invoice.subtotal.toFixed(2)}</span>
            </div>
              <div className="flex justify-between">
                <span>Tax ({invoice.taxRate || 18}%):</span>
                <span>₹{invoice.tax.toFixed(2)}</span>
              </div>
            <div className="flex justify-between font-bold text-lg border-t pt-2">
              <span>Total:</span>
              <span>₹{invoice.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {invoice.description && (
          <div>
            <h3 className="font-semibold mb-2">Invoice Description</h3>
            <p className="text-muted-foreground whitespace-pre-line">{invoice.description}</p>
          </div>
        )}

        {invoice.upiId && (
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-4 text-center">Pay via UPI</h3>
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-lg border">
                <QRCodeSVG 
                  value={`upi://pay?pa=${encodeURIComponent(invoice.upiId)}&am=${invoice.total}&cu=INR&tn=${encodeURIComponent(`Payment for ${invoice.invoiceNumber}`)}`}
                  size={200}
                />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">Scan to Pay</p>
                <p className="text-xs text-muted-foreground mt-1">UPI ID: {invoice.upiId}</p>
                <p className="text-xs text-muted-foreground">Amount: ₹{invoice.total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {invoice.notes && (
          <div>
            <h3 className="font-semibold mb-2">Notes</h3>
            <p className="text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExpenseForm({ onSave, onCancel }: {
  onSave: (expense: Expense) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const { toast } = useToast();

  const categories = [
    'Office Supplies',
    'Travel',
    'Meals & Entertainment',
    'Professional Services',
    'Marketing',
    'Software',
    'Equipment',
    'Utilities',
    'Other'
  ];

  const handleSave = () => {
    if (!formData.description || !formData.amount || !formData.category) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    const expense: Expense = {
      id: Date.now().toString(),
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: formData.date,
      notes: formData.notes,
      createdAt: new Date().toISOString(),
    };

    onSave(expense);
    toast({
      title: "Expense Added",
      description: "Expense has been recorded successfully.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Expense</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium">Description *</label>
          <Input
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Enter expense description"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Amount *</label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Category *</label>
          <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Notes</label>
          <Textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            placeholder="Additional notes"
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>Add Expense</Button>
        </div>
      </CardContent>
    </Card>
  );
}