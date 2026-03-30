import { useLocation, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Home, 
  Package, 
  MapPin, 
  FileText, 
  HelpCircle, 
  Search,
  ArrowLeft,
  Compass,
  
  Mail,
  Clock,
  Truck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [recentPages, setRecentPages] = useState<string[]>([]);

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    
    // Get recent pages from localStorage
    const stored = localStorage.getItem("recentPages");
    if (stored) {
      try {
        const pages = JSON.parse(stored);
        setRecentPages(pages.slice(0, 3));
      } catch (e) {
        console.error("Failed to parse recent pages", e);
      }
    }
  }, [location.pathname]);

  const quickLinks = [
    { icon: Home, label: "Dashboard", href: "/", description: "Terug naar overzicht" },
    { icon: Package, label: "Orders", href: "/orders", description: "Bekijk alle zendingen" },
    { icon: MapPin, label: "Live Tracking", href: "/tracking", description: "Real-time locaties" },
    { icon: FileText, label: "Facturen", href: "/invoices", description: "Financieel overzicht" },
  ];

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Navigate to a search or redirect based on query
      window.location.href = `/orders?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          {/* Animated 404 with truck icon */}
          <div className="relative inline-block mb-6">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
            >
              <Truck className="h-24 w-24 text-primary mx-auto" />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-10 h-10 flex items-center justify-center font-bold text-sm"
            >
              ?
            </motion.div>
          </div>

          <motion.h1 
            className="text-7xl font-bold text-primary mb-4"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            404
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-2xl font-semibold mb-2">Route niet gevonden</h2>
            <p className="text-muted-foreground mb-2">
              De pagina <code className="bg-muted px-2 py-1 rounded text-sm">{location.pathname}</code> bestaat niet.
            </p>
            <p className="text-sm text-muted-foreground">
              Misschien is de pagina verplaatst of heb je een verkeerde URL ingevoerd.
            </p>
          </motion.div>
        </motion.div>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mb-8"
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Zoek orders, facturen of klanten..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch}>
                  <Search className="h-4 w-4 mr-2" />
                  Zoeken
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-8"
        >
          <h3 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
            <Compass className="h-4 w-4" />
            Snelle navigatie
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {quickLinks.map((link, index) => (
              <motion.div
                key={link.href}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + index * 0.1 }}
              >
                <Link to={link.href}>
                  <Card className="border-white/10 bg-white/5 backdrop-blur-xl hover:border-white/20 hover:bg-white/10 transition-all duration-200 cursor-pointer group">
                    <CardContent className="p-4 text-center">
                      <link.icon className="h-6 w-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
                      <p className="font-medium text-sm">{link.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{link.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent pages if available */}
        {recentPages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mb-8"
          >
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Recent bezocht
            </h3>
            <div className="flex flex-wrap gap-2">
              {recentPages.map((page, i) => (
                <Link key={i} to={page}>
                  <Button variant="outline" size="sm">
                    {page}
                  </Button>
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Button variant="default" size="lg" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Terug naar Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/admin/help">
              <HelpCircle className="h-4 w-4 mr-2" />
              Help Center
            </Link>
          </Button>
        </motion.div>

        {/* Contact support */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mt-12 text-center"
        >
          <p className="text-sm text-muted-foreground mb-3">
            Blijft het probleem? Neem contact op met support:
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <a 
              href="mailto:support@rdjlogistics.nl" 
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail className="h-4 w-4" />
              support@rdjlogistics.nl
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFound;
