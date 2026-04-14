import { useState, useRef, useCallback } from 'react';
import { API_URL } from './runtime-config';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UseAIStreamOptions {
  onToken?: (token: string, fullContent: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: string) => void;
}

interface UseAIStreamReturn {
  messages: Message[];
  isStreaming: boolean;
  streamedContent: string;
  error: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export function useAIStream(
  workspaceId: string,
  options: UseAIStreamOptions = {}
): UseAIStreamReturn {
  const { onToken, onComplete, onError } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<Message[]>([]);

  // Keep ref in sync with state to avoid stale closures
  messagesRef.current = messages;

  const sendMessage = useCallback(async (content: string) => {
    setError(null);
    setStreamedContent('');

    const userMessage: Message = { role: 'user', content };
    const updatedMessages = [...messagesRef.current, userMessage];
    setMessages(updatedMessages);

    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsStreaming(true);

    try {
      const response = await fetch(
        `${API_URL}/ai/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            messages: updatedMessages,
            model: 'gpt-4o-mini',
            temperature: 0.7,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));

              switch (event.type) {
                case 'token':
                  fullContent = event.data?.fullContent || fullContent;
                  setStreamedContent(fullContent);
                  onToken?.(event.data?.token || '', fullContent);
                  break;

                case 'done':
                  setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: fullContent },
                  ]);
                  setIsStreaming(false);
                  onComplete?.(fullContent);
                  break;

                case 'error':
                  setError(event.error || 'Unknown error');
                  setIsStreaming(false);
                  onError?.(event.error || 'Unknown error');
                  break;
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User aborted - not an error
        return;
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      setIsStreaming(false);
      onError?.(errorMessage);
    }
  }, [workspaceId, onToken, onComplete, onError]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamedContent('');
    setError(null);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    messages,
    isStreaming,
    streamedContent,
    error,
    sendMessage,
    clearMessages,
  };
}

// Non-streaming AI chat hook
export function useAIChat(workspaceId: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (
    messages: Message[],
    options: { model?: string; temperature?: number } = {}
  ): Promise<Message | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/ai/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            messages,
            model: options.model || 'gpt-4o-mini',
            temperature: options.temperature ?? 0.7,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data.message;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  return {
    sendMessage,
    isLoading,
    error,
  };
}
