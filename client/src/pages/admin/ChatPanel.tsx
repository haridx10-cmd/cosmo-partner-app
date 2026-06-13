import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

interface Employee {
  id: number;
  name: string;
  role: string;
  isOnline: boolean;
}

interface Message {
  id: number;
  senderId: number;
  recipientId: number | null;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName: string | null;
}

export default function ChatPanel() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/admin/employees"],
    queryFn: async () => {
      const res = await fetch("/api/admin/employees");
      return res.json();
    },
  });

  const nonAdminEmployees = employees.filter(e => e.role !== "admin");

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ["/api/chat/messages", selectedEmpId],
    queryFn: async () => {
      if (!selectedEmpId) return [];
      const res = await fetch(`/api/chat/messages?withId=${selectedEmpId}`);
      return res.json();
    },
    enabled: !!selectedEmpId,
    refetchInterval: 5000,
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, recipientId: selectedEmpId }),
      });
      if (!res.ok) throw new Error("Failed to send");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/chat/messages", selectedEmpId] });
    },
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // SSE for real-time updates
  useEffect(() => {
    const es = new EventSource("/api/chat/stream");
    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "message") {
        qc.invalidateQueries({ queryKey: ["/api/chat/messages", selectedEmpId] });
      }
    };
    return () => es.close();
  }, [selectedEmpId, qc]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || !selectedEmpId) return;
    setInput("");
    sendMutation.mutate(trimmed);
  };

  return (
    <div className="flex h-[600px] border rounded-lg overflow-hidden">
      {/* Sidebar: employee list */}
      <div className="w-48 border-r bg-gray-50 flex flex-col">
        <div className="p-3 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Beauticians
        </div>
        <div className="flex-1 overflow-y-auto">
          {nonAdminEmployees.map(emp => (
            <button
              key={emp.id}
              onClick={() => setSelectedEmpId(emp.id)}
              className={`w-full text-left px-3 py-2.5 text-sm hover:bg-white transition-colors ${selectedEmpId === emp.id ? "bg-white border-r-2 border-r-primary font-medium" : ""}`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${emp.isOnline ? "bg-green-500" : "bg-gray-300"}`} />
                <span className="truncate">{emp.name}</span>
              </div>
            </button>
          ))}
          {nonAdminEmployees.length === 0 && (
            <p className="p-3 text-xs text-muted-foreground">No employees</p>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedEmpId ? (
          <>
            <div className="p-3 border-b bg-white text-sm font-medium">
              {employees.find(e => e.id === selectedEmpId)?.name}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map(msg => {
                const isMine = msg.senderId === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white border rounded-bl-sm"}`}>
                      {!isMine && <p className="text-xs font-medium mb-0.5 text-muted-foreground">{msg.senderName}</p>}
                      <p>{msg.content}</p>
                      <p className={`text-xs mt-0.5 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {format(new Date(msg.createdAt), "h:mm a")}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
            <div className="p-3 border-t bg-white flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={e => e.key === "Enter" && handleSend()}
                className="flex-1"
              />
              <Button size="sm" onClick={handleSend} disabled={!input.trim() || sendMutation.isPending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
            Select a beautician to chat
          </div>
        )}
      </div>
    </div>
  );
}
