import { Store, Calendar, UtensilsCrossed, Heart, Fuel } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type BusinessType = "retail" | "service" | "restaurant" | "healthcare" | "refilling";

interface BusinessSelectorProps {
  selectedBusiness: BusinessType;
  onBusinessChange: (business: BusinessType) => void;
}

const businessTypes = [
  {
    type: "retail" as BusinessType,
    icon: Store,
    title: "Retail",
    description: "Inventory & POS",
    color: "bg-primary"
  },
  {
    type: "service" as BusinessType,
    icon: Calendar,
    title: "Service",
    description: "Appointments & Invoicing",
    color: "bg-accent"
  },
  {
    type: "restaurant" as BusinessType,
    icon: UtensilsCrossed,
    title: "Restaurant",
    description: "Online Ordering",
    color: "bg-info"
  },
  {
    type: "healthcare" as BusinessType,
    icon: Heart,
    title: "Healthcare",
    description: "Electronic Patient Records",
    color: "bg-success"
  },
  {
    type: "refilling" as BusinessType,
    icon: Fuel,
    title: "Gas Refilling",
    description: "Cylinder & Vessel Tracking",
    color: "bg-warning"
  }
];

export function BusinessSelector({ selectedBusiness, onBusinessChange }: BusinessSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {businessTypes.map((business) => {
        const Icon = business.icon;
        const isSelected = selectedBusiness === business.type;
        
        return (
          <Card 
            key={business.type} 
            className={`cursor-pointer transition-all duration-200 hover:shadow-business ${
              isSelected ? 'ring-2 ring-primary shadow-business' : ''
            }`}
            onClick={() => onBusinessChange(business.type)}
          >
            <CardContent className="p-6 text-center">
              <div className={`w-12 h-12 rounded-lg ${business.color} flex items-center justify-center mx-auto mb-4`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{business.title}</h3>
              <p className="text-sm text-muted-foreground">{business.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}