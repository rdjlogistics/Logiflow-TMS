import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Package, 
  Search,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Shipment, statusConfig } from "../shared/types";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface B2CShipmentsListProps {
  shipments: Shipment[];
  loading?: boolean;
}

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'delivered':
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    case 'in_transit':
    case 'out_for_delivery':
      return <Truck className="h-5 w-5 text-primary" />;
    case 'failed':
    case 'cancelled':
      return <AlertCircle className="h-5 w-5 text-red-400" />;
    default:
      return <Clock className="h-5 w-5 text-amber-400" />;
  }
};

const containerVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 400, damping: 25 }
  },
  exit: { opacity: 0, y: -8 }
};

export const B2CShipmentsList = ({ shipments, loading }: B2CShipmentsListProps) => {
  const [search, setSearch] = useState("");

  const filteredShipments = shipments.filter(s => 
    s.referenceNumber.toLowerCase().includes(search.toLowerCase()) ||
    s.fromCity.toLowerCase().includes(search.toLowerCase()) ||
    s.toCity.toLowerCase().includes(search.toLowerCase()) ||
    s.trackingCode?.toLowerCase().includes(search.toLowerCase())
  );

  const activeShipments = filteredShipments.filter(s => 
    !['delivered', 'cancelled'].includes(s.status)
  );
  const completedShipments = filteredShipments.filter(s => 
    ['delivered', 'cancelled'].includes(s.status)
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-muted/30 rounded-2xl animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-card/50 rounded-2xl border border-border/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search - Enhanced */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Zoek op referentie of trackingcode..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 h-12 rounded-2xl bg-card/50 backdrop-blur-sm border-border/30 text-base focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          aria-label="Zoek zendingen"
        />
      </div>

      {/* Active Shipments */}
      <AnimatePresence mode="wait">
        {activeShipments.length > 0 && (
          <motion.div 
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Actief ({activeShipments.length})
            </h2>
            {activeShipments.map((shipment, index) => (
              <motion.div key={shipment.id} variants={itemVariants} custom={index}>
                <ShipmentCard shipment={shipment} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completed */}
      <AnimatePresence mode="wait">
        {completedShipments.length > 0 && (
          <motion.div 
            className="space-y-3"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Afgerond ({completedShipments.length})
            </h2>
            {completedShipments.map((shipment, index) => (
              <motion.div key={shipment.id} variants={itemVariants} custom={index}>
                <ShipmentCard shipment={shipment} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {filteredShipments.length === 0 && (
        <motion.div 
          className="text-center py-12"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/30 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
            <Package className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Geen zendingen gevonden</h3>
          <p className="text-sm text-muted-foreground mb-6">
            {search ? "Probeer een andere zoekopdracht" : "Je hebt nog geen zendingen"}
          </p>
          <Button asChild className="bg-gold hover:bg-gold/90 text-gold-foreground rounded-xl touch-manipulation">
            <Link to="/portal/b2c/book">Eerste zending versturen</Link>
          </Button>
        </motion.div>
      )}
    </div>
  );
};

const ShipmentCard = ({ shipment }: { shipment: Shipment }) => {
  const status = statusConfig[shipment.status];
  
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="touch-manipulation"
    >
      <Link
        to={`/portal/b2c/track/${shipment.id}`}
        className="block bg-card/60 backdrop-blur-sm rounded-2xl border border-border/30 p-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label={`Zending ${shipment.referenceNumber} van ${shipment.fromCity} naar ${shipment.toCity}, status: ${status.label}`}
      >
        <div className="flex items-start gap-4">
          {/* Status Icon */}
          <div className={cn(
            "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-sm",
            status.bgColor
          )}>
            <StatusIcon status={shipment.status} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Route */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium truncate">{shipment.fromCity}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="font-medium truncate">{shipment.toCity}</span>
            </div>

            {/* Status */}
            <p className={cn("text-xs font-medium mt-1", status.color)}>
              {status.label}
            </p>

            {/* Meta */}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span>{shipment.referenceNumber}</span>
              {shipment.trackingCode && (
                <>
                  <span>•</span>
                  <span className="font-mono">{shipment.trackingCode}</span>
                </>
              )}
            </div>
          </div>

          {/* ETA / Date */}
          <div className="text-right text-xs">
            {shipment.estimatedDelivery && shipment.status !== 'delivered' ? (
              <>
                <p className="text-muted-foreground">Verwacht</p>
                <p className="font-semibold">
                  {format(new Date(shipment.estimatedDelivery), "d MMM", { locale: nl })}
                </p>
              </>
            ) : shipment.deliveredAt ? (
              <>
                <p className="text-muted-foreground">Bezorgd</p>
                <p className="font-semibold text-emerald-400">
                  {format(new Date(shipment.deliveredAt), "d MMM", { locale: nl })}
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                {format(new Date(shipment.createdAt), "d MMM", { locale: nl })}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default B2CShipmentsList;
