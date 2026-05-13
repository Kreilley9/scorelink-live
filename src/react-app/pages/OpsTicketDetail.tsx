import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";

interface Message {
  message_id: number;
  direction: string;
  content: string;
  created_at: string;
}

interface DraftResponse {
  response_id: number;
  response_body: string;
  confidence_score: number;
  flags: string | null;
  is_sent: boolean;
}

interface TicketDetail {
  ticket_id: number;
  summary: string;
  category_name: string;
  severity: string;
  status: string;
  created_at: string;
}

export default function OpsTicketDetail() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchTicketData = async () => {
    try {
      const response = await fetch(`/api/ops/support/tickets/${ticketId}`);
      const data = await response.json();
      if (data.ok) {
        setTicket(data.data.ticket);
        setMessages(data.data.messages);
        setDraft(data.data.draft);
      }
    } catch (error) {
      console.error("Failed to fetch ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicketData();
  }, [ticketId]);

  const handleApproveAndSend = async () => {
    if (!draft) return;
    
    setSending(true);
    try {
      const response = await fetch(`/api/ops/support/tickets/${ticketId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_id: draft.response_id })
      });
      
      const data = await response.json();
      if (data.ok) {
        alert("Message sent successfully");
        fetchTicketData();
      } else {
        alert(`Failed to send: ${data.message}`);
      }
    } catch (error) {
      console.error("Failed to send:", error);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const response = await fetch(`/api/ops/support/tickets/${ticketId}/draft-response`, {
        method: "POST"
      });
      
      const data = await response.json();
      if (data.ok) {
        fetchTicketData();
      } else {
        alert(`Failed to regenerate: ${data.message}`);
      }
    } catch (error) {
      console.error("Failed to regenerate:", error);
      alert("Failed to regenerate draft");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => navigate("/ops/support")} className="mb-4">
            ← Back to Tickets
          </Button>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <Button onClick={() => navigate("/ops/support")} className="mb-4">
            ← Back to Tickets
          </Button>
          <p>Ticket not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <Button onClick={() => navigate("/ops/support")} className="mb-4">
          ← Back to Tickets
        </Button>

        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">Ticket #{ticket.ticket_id}</h1>
          <p className="text-lg mb-4">{ticket.summary}</p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>Category: {ticket.category_name}</span>
            <span>Severity: {ticket.severity}</span>
            <span>Status: {ticket.status}</span>
            <span>Created: {new Date(ticket.created_at).toLocaleString()}</span>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Conversation</h2>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.message_id}
                className={`p-4 rounded-lg ${
                  msg.direction === "inbound"
                    ? "bg-blue-500/10 border-l-4 border-blue-500"
                    : "bg-green-500/10 border-l-4 border-green-500"
                }`}
              >
                <div className="text-sm text-muted-foreground mb-2">
                  {msg.direction === "inbound" ? "Customer" : "Support"} • {new Date(msg.created_at).toLocaleString()}
                </div>
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            ))}
          </div>
        </div>

        {draft && (
          <div className="bg-card rounded-lg border border-border p-6">
            <h2 className="text-xl font-bold mb-4">Draft Response</h2>
            
            <div className="mb-4 flex gap-2">
              <span className="text-sm text-muted-foreground">
                Confidence: {(draft.confidence_score * 100).toFixed(0)}%
              </span>
              {draft.flags && (
                <span className="px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-500">
                  Flags: {draft.flags}
                </span>
              )}
              {draft.is_sent && (
                <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-500">
                  Sent
                </span>
              )}
            </div>

            <div className="p-4 bg-muted rounded-lg mb-4">
              <p className="whitespace-pre-wrap">{draft.response_body}</p>
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleApproveAndSend}
                disabled={draft.is_sent || sending}
                className="bg-green-600 hover:bg-green-700"
              >
                {sending ? "Sending..." : "Approve & Send"}
              </Button>
              <Button
                onClick={handleRegenerate}
                disabled={regenerating}
                variant="outline"
              >
                {regenerating ? "Regenerating..." : "Regenerate Draft"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
