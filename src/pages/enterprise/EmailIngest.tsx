import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useDropzone } from "react-dropzone";

const EmailIngest = () => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "message/rfc822": [".eml"],
      "application/pdf": [".pdf"],
    },
    onDrop: (files) => {
      if (!files.length) return;
      toast({ title: `${files.length} bestand(en) ontvangen`, description: "AI parsing wordt gestart..." });
    },
  });

  return (
    <DashboardLayout title="Email Ingest">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Email Ingest</CardTitle>
          </div>
          <CardDescription>Automatisch orders parsen uit emails met AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Mail className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">{isDragActive ? "Laat los om te uploaden" : "Sleep email bestanden hierheen"}</p>
            <p className="text-sm text-muted-foreground mt-1">EML of PDF formaat</p>
            <Button className="mt-4" size="sm" variant="outline">
              <Upload className="h-4 w-4 mr-2" /> Selecteer bestanden
            </Button>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default EmailIngest;
