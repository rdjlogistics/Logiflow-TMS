import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Navigation2 } from "lucide-react";
import DriverTrackDialog from "./DriverTrackDialog";

interface DriverTrackButtonProps {
  tripId: string;
  driverName?: string;
  vehiclePlate?: string;
  destination?: {
    address: string;
    latitude: number;
    longitude: number;
  };
  variant?: "default" | "ghost" | "outline" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
}

const DriverTrackButton: React.FC<DriverTrackButtonProps> = ({
  tripId,
  driverName,
  vehiclePlate,
  destination,
  variant = "ghost",
  size = "sm",
  className = "",
  showLabel = false,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setDialogOpen(true)}
        className={`gap-1.5 ${className}`}
        title="Volg chauffeur"
      >
        <Navigation2 className="h-4 w-4" />
        {showLabel && <span>Track</span>}
      </Button>

      <DriverTrackDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tripId={tripId}
        driverName={driverName}
        vehiclePlate={vehiclePlate}
        destination={destination}
      />
    </>
  );
};

export default DriverTrackButton;
