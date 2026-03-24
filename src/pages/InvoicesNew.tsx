import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { BatchInvoiceWizard } from "@/components/invoices/BatchInvoiceWizard";
import { ManualInvoiceForm } from "@/components/invoices/ManualInvoiceForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, FileText, AlertTriangle } from "lucide-react";

export default function InvoicesNew() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"batch" | "manual">("batch");

  const handleSuccess = (invoiceId?: string) => {
    if (invoiceId) {
      navigate(`/invoices`);
    } else {
      navigate("/invoices");
    }
  };

  return (
    <DashboardLayout title="Nieuwe Facturatie">
      <div className="space-y-6 max-w-5xl mx-auto">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "batch" | "manual")}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Automatisch
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Handmatig
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batch" className="mt-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Batch Facturatie
                </CardTitle>
                <CardDescription>
                  Genereer automatisch facturen voor alle gecontroleerde orders binnen een periode.
                  Bedragen worden automatisch berekend op basis van order prijzen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BatchInvoiceWizard onComplete={handleSuccess} onCancel={() => navigate("/invoices")} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="mt-6">
            <Card className="glass-card border-amber-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-5 w-5" />
                  Losse Factuur
                </CardTitle>
                <CardDescription>
                  Maak een handmatige factuur aan die niet gekoppeld is aan orders.
                  Gebruik dit alleen voor uitzonderlijke situaties.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ManualInvoiceForm 
                  onSuccess={handleSuccess}
                  onCancel={() => navigate("/invoices")}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
