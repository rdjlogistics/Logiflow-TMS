import { Sparkles, User, Copy, Check } from 'lucide-react';
import { ChatMessage } from '@/hooks/useChatGPT';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { motion } from 'framer-motion';

interface ChatGPTMessageProps {
  message: ChatMessage;
}

export const ChatGPTMessage = ({ message }: ChatGPTMessageProps) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center
        ${isUser
          ? 'bg-primary text-primary-foreground'
          : 'ai-avatar-gradient'
        }
      `}>
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-primary" />}
      </div>

      {/* Message bubble */}
      <div className={`group flex-1 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`
          relative inline-block px-4 py-3 rounded-2xl
          ${isUser
            ? 'bg-primary text-primary-foreground rounded-br-md'
            : 'bg-card/60 backdrop-blur-xl border border-border/10 rounded-bl-md shadow-sm'
          }
        `}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none
              prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
              prose-headings:mt-3 prose-headings:mb-1
              prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-xs prose-code:font-mono
              prose-pre:bg-muted prose-pre:rounded-xl prose-pre:border prose-pre:border-border/20
              prose-table:text-xs prose-th:px-3 prose-th:py-1.5 prose-td:px-3 prose-td:py-1.5
              prose-strong:text-foreground
            ">
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse rounded-sm ml-0.5 align-text-bottom" />
              )}
            </div>
          )}

          {/* Copy button for AI messages */}
          {!isUser && (
            <button
              onClick={handleCopy}
              className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 transition-opacity
                bg-background/80 backdrop-blur-sm border border-border/20 rounded-lg p-1.5
                hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground mt-1.5 px-1">
          {format(new Date(message.createdAt), 'HH:mm', { locale: nl })}
        </p>
      </div>
    </motion.div>
  );
};
