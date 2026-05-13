import { useEffect, useState } from "react";
import { Button } from "@/react-app/components/ui/button";

interface ApprovalRequest {
  approval_request_id: number;
  workflow_run_id: number;
  request_type: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

export default function OpsApprovals() {
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApprovals = async () => {
    try {
      const response = await fetch("/api/ops/approvals");
      const data = await response.json();
      if (data.ok) {
        setApprovals(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleApprove = async (approvalId: number) => {
    try {
      const response = await fetch(`/api/ops/approvals/${approvalId}/approve`, {
        method: "POST"
      });
      
      const data = await response.json();
      if (data.ok) {
        alert("Approved successfully");
        fetchApprovals();
      } else {
        alert(`Failed to approve: ${data.message}`);
      }
    } catch (error) {
      console.error("Failed to approve:", error);
      alert("Failed to approve");
    }
  };

  const handleReject = async (approvalId: number) => {
    try {
      const response = await fetch(`/api/ops/approvals/${approvalId}/reject`, {
        method: "POST"
      });
      
      const data = await response.json();
      if (data.ok) {
        alert("Rejected successfully");
        fetchApprovals();
      } else {
        alert(`Failed to reject: ${data.message}`);
      }
    } catch (error) {
      console.error("Failed to reject:", error);
      alert("Failed to reject");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Approval Requests</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Approval Requests</h1>
        
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div key={approval.approval_request_id} className="bg-card rounded-lg border border-border p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold">{approval.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    Type: {approval.request_type} • Created: {new Date(approval.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded text-sm ${
                  approval.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                  approval.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                  'bg-red-500/20 text-red-500'
                }`}>
                  {approval.status}
                </span>
              </div>

              <div className="mb-4 p-4 bg-muted rounded-lg">
                <p className="whitespace-pre-wrap text-sm">{approval.description}</p>
              </div>

              {approval.status === 'pending' && (
                <div className="flex gap-4">
                  <Button
                    onClick={() => handleApprove(approval.approval_request_id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(approval.approval_request_id)}
                    variant="destructive"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          ))}

          {approvals.length === 0 && (
            <div className="bg-card rounded-lg border border-border p-8 text-center text-muted-foreground">
              No pending approvals
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
