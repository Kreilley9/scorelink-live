import { useEffect, useState } from "react";

interface FinanceAlert {
  alert_id: number;
  customer_account_id: number;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
}

export default function OpsFinance() {
  const [alerts, setAlerts] = useState<FinanceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch("/api/ops/finance/alerts");
        const data = await response.json();
        if (data.ok) {
          setAlerts(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch alerts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Finance Alerts</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Finance Alerts</h1>
        
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Alert ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Account ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Severity</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert) => (
                <tr key={alert.alert_id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm">{alert.alert_id}</td>
                  <td className="px-4 py-3 text-sm">{alert.customer_account_id}</td>
                  <td className="px-4 py-3 text-sm">{alert.alert_type}</td>
                  <td className="px-4 py-3 text-sm">{alert.title}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      alert.severity === 'high' ? 'bg-red-500/20 text-red-500' :
                      alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-500' :
                      'bg-green-500/20 text-green-500'
                    }`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${
                      alert.status === 'open' ? 'bg-blue-500/20 text-blue-500' :
                      'bg-gray-500/20 text-gray-500'
                    }`}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">{new Date(alert.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {alerts.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              No open finance alerts
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
