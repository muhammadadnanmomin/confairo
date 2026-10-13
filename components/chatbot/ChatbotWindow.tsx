"use client";

// ============================================================
// Confairo Chatbot — Chat Window
// Expandable glassmorphism chat panel
// ============================================================
import { useRef, useEffect, useState, KeyboardEvent } from "react";
import Image from "next/image";
import {
  X,
  Minus,
  Trash2,
  Send,
  StopCircle,
} from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { QuickActions } from "./QuickActions";
import type { ChatMessage, ChatbotSettings } from "@/lib/chatbot/types";

interface ChatbotWindowProps {
  isOpen: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  settings: ChatbotSettings | null;
  onClose: () => void;
  onMinimize: () => void;
  onSendMessage: (msg: string) => void;
  onStopStreaming: () => void;
  onClearHistory: () => void;
}

export function ChatbotWindow({
  isOpen,
  messages,
  isStreaming,
  settings,
  onClose,
  onMinimize,
  onSendMessage,
  onStopStreaming,
  onClearHistory,
}: ChatbotWindowProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isStreaming) return;
    onSendMessage(trimmed);
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (query: string) => {
    onSendMessage(query);
  };

  // Welcome message (shown when no messages yet)
  const showWelcome = messages.length === 0;

  // Ensure user-facing branding strictly displays Confairo AI
  const displayBotName = settings?.botName
    ? settings.botName.replace(/AcadFlow\s*AI/gi, "Confairo AI").replace(/AcadFlow/gi, "Confairo")
    : "Confairo AI";

  const displayWelcomeMessage = (
    settings?.welcomeMessage ??
    "Hi! I'm Confairo AI 👋 I can help you discover conferences, track submissions, check deadlines, and navigate the platform. How can I assist you today?"
  )
    .replace(/AcadFlow\s*AI/gi, "Confairo AI")
    .replace(/AcadFlow/gi, "Confairo");

  return (
    <div
      id="chatbot-window"
      role="dialog"
      aria-label="Confairo AI Chat"
      aria-modal="true"
      className={`
        fixed bottom-24 right-6 z-[9997]
        w-[380px] max-w-[calc(100vw-2rem)]
        flex flex-col
        rounded-2xl
        border border-border
        bg-card/95
        backdrop-blur-xl
        shadow-[0_20px_60px_rgba(0,0,0,0.18)]
        transition-all duration-300 ease-out origin-bottom-right
        ${isOpen
          ? "opacity-100 scale-100 translate-y-0"
          : "opacity-0 scale-90 translate-y-4 pointer-events-none"
        }
      `}
      style={{ height: "clamp(440px, 70vh, 620px)" }}
    >
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="
        flex items-center justify-between
        px-4 py-3
        border-b border-border
        rounded-t-2xl
        bg-gradient-to-r from-primary to-primary-hover
        shrink-0
      ">
        <div className="flex items-center gap-2.5">
          <div className="
            h-8 w-8 rounded-full
            bg-card
            flex items-center justify-center
            overflow-hidden shadow-sm shrink-0 p-1
          ">
            <Image
              src="/logos/Symbol.png"
              alt="Confairo AI"
              width={24}
              height={24}
              className="h-5 w-5 object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">
              {displayBotName}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] text-primary-foreground/80">Online</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* Clear history */}
          <button
            id="chatbot-clear-btn"
            onClick={onClearHistory}
            title="Clear chat history"
            className="
              h-7 w-7 cursor-pointer rounded-lg
              flex items-center justify-center
              text-white/70 hover:text-white hover:bg-white/20
              transition-colors
            "
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          {/* Minimize */}
          <button
            id="chatbot-minimize-btn"
            onClick={onMinimize}
            title="Minimize"
            className="
              h-7 w-7 cursor-pointer rounded-lg
              flex items-center justify-center
              text-white/70 hover:text-white hover:bg-white/20
              transition-colors
            "
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          {/* Close */}
          <button
            id="chatbot-close-btn"
            onClick={onClose}
            title="Close"
            className="
              h-7 w-7 cursor-pointer rounded-lg
              flex items-center justify-center
              text-white/70 hover:text-white hover:bg-white/20
              transition-colors
            "
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Message List ──────────────────────────────────────── */}
      <div
        ref={listRef}
        className="flex-1 overflow-y-auto py-3 space-y-0.5 scroll-smooth"
        style={{ scrollbarWidth: "thin" }}
      >
        {showWelcome && (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-4">
            <div className="
              h-16 w-16 rounded-2xl
              bg-card
              border border-border
              flex items-center justify-center
              shadow-lg p-3
            ">
              <Image
                src="/logos/Symbol.png"
                alt="Confairo AI"
                width={44}
                height={44}
                className="h-11 w-11 object-contain"
              />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">
                {displayBotName}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {displayWelcomeMessage}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ask me anything or try a quick action below ↓
            </p>
          </div>
        )}

        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Typing indicator — only when streaming AND last message isn't streaming yet */}
        {isStreaming &&
          messages.length > 0 &&
          !messages[messages.length - 1]?.isStreaming &&
          messages[messages.length - 1]?.role !== "assistant" && (
            <TypingIndicator />
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Quick Actions ─────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border pt-2">
        <QuickActions onSelect={handleQuickAction} disabled={isStreaming} />
      </div>

      {/* ── Input Bar ─────────────────────────────────────────── */}
      <div className="shrink-0 px-3 pb-3">
        <div className="
          flex items-end gap-2
          rounded-xl
          border border-border
          bg-muted/50
          px-3 py-2
          focus-within:border-primary
          focus-within:ring-1 focus-within:ring-primary/20
          transition-all duration-150
        ">
          <textarea
            ref={inputRef}
            id="chatbot-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything…"
            rows={1}
            disabled={isStreaming}
            aria-label="Chat message input"
            className="
              flex-1 resize-none bg-transparent
              text-sm text-foreground
              placeholder:text-muted-foreground
              outline-none leading-5
              max-h-32 overflow-y-auto
              disabled:opacity-50
            "
            style={{
              height: "auto",
              minHeight: "20px",
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />

          {isStreaming ? (
            <button
              id="chatbot-stop-btn"
              onClick={onStopStreaming}
              aria-label="Stop generating"
              className="
                shrink-0 h-8 w-8 cursor-pointer rounded-lg
                bg-destructive hover:bg-destructive/90 text-destructive-foreground
                flex items-center justify-center
                transition-colors
              "
            >
              <StopCircle className="h-4 w-4 text-destructive-foreground" />
            </button>
          ) : (
            <button
              id="chatbot-send-btn"
              onClick={handleSend}
              disabled={!inputValue.trim()}
              aria-label="Send message"
              className="
                shrink-0 h-8 w-8 cursor-pointer rounded-lg
                bg-primary hover:bg-primary-hover text-primary-foreground
                flex items-center justify-center
                transition-colors
                disabled:opacity-40 disabled:cursor-not-allowed
              "
            >
              <Send className="h-3.5 w-3.5 text-primary-foreground" />
            </button>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground mt-1.5">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}
