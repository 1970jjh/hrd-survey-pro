"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  KeyboardEvent,
  MouseEvent,
} from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Parse markdown-like text to React elements
function formatMessage(text: string): React.ReactNode {
  // Split by lines
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType;
      elements.push(
        <ListTag
          key={elements.length}
          className={
            listType === "ul"
              ? "list-disc list-inside my-2 space-y-1"
              : "list-decimal list-inside my-2 space-y-1"
          }
        >
          {listItems.map((item, i) => (
            <li key={i} className="text-black font-medium">
              {formatInline(item)}
            </li>
          ))}
        </ListTag>
      );
      listItems = [];
      listType = null;
    }
  };

  const formatInline = (text: string): React.ReactNode => {
    // Handle bold (**text** or __text__)
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const boldRegex = /\*\*(.+?)\*\*|__(.+?)__/g;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      // Add bold text
      parts.push(
        <strong
          key={match.index}
          className="font-black text-[var(--color-primary)]"
        >
          {match[1] || match[2]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Headers
    if (trimmedLine.startsWith("### ")) {
      flushList();
      elements.push(
        <h4
          key={index}
          className="font-black text-black mt-3 mb-1 uppercase"
        >
          {formatInline(trimmedLine.slice(4))}
        </h4>
      );
    } else if (trimmedLine.startsWith("## ")) {
      flushList();
      elements.push(
        <h3
          key={index}
          className="font-black text-lg text-black mt-4 mb-2 uppercase"
        >
          {formatInline(trimmedLine.slice(3))}
        </h3>
      );
    } else if (trimmedLine.startsWith("# ")) {
      flushList();
      elements.push(
        <h2
          key={index}
          className="font-black text-xl text-black mt-4 mb-2 uppercase"
        >
          {formatInline(trimmedLine.slice(2))}
        </h2>
      );
    }
    // Unordered list
    else if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      if (listType !== "ul") {
        flushList();
        listType = "ul";
      }
      listItems.push(trimmedLine.slice(2));
    }
    // Ordered list
    else if (/^\d+\.\s/.test(trimmedLine)) {
      if (listType !== "ol") {
        flushList();
        listType = "ol";
      }
      listItems.push(trimmedLine.replace(/^\d+\.\s/, ""));
    }
    // Empty line
    else if (trimmedLine === "") {
      flushList();
      elements.push(<br key={index} />);
    }
    // Regular paragraph
    else {
      flushList();
      elements.push(
        <p key={index} className="text-black my-1 font-medium">
          {formatInline(trimmedLine)}
        </p>
      );
    }
  });

  flushList();
  return elements;
}

// Min/Max size constraints
const MIN_WIDTH = 320;
const MAX_WIDTH = 800;
const MIN_HEIGHT = 400;
const MAX_HEIGHT = 900;
const DEFAULT_WIDTH = 384; // 96 * 4 = w-96
const DEFAULT_HEIGHT = 500;

export default function AdminChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "안녕하세요! **HRD Survey Pro** 어시스턴트입니다.\n\n설문조사 관리, 결과 분석, 교육과정 설계에 대해 궁금한 점이 있으시면 언제든 물어보세요!\n\n**예시 질문:**\n- 설문 결과 해석 방법이 궁금해요\n- 응답률을 높이려면 어떻게 해야 하나요?\n- 교육 효과 측정 방법을 알려주세요",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [size, setSize] = useState({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
  });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef({ x: 0, y: 0, width: 0, height: 0 });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  // Handle resize mouse events
  const handleResizeStart = useCallback(
    (e: MouseEvent, direction: string) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      setResizeDirection(direction);
      startPosRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
      };
    },
    [size]
  );

  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
      if (!isResizing || !resizeDirection) return;

      const deltaX = startPosRef.current.x - e.clientX;
      const deltaY = startPosRef.current.y - e.clientY;

      let newWidth = startPosRef.current.width;
      let newHeight = startPosRef.current.height;

      // Handle different resize directions
      if (resizeDirection.includes("w")) {
        newWidth = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, startPosRef.current.width + deltaX)
        );
      }
      if (resizeDirection.includes("n")) {
        newHeight = Math.min(
          MAX_HEIGHT,
          Math.max(MIN_HEIGHT, startPosRef.current.height + deltaY)
        );
      }
      if (resizeDirection.includes("e")) {
        newWidth = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, startPosRef.current.width - deltaX)
        );
      }
      if (resizeDirection.includes("s")) {
        newHeight = Math.min(
          MAX_HEIGHT,
          Math.max(MIN_HEIGHT, startPosRef.current.height - deltaY)
        );
      }

      setSize({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor =
        resizeDirection?.includes("n") || resizeDirection?.includes("s")
          ? resizeDirection?.includes("w") || resizeDirection?.includes("e")
            ? "nwse-resize"
            : "ns-resize"
          : "ew-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, resizeDirection]);

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages.slice(-10), // Keep last 10 messages for context
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "응답을 가져오는데 실패했습니다");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.data.message },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter for new line, Enter to submit
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Reset size to default
  const resetSize = () => {
    setSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  };

  return (
    <>
      {/* Chat Button - Brutalist */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 flex items-center justify-center transition-all duration-100 border-3 border-black ${
          isOpen
            ? "bg-gray-400 shadow-none translate-x-[2px] translate-y-[2px]"
            : "bg-[var(--color-secondary)] shadow-[4px_4px_0px_#0a0a0a] hover:shadow-[6px_6px_0px_#0a0a0a] hover:translate-x-[-2px] hover:translate-y-[-2px]"
        }`}
        aria-label={isOpen ? "채팅 닫기" : "AI 어시스턴트"}
      >
        {isOpen ? (
          <svg
            className="w-6 h-6 text-black"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-7 h-7 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}
      </button>

      {/* Chat Window - Brutalist */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          className="fixed bottom-24 right-6 z-50 bg-white border-3 border-black shadow-[8px_8px_0px_#0a0a0a] flex flex-col overflow-hidden animate-fadeIn"
          style={{
            width: `${size.width}px`,
            height: `${size.height}px`,
            maxWidth: "calc(100vw - 3rem)",
            maxHeight: "calc(100vh - 8rem)",
          }}
        >
          {/* Resize Handles */}
          {/* Top-Left Corner */}
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize z-10 hover:bg-[var(--color-primary)]/30"
            onMouseDown={(e) => handleResizeStart(e, "nw")}
          />
          {/* Top Edge */}
          <div
            className="absolute top-0 left-4 right-4 h-2 cursor-ns-resize z-10 hover:bg-[var(--color-primary)]/30"
            onMouseDown={(e) => handleResizeStart(e, "n")}
          />
          {/* Top-Right Corner */}
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize z-10 hover:bg-[var(--color-primary)]/30"
            onMouseDown={(e) => handleResizeStart(e, "ne")}
          />
          {/* Left Edge */}
          <div
            className="absolute top-4 left-0 bottom-4 w-2 cursor-ew-resize z-10 hover:bg-[var(--color-primary)]/30"
            onMouseDown={(e) => handleResizeStart(e, "w")}
          />
          {/* Right Edge */}
          <div
            className="absolute top-4 right-0 bottom-4 w-2 cursor-ew-resize z-10 hover:bg-[var(--color-primary)]/30"
            onMouseDown={(e) => handleResizeStart(e, "e")}
          />
          {/* Bottom-Left Corner */}
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize z-10 hover:bg-[var(--color-primary)]/30"
            onMouseDown={(e) => handleResizeStart(e, "sw")}
          />
          {/* Bottom Edge */}
          <div
            className="absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize z-10 hover:bg-[var(--color-primary)]/30"
            onMouseDown={(e) => handleResizeStart(e, "s")}
          />
          {/* Bottom-Right Corner */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10 hover:bg-[var(--color-primary)]/30"
            onMouseDown={(e) => handleResizeStart(e, "se")}
          />

          {/* Header - Brutalist */}
          <div className="bg-[var(--color-secondary)] px-4 py-3 flex items-center gap-3 border-b-3 border-black">
            <div className="w-10 h-10 bg-white border-2 border-black flex items-center justify-center">
              <span className="text-xl font-black text-black">AI</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-black uppercase">AI 어시스턴트</h3>
              <p className="text-white/70 text-xs font-bold uppercase">HRD Survey Pro</p>
            </div>
            {/* Reset Size Button */}
            <button
              onClick={resetSize}
              className="p-1 bg-white border-2 border-black shadow-[2px_2px_0px_#0a0a0a] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100"
              title="크기 초기화"
            >
              <svg
                className="w-4 h-4 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 bg-white border-2 border-black shadow-[2px_2px_0px_#0a0a0a] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all duration-100"
            >
              <svg
                className="w-5 h-5 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          </div>

          {/* Messages - Brutalist */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 border-2 border-black ${
                    message.role === "user"
                      ? "bg-[var(--color-primary)] text-white shadow-[2px_2px_0px_#0a0a0a]"
                      : "bg-white text-black shadow-[2px_2px_0px_#0a0a0a]"
                  }`}
                >
                  {message.role === "user" ? (
                    <div className="whitespace-pre-wrap font-bold">{message.content}</div>
                  ) : (
                    <div className="text-sm leading-relaxed">
                      {formatMessage(message.content)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border-2 border-black px-4 py-3 shadow-[2px_2px_0px_#0a0a0a]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span
                        className="w-2 h-2 bg-[var(--color-primary)] animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-[var(--color-primary)] animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      />
                      <span
                        className="w-2 h-2 bg-[var(--color-primary)] animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      />
                    </div>
                    <span className="text-sm font-bold text-black uppercase">생각 중...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input - Brutalist */}
          <div className="p-3 border-t-3 border-black bg-white">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="메시지를 입력하세요..."
                className="flex-1 resize-none border-3 border-black px-4 py-2 text-sm font-medium focus:outline-none focus:shadow-[2px_2px_0px_#0a0a0a] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all duration-100 max-h-[120px] min-h-[40px]"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 bg-[var(--color-primary)] text-white flex items-center justify-center border-3 border-black shadow-[2px_2px_0px_#0a0a0a] hover:shadow-[4px_4px_0px_#0a0a0a] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0 transition-all duration-100 flex-shrink-0"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={3}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
            <p className="text-xs font-bold text-gray-500 mt-1 text-center uppercase">
              Enter 전송 · Shift+Enter 줄바꿈
            </p>
          </div>
        </div>
      )}
    </>
  );
}
