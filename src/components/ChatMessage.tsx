import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import Image from 'next/image';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: string;
}

export function ChatMessage({ message, isUser, timestamp }: ChatMessageProps) {
  return (
    <div className={cn(
      "flex w-full mb-4 gap-3",
      isUser ? "justify-end" : "justify-start"
    )}>
      {/* Avatar for AI messages (left side) */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center overflow-hidden">
          <Image
            src="/logo.png"
            alt="AI Assistant"
            width={32}
            height={32}
            className="w-full h-full object-cover rounded-full"
          />
        </div>
      )}
      
      {/* Message content */}
      <div className={cn(
        "max-w-[80%] rounded-lg px-4 py-2 shadow-sm",
        isUser 
          ? "bg-blue-600 text-white" 
          : "bg-gray-800 text-white border border-gray-700"
      )}>
        <p className="text-sm">{message}</p>
        <p className={cn(
          "text-xs mt-1 opacity-70",
          isUser ? "text-blue-100" : "text-gray-400"
        )}>
          {new Date(timestamp).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          })}
        </p>
      </div>

      {/* Avatar for user messages (right side) */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
          <User size={18} className="text-white" />
        </div>
      )}
    </div>
  );
} 