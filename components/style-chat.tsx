"use client";

import { useState } from "react";

interface StyleChatProps {
  userId?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function StyleChat({ userId }: StyleChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    setInput(event.target.value);
  }

  async function handleSubmit(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const baseMessages = [...messages, userMessage];
    setMessages(baseMessages);
    setInput("");

    setIsLoading(true);
    const assistantId = `assistant-${Date.now()}`;
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          messages: baseMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: assistantContent.trimStart() } : msg
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content: "Sorry, I ran into an issue. Please try again in a moment.",
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }

  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-black text-white px-4 sm:px-6 py-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors text-sm sm:text-base touch-manipulation"
          aria-label="Open style assistant"
        >
          <span className="hidden sm:inline">💬 Style Assistant</span>
          <span className="sm:hidden">💬</span>
        </button>
      ) : (
        <div className="bg-white rounded-lg sm:rounded-lg shadow-2xl w-screen sm:w-96 h-screen sm:h-[500px] max-h-[600px] flex flex-col fixed sm:relative inset-0 sm:inset-auto sm:bottom-auto sm:right-auto">
          {/* Header */}
          <div className="bg-black text-white p-4 rounded-t-lg sm:rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold text-sm sm:text-base">Stylr AI Assistant</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-300 p-1 touch-manipulation"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-gray-500 text-sm">
                <p className="font-medium mb-2">Ask me anything about style:</p>
                <ul className="space-y-1 text-xs">
                  <li>• "What should I wear to a summer wedding?"</li>
                  <li>• "How can I style my blue jacket?"</li>
                  <li>• "What colors go with navy?"</li>
                  <li>• "Give me outfit ideas for work"</li>
                </ul>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === "user"
                      ? "bg-black text-white"
                      : "bg-gray-100 text-gray-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about style..."
                className="flex-1 px-3 py-2.5 sm:py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black text-sm touch-manipulation"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-black text-white px-4 py-2.5 sm:py-2 rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm touch-manipulation min-w-[60px]"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
