import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Plus, 
  FileText, 
  Truck, 
  Users, 
  Route, 
  Settings,
  Link2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const quickLinks = [
  { label: "Nieuwe order", href: "/orders/edit", icon: Plus, color: "text-primary" },
  { label: "Facturen", href: "/invoices", icon: FileText, color: "text-success" },
  { label: "Ritten", href: "/orders", icon: Truck, color: "text-warning" },
  { label: "Klanten", href: "/customers", icon: Users, color: "text-info" },
  { label: "Planning", href: "/planning/program", icon: Route, color: "text-gold" },
  { label: "Monitoring", href: "/kpi", icon: Settings, color: "text-destructive" },
  { label: "Netwerk", href: "/network", icon: Users, color: "text-cyan-500" },
  { label: "Instellingen", href: "/admin/settings", icon: Settings, color: "text-indigo-500" },
];

const QuickLinksWidget = () => {
  return (
    <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden h-full">
      <CardHeader className="pb-3 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/15">
            <Link2 className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base font-bold">Snelle Links</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="p-3">
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((link, index) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, y: 5 }}
            >
              <Link to={link.href}>
                <motion.div
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-xl",
                    "bg-muted/30 hover:bg-muted/50 border border-border/20 hover:border-border/40",
                    "transition-all duration-150 group cursor-pointer"
                  )}
                  whileHover={{ scale: 1.02, x: 2 }}
                >
                  <div className={cn("p-1.5 rounded-lg bg-background/50", link.color)}>
                    <link.icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-medium flex-1 truncate">{link.label}</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default memo(QuickLinksWidget);
