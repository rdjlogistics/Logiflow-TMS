import { useState, KeyboardEvent, useRef, useEffect, forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Smile, X, Image, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';

interface MessageInputProps {
  onSend: (content: string, attachmentUrl?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onAttachment?: (file: File) => void;
  channelId?: string;
}

// Common emoji categories
const emojiCategories = {
  'Smileys': ['😀', '😃', '😄', '😁', '😊', '😍', '🥰', '😎', '🤔', '😅', '😂', '🤣'],
  'Gestures': ['👍', '👎', '👋', '🙏', '👏', '🤝', '✌️', '🤞', '👌', '💪', '🙌', '🫡'],
  'Business': ['📦', '🚚', '📋', '✅', '❌', '⏰', '📍', '🏢', '📞', '📧', '💼', '📈'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export const MessageInput = forwardRef<HTMLDivElement, MessageInputProps>(({
  onSend,
  disabled = false,
  placeholder = 'Typ een bericht...',
  onAttachment,
  channelId,
}, ref) => {
  placeholder = 'Typ een bericht...',
  onAttachment,
}, ref) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // Create preview URL for images
  useEffect(() => {
    if (selectedFile && selectedFile.type.startsWith('image/')) {
      const url = URL.createObjectURL(selectedFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [selectedFile]);

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || disabled) return;

    let attachmentUrl: string | undefined;

    if (selectedFile) {
      setUploading(true);
      try {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${Date.now()}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = await supabase.storage
          .from('chat-attachments')
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

        attachmentUrl = urlData?.signedUrl;
      } catch (error) {
        toast({
          title: "Upload mislukt",
          description: "Kon bestand niet uploaden. Probeer opnieuw.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    onSend(message || (selectedFile ? `📎 ${selectedFile.name}` : ''), attachmentUrl);
    setMessage('');
    setSelectedFile(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiClick = (emoji: string) => {
    setMessage(prev => prev + emoji);
    setEmojiOpen(false);
    textareaRef.current?.focus();
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Bestand te groot",
          description: "Maximum bestandsgrootte is 10MB",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: "Bestandstype niet ondersteund",
          description: "Alleen afbeeldingen, PDF en Word documenten",
          variant: "destructive",
        });
        e.target.value = '';
        return;
      }

      if (onAttachment) {
        onAttachment(file);
      } else {
        setSelectedFile(file);
      }
      e.target.value = '';
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  return (
    <div 
      ref={ref}
      className={cn(
        'p-4 border-t border-border bg-card/80 backdrop-blur-sm transition-all duration-200',
        isFocused && 'bg-card border-t-primary/20'
      )}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*,.pdf,.doc,.docx"
        onChange={handleFileChange}
      />
      
      {/* File Preview */}
      {selectedFile && (
        <div className="mb-3 p-3 rounded-lg bg-muted/50 border border-border/50">
          <div className="flex items-center gap-3">
            {previewUrl ? (
              <img src={previewUrl} alt="Preview" className="w-12 h-12 rounded object-cover" />
            ) : (
              <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                <FileText className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={removeSelectedFile}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
      
      <div className={cn(
        'flex items-end gap-2 p-2 rounded-xl border border-border bg-background/50 transition-all duration-200',
        isFocused && 'border-primary/30 ring-2 ring-primary/10'
      )}>
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 text-muted-foreground hover:text-foreground h-9 w-9"
          onClick={handleAttachmentClick}
          disabled={disabled || uploading}
          title="Bijlage toevoegen"
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        
        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 text-muted-foreground hover:text-foreground h-9 w-9"
              disabled={disabled}
              title="Emoji invoegen"
            >
              <Smile className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start" side="top">
            <div className="space-y-3">
              {Object.entries(emojiCategories).map(([category, emojis]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">{category}</p>
                  <div className="flex flex-wrap gap-1">
                    {emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded-md transition-colors"
                        onClick={() => handleEmojiClick(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled || uploading}
          className="min-h-[36px] max-h-[120px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 py-2"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={(!message.trim() && !selectedFile) || disabled || uploading}
          size="icon"
          className={cn(
            'flex-shrink-0 h-9 w-9 rounded-lg transition-all duration-200',
            (message.trim() || selectedFile) 
              ? 'shadow-lg shadow-primary/25 scale-100' 
              : 'scale-95 opacity-70'
          )}
        >
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2 text-center">
        Druk op Enter om te versturen • Shift+Enter voor nieuwe regel
      </p>
    </div>
  );
});

MessageInput.displayName = 'MessageInput';
