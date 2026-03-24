import React, { useState } from 'react';
import { ActionCardWrapper, GovernanceStatus } from './ActionCardWrapper';
import { MessageSquare, Edit2, User, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface MessagePreviewCardProps {
  orderNumber: string;
  recipientName: string;
  recipientType: 'customer' | 'driver' | 'carrier';
  templateName: string;
  messageContent: string;
  editable?: boolean;
  onSend?: (content: string) => void;
  governance?: GovernanceStatus;
}

export const MessagePreviewCard: React.FC<MessagePreviewCardProps> = ({
  orderNumber,
  recipientName,
  recipientType,
  templateName,
  messageContent,
  editable = true,
  onSend,
  governance,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(messageContent);

  const handleSend = () => {
    onSend?.(content);
  };

  const RecipientIcon = recipientType === 'customer' ? Building2 : User;

  return (
    <ActionCardWrapper
      title={`Bericht ${orderNumber}`}
      icon={<MessageSquare className="h-4 w-4 text-blue-500" />}
      cardType="MESSAGE_PREVIEW"
      governance={governance}
      onExecute={handleSend}
    >
      <div className="space-y-3">
        {/* Recipient Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <RecipientIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium">{recipientName}</span>
            <Badge variant="outline" className="text-[10px]">
              {recipientType === 'customer' ? 'Klant' : recipientType === 'driver' ? 'Eigen chauffeur' : 'Charter'}
            </Badge>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {templateName}
          </Badge>
        </div>

        {/* Message Content */}
        <div className="relative">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] text-xs resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    setIsEditing(false);
                    setContent(messageContent);
                  }}
                >
                  Annuleren
                </Button>
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => setIsEditing(false)}
                >
                  Opslaan
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-md bg-muted/30 border border-border/50">
              <p className="text-xs whitespace-pre-wrap">{content}</p>
              {editable && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2 h-6 w-6 p-0"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </ActionCardWrapper>
  );
};
