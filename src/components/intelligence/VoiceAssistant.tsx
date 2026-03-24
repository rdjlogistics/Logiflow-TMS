import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  MicOff, 
  Send, 
  Bot, 
  User, 
  Loader2,
  Volume2,
  VolumeX,
  Sparkles,
  X,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface VoiceAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hallo! Ik ben je LogiFlow assistent. Vraag me alles over je ritten, chauffeurs, of analyses. Je kunt ook spreken door op de microfoon te klikken.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Send message to AI via Lovable AI Gateway
  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    try {
      // Prepare context from recent messages
      const context = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke('smart-ai', {
        body: {
          action: 'chat',
          mode: 'assistant',
          message: text,
          context,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.reply || 'Sorry, ik kon geen antwoord genereren.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Speak the response if not muted
      if (!isMuted && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(data.reply);
        utterance.lang = 'nl-NL';
        utterance.rate = 1.1;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        speechSynthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      
      // Handle specific error codes
      let errorMessage = 'Kon geen antwoord krijgen. Probeer opnieuw.';
      if (error?.message?.includes('429') || error?.message?.includes('Rate limit')) {
        errorMessage = 'Te veel verzoeken. Wacht even en probeer opnieuw.';
      } else if (error?.message?.includes('402') || error?.message?.includes('Credits')) {
        errorMessage = 'AI credits op. Voeg credits toe aan je workspace.';
      }
      
      toast({
        title: 'Fout',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [messages, isMuted, toast]);

  // Start voice recording
  const startListening = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());

        // Convert to base64 and send for transcription
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          
          setIsProcessing(true);
          try {
            const { data, error } = await supabase.functions.invoke('voice-assistant', {
              body: {
                action: 'transcribe',
                audio: base64Audio,
              },
            });

            if (error) throw error;

            if (data.text) {
              // Send transcribed text as message
              await sendMessage(data.text);
            }
          } catch (error) {
            console.error('Transcription error:', error);
            toast({
              title: 'Transcriptie mislukt',
              description: 'Kon spraak niet herkennen. Probeer opnieuw.',
              variant: 'destructive',
            });
          } finally {
            setIsProcessing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error('Microphone error:', error);
      toast({
        title: 'Microfoon niet beschikbaar',
        description: 'Geef toestemming voor microfoon of type je vraag.',
        variant: 'destructive',
      });
    }
  }, [sendMessage, toast]);

  // Stop voice recording
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setIsMuted(prev => !prev);
  }, [isSpeaking]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]"
      >
        <Card className="shadow-2xl border-2">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/20">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Assistent</h3>
                <p className="text-xs text-muted-foreground">
                  {isListening ? 'Luistert...' : isProcessing ? 'Denkt...' : 'Klaar om te helpen'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={toggleMute}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <CardContent className="p-0">
            <ScrollArea className="h-80 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'flex gap-2',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <div className="p-1.5 rounded-full bg-primary/10 h-fit">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div
                      className={cn(
                        'max-w-[80%] p-3 rounded-lg text-sm',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {message.content}
                    </div>
                    {message.role === 'user' && (
                      <div className="p-1.5 rounded-full bg-primary h-fit">
                        <User className="w-3.5 h-3.5 text-primary-foreground" />
                      </div>
                    )}
                  </motion.div>
                ))}
                {isProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-2"
                  >
                    <div className="p-1.5 rounded-full bg-primary/10 h-fit">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </motion.div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Typ een vraag..."
                  disabled={isProcessing || isListening}
                  className="flex-1"
                />
                <Button
                  size="icon"
                  variant={isListening ? 'destructive' : 'outline'}
                  onClick={isListening ? stopListening : startListening}
                  disabled={isProcessing}
                  className="relative"
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4 h-4" />
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    </>
                  ) : (
                    <Mic className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isProcessing}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Quick actions */}
              <div className="flex flex-wrap gap-1 mt-2">
                {['Ritten vandaag', 'Anomalieën', 'Marge analyse'].map((action) => (
                  <Badge
                    key={action}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent text-xs"
                    onClick={() => sendMessage(action)}
                  >
                    {action}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default VoiceAssistant;
