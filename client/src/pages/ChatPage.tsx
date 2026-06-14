import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Send } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

interface Message {
  id: number;
  senderId: number;
  recipientId: number | null;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName: string | null;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/chat/messages"],
    queryFn: async () => {
      const res = await fetch("/api/chat/messages");
      if (!res.ok) throw new Error("Failed to fetch messages");
      return res.json();
    },
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const es = new EventSource("/api/chat/stream");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "message") {
        qc.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      }
    };
    return () => es.close();
  }, [qc]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setInput("");
    sendMutation.mutate(trimmed);
  };

  return (
    // pb-16 accounts for the fixed 64px bottom nav so the input bar is never covered
    <div className="flex flex-col bg-gray-50" style={{ height: "calc(100dvh - 64px)" }}>
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/menu")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-bold text-lg">Chat with Admin</h1>
          <p className="text-xs text-muted-foreground">Messages are private</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm mt-8">No messages yet. Say hi! 👋</p>
        )}
        {messages.map(msg => {
          const isMine = msg.senderId === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white border shadow-sm rounded-bl-sm"}`}>
                {!isMine && <p className="text-xs font-semibold mb-0.5 text-muted-foreground">{msg.senderName ?? "Admin"}</p>}
                <p>{msg.content}</p>
                <p className={`text-xs mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {format(new Date(msg.createdAt), "h:mm a")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar — sits just above the bottom nav */}
      <div className="p-3 border-t bg-white flex gap-2 flex-shrink-0">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Message admin..."
          onKeyDown={e => e.key === "Enter" && !sendMutation.isPending && handleSend()}
          className="flex-1"
          autoComplete="off"
        />
        <Button size="sm" onClick={handleSend} disabled={!input.trim() || sendMutation.isPending}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
