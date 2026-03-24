import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getVehicleImage, getCategoryImage } from '@/assets/vehicles';

interface VehicleImageProps {
  vehicleType?: string;
  categoryId?: string;
  className?: string;
  fallbackClassName?: string;
  alt?: string;
}

export const VehicleImage = ({ vehicleType, categoryId, className, fallbackClassName, alt = 'Voertuig' }: VehicleImageProps) => {
  const src = vehicleType ? getVehicleImage(vehicleType) : categoryId ? getCategoryImage(categoryId) : undefined;

  if (!src) {
    return (
      <div className={cn("flex items-center justify-center", fallbackClassName)}>
        <Truck className="h-1/2 w-1/2 text-muted-foreground" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("object-contain", className)}
      draggable={false}
    />
  );
};
