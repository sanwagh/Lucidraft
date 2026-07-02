import type { ChatMessage } from "@/lib/clientTypes";

/**
 * Chat message. Following Claude/ChatGPT: the user's message sits in a subtle
 * bubble on the right; the assistant's reply is plain prose on the left with no
 * container — calm and readable, not a coloured chat bubble.
 */
export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex w-full animate-rise justify-end">
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-surface-inset px-4 py-2.5 text-[15px] leading-relaxed text-ink">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full animate-rise justify-start">
      <div className="max-w-full whitespace-pre-wrap break-words text-[15px] leading-7 text-ink">
        {message.content}
      </div>
    </div>
  );
}
