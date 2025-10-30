import { useState } from "react";
import { Calculator, Receipt, FileText, Settings, Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { calculateGST, calculateTDS, formatIndianCurrency } from "@/lib/indian-tax-utils";

interface TaxRate {
  id: string;
  name: string;
  type: "GST" | "VAT" | "Sales Tax" | "TDS";
  rate: number;
  description: string;
  applicableCategories: string[];
  isDefault: boolean;
}

interface TaxConfiguration {
  businessGSTIN?: string;
  businessPAN?: string;
  businessType: "regular" | "composition" | "exempt";
  defaultGSTRate: number;
  defaultTDSRate: number;
  enableAutoCalculation: boolean;
  roundingMethod: "round" | "floor" | "ceil";
}

const defaultTaxRates: TaxRate[] = [
  {
    id: "1",
    name: "Standard GST",
    type: "GST",
    rate: 18,
    description: "Standard GST rate for most goods and services",
    applicableCategories: ["General"],
    isDefault: true
  },
  {
    id: "2",
    name: "Reduced GST",
    type: "GST",
    rate: 5,
    description: "Reduced GST rate for essential items",
    applicableCategories: ["Food", "Medicine"],
    isDefault: false
  },
  {
    id: "3",
    name: "Luxury GST",
    type: "GST",
    rate: 28,
    description: "Higher GST rate for luxury items",
    applicableCategories: ["Luxury", "Electronics"],
    isDefault: false
  },
  {
    id: "4",
    name: "Professional TDS",
    type: "TDS",
    rate: 10,
    description: "TDS for professional services",
    applicableCategories: ["Services"],
    isDefault: false
  }
];

const defaultConfig: TaxConfiguration = {
  businessType: "regular",
  defaultGSTRate: 18,
  defaultTDSRate: 10,
  enableAutoCalculation: true,
  roundingMethod: "round"
};

export function TaxManager() {
  const [taxRates, setTaxRates] = useState<TaxRate[]>(defaultTaxRates);
  const [config, setConfig] = useState<TaxConfiguration>(defaultConfig);
  const [editingRate, setEditingRate] = useState<TaxRate | null>(null);
  const [isAddingRate, setIsAddingRate] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const { toast } = useToast();

  const handleSaveRate = (rate: TaxRate) => {
    if (editingRate) {
      setTaxRates(prev => prev.map(r => r.id === rate.id ? rate : r));
      toast({ title: "Tax rate updated successfully" });
    } else {
      setTaxRates(prev => [...prev, { ...rate, id: Date.now().toString() }]);
      toast({ title: "Tax rate added successfully" });
    }
    setEditingRate(null);
    setIsAddingRate(false);
  };

  const handleDeleteRate = (id: string) => {
    setTaxRates(prev => prev.filter(r => r.id !== id));
    toast({ title: "Tax rate deleted successfully" });
  };

  const handleSaveConfig = (newConfig: TaxConfiguration) => {
    setConfig(newConfig);
    setShowConfig(false);
    toast({ title: "Tax configuration saved successfully" });
  };

  const getTaxRatesByType = (type: string) => {
    return taxRates.filter(rate => rate.type === type);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Tax Management</h2>
        <div className="flex gap-2">
          <Dialog open={showCalculator} onOpenChange={setShowCalculator}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Calculator className="h-4 w-4 mr-2" />
                Tax Calculator
              </Button>
            </DialogTrigger>
            <DialogContent>
              <TaxCalculator 
                taxRates={taxRates} 
                config={config}
                onClose={() => setShowCalculator(false)} 
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={showConfig} onOpenChange={setShowConfig}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Configuration
              </Button>
            </DialogTrigger>
            <DialogContent>
              <TaxConfigForm 
                config={config} 
                onSave={handleSaveConfig}
                onCancel={() => setShowConfig(false)}
              />
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddingRate} onOpenChange={setIsAddingRate}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Tax Rate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <TaxRateForm 
                rate={editingRate}
                onSave={handleSaveRate}
                onCancel={() => {
                  setEditingRate(null);
                  setIsAddingRate(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Business Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Business Tax Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">GSTIN</p>
              <p className="font-medium">{config.businessGSTIN || "Not configured"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">PAN</p>
              <p className="font-medium">{config.businessPAN || "Not configured"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Business Type</p>
              <Badge variant="secondary">{config.businessType}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Auto Calculation</p>
              <Badge variant={config.enableAutoCalculation ? "default" : "secondary"}>
                {config.enableAutoCalculation ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tax Rates by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {["GST", "TDS", "VAT", "Sales Tax"].map(type => (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{type} Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {getTaxRatesByType(type).map(rate => (
                  <div key={rate.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{rate.name}</h4>
                        {rate.isDefault && (
                          <Badge variant="default" className="text-xs">Default</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{rate.description}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rate.applicableCategories.map(category => (
                          <Badge key={category} variant="outline" className="text-xs">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-lg">{rate.rate}%</span>
                      <div className="flex gap-1">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setEditingRate(rate)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <TaxRateForm 
                              rate={rate}
                              onSave={handleSaveRate}
                              onCancel={() => setEditingRate(null)}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteRate(rate.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                
                {getTaxRatesByType(type).length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    No {type} rates configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TaxRateForm({ 
  rate, 
  onSave, 
  onCancel 
}: {
  rate?: TaxRate | null;
  onSave: (rate: TaxRate) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<TaxRate>(rate || {
    id: "",
    name: "",
    type: "GST",
    rate: 0,
    description: "",
    applicableCategories: [],
    isDefault: false
  });

  const [newCategory, setNewCategory] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || formData.rate === 0) return;
    onSave(formData);
  };

  const addCategory = () => {
    if (!newCategory || formData.applicableCategories.includes(newCategory)) return;
    setFormData(prev => ({
      ...prev,
      applicableCategories: [...prev.applicableCategories, newCategory]
    }));
    setNewCategory("");
  };

  const removeCategory = (category: string) => {
    setFormData(prev => ({
      ...prev,
      applicableCategories: prev.applicableCategories.filter(c => c !== category)
    }));
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>{rate ? "Edit Tax Rate" : "Add Tax Rate"}</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Name</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium">Type</label>
            <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GST">GST</SelectItem>
                <SelectItem value="VAT">VAT</SelectItem>
                <SelectItem value="Sales Tax">Sales Tax</SelectItem>
                <SelectItem value="TDS">TDS</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Rate (%)</label>
            <Input
              type="number"
              step="0.01"
              value={formData.rate}
              onChange={(e) => setFormData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
              required
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <input
              type="checkbox"
              checked={formData.isDefault}
              onChange={(e) => setFormData(prev => ({ ...prev, isDefault: e.target.checked }))}
              className="h-4 w-4"
            />
            <label className="text-sm font-medium">Default Rate</label>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <Input
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>

        <div>
          <label className="text-sm font-medium">Applicable Categories</label>
          <div className="flex flex-wrap gap-1 mb-2">
            {formData.applicableCategories.map(category => (
              <Badge key={category} variant="secondary" className="cursor-pointer" onClick={() => removeCategory(category)}>
                {category} ×
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
            />
            <Button type="button" onClick={addCategory}>Add</Button>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save Rate</Button>
        </div>
      </form>
    </div>
  );
}

function TaxConfigForm({ 
  config, 
  onSave, 
  onCancel 
}: {
  config: TaxConfiguration;
  onSave: (config: TaxConfiguration) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState<TaxConfiguration>(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Tax Configuration</DialogTitle>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Business GSTIN</label>
            <Input
              value={formData.businessGSTIN || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, businessGSTIN: e.target.value }))}
              placeholder="e.g., 22AAAAA0000A1Z5"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Business PAN</label>
            <Input
              value={formData.businessPAN || ""}
              onChange={(e) => setFormData(prev => ({ ...prev, businessPAN: e.target.value }))}
              placeholder="e.g., AAAAA0000A"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Business Type</label>
          <Select value={formData.businessType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, businessType: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="regular">Regular</SelectItem>
              <SelectItem value="composition">Composition</SelectItem>
              <SelectItem value="exempt">Exempt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Default GST Rate (%)</label>
            <Input
              type="number"
              step="0.01"
              value={formData.defaultGSTRate}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultGSTRate: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Default TDS Rate (%)</label>
            <Input
              type="number"
              step="0.01"
              value={formData.defaultTDSRate}
              onChange={(e) => setFormData(prev => ({ ...prev, defaultTDSRate: parseFloat(e.target.value) || 0 }))}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Rounding Method</label>
          <Select value={formData.roundingMethod} onValueChange={(value: any) => setFormData(prev => ({ ...prev, roundingMethod: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="round">Round to nearest</SelectItem>
              <SelectItem value="floor">Round down</SelectItem>
              <SelectItem value="ceil">Round up</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.enableAutoCalculation}
            onChange={(e) => setFormData(prev => ({ ...prev, enableAutoCalculation: e.target.checked }))}
            className="h-4 w-4"
          />
          <label className="text-sm font-medium">Enable Auto Tax Calculation</label>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit">Save Configuration</Button>
        </div>
      </form>
    </div>
  );
}

function TaxCalculator({ 
  taxRates, 
  config,
  onClose 
}: {
  taxRates: TaxRate[];
  config: TaxConfiguration;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState<number>(0);
  const [selectedGSTRate, setSelectedGSTRate] = useState<number>(config.defaultGSTRate);
  const [selectedTDSRate, setSelectedTDSRate] = useState<number>(config.defaultTDSRate);
  const [isInclusive, setIsInclusive] = useState<boolean>(false);

  const gstRates = taxRates.filter(rate => rate.type === "GST");
  const tdsRates = taxRates.filter(rate => rate.type === "TDS");

  const calculateTax = () => {
    if (amount === 0) return null;

    let baseAmount = amount;
    if (isInclusive) {
      // If tax is inclusive, extract the base amount
      baseAmount = amount / (1 + selectedGSTRate / 100);
    }

    const gstCalculation = calculateGST(baseAmount, selectedGSTRate);
    const tdsAmount = calculateTDS(baseAmount, selectedTDSRate);
    
    const totalWithGST = baseAmount + gstCalculation.totalGST;
    const finalAmount = isInclusive ? amount : totalWithGST;

    return {
      baseAmount,
      gst: gstCalculation,
      tds: tdsAmount,
      totalWithGST,
      finalAmount,
      totalTax: gstCalculation.totalGST + tdsAmount
    };
  };

  const calculation = calculateTax();

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Tax Calculator</DialogTitle>
      </DialogHeader>
      
      <div className="space-y-4 mt-4">
        <div>
          <label className="text-sm font-medium">Amount</label>
          <Input
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            placeholder="Enter amount"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={isInclusive}
            onChange={(e) => setIsInclusive(e.target.checked)}
            className="h-4 w-4"
          />
          <label className="text-sm font-medium">Tax Inclusive Amount</label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">GST Rate (%)</label>
            <Select value={selectedGSTRate.toString()} onValueChange={(value) => setSelectedGSTRate(parseFloat(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {gstRates.map(rate => (
                  <SelectItem key={rate.id} value={rate.rate.toString()}>
                    {rate.name} - {rate.rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">TDS Rate (%)</label>
            <Select value={selectedTDSRate.toString()} onValueChange={(value) => setSelectedTDSRate(parseFloat(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No TDS</SelectItem>
                {tdsRates.map(rate => (
                  <SelectItem key={rate.id} value={rate.rate.toString()}>
                    {rate.name} - {rate.rate}%
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {calculation && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tax Calculation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span>Base Amount:</span>
                <span className="font-medium">{formatIndianCurrency(calculation.baseAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>CGST ({selectedGSTRate/2}%):</span>
                <span className="font-medium">{formatIndianCurrency(calculation.gst.cgst)}</span>
              </div>
              <div className="flex justify-between">
                <span>SGST ({selectedGSTRate/2}%):</span>
                <span className="font-medium">{formatIndianCurrency(calculation.gst.sgst)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total GST:</span>
                <span className="font-medium">{formatIndianCurrency(calculation.gst.totalGST)}</span>
              </div>
              {selectedTDSRate > 0 && (
                <div className="flex justify-between">
                  <span>TDS ({selectedTDSRate}%):</span>
                  <span className="font-medium text-destructive">-{formatIndianCurrency(calculation.tds)}</span>
                </div>
              )}
              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Final Amount:</span>
                  <span>{formatIndianCurrency(calculation.finalAmount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}