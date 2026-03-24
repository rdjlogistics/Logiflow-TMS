import { FolderOpen } from 'lucide-react';

interface CarrierDocumentsTabProps {
  carrierId: string;
  allowUpload: boolean;
}

const CarrierDocumentsTab = ({ carrierId, allowUpload }: CarrierDocumentsTabProps) => {
  return (
    <div className="p-4 space-y-4">
      <h2 className="font-bold text-lg">Documenten</h2>
      <div className="text-center py-12 text-muted-foreground">
        <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Documenten worden hier weergegeven zodra er documenten zijn gedeeld.</p>
        {allowUpload && (
          <p className="text-xs mt-2">Je kunt hier ook documenten uploaden bij je ritten.</p>
        )}
      </div>
    </div>
  );
};

export default CarrierDocumentsTab;
