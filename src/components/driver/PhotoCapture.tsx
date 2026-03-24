import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Camera, Plus, Trash2, Check, Image } from 'lucide-react';

interface PhotoCaptureProps {
  onSave: (photos: File[]) => void;
  onCancel: () => void;
}

export const PhotoCapture = ({ onSave, onCancel }: PhotoCaptureProps) => {
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((prev) => [
          ...prev,
          { file, preview: reader.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (photos.length === 0) return;
    onSave(photos.map((p) => p.file));
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="h-5 w-5" />
          </Button>
          <h2 className="font-semibold text-lg">Foto bewijs</h2>
          <div className="w-10" />
        </div>
        {/* Step progress indicator */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-1">
            <div className="flex-1 h-1.5 rounded-full bg-primary" />
            <div className="flex-1 h-1.5 rounded-full bg-primary" />
            <div className="flex-1 h-1.5 rounded-full bg-muted" />
          </div>
          <span className="text-xs font-medium text-muted-foreground">2/3</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col overflow-auto">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="h-4 w-4 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            Maak minimaal 1 foto van de zending
          </p>
        </div>

        {/* Photo grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {photos.map((photo, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-xl overflow-hidden border-2 border-primary/20 bg-muted shadow-md"
            >
              <img
                src={photo.preview}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">{index + 1}</span>
              </div>
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 shadow-lg"
                onClick={() => removePhoto(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Add photo button */}
          <label className="aspect-square rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 flex flex-col items-center justify-center cursor-pointer hover:bg-primary/10 transition-colors active:scale-95">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <span className="text-sm font-semibold text-primary">Toevoegen</span>
          </label>
        </div>

        {photos.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Image className="h-10 w-10 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground font-medium mb-1">Nog geen foto's</p>
            <p className="text-sm text-muted-foreground">
              Tik hierboven om foto's toe te voegen
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 p-4 border-t border-border space-y-2">
        {photos.length > 0 ? (
          <Button
            className="w-full h-14 text-lg"
            onClick={handleSave}
          >
            <Check className="h-5 w-5 mr-2" />
            Volgende stap ({photos.length} foto{photos.length !== 1 ? "'s" : ''})
          </Button>
        ) : (
          <Button
            className="w-full h-14 text-lg"
            variant="outline"
            onClick={() => onSave([])}
          >
            Overslaan zonder foto's
          </Button>
        )}
      </div>
    </div>
  );
};
