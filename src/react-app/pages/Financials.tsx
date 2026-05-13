import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { ArrowLeft, DollarSign, TrendingUp, Users, Calendar, LogOut } from "lucide-react";
import { useAuth } from "@getmocha/users-service/react";
import Footer from "@/react-app/components/Footer";

interface FinancialData {
  totalRevenue: number;
  revenueByTier: {
    tier: string;
    customers: number;
    fields: number;
    revenue: number;
  }[];
  monthlyData: {
    month: string;
    new_customers: number;
    fields: number;
  }[];
  totalCustomers: number;
}

export default function Financials() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancials();
  }, []);

  const fetchFinancials = async () => {
    try {
      const res = await fetch("/api/analytics/financials");
      if (res.ok) {
        const financialData = await res.json();
        setData(financialData);
      }
    } catch (error) {
      console.error("Failed to fetch financials:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "premium":
        return "from-amber-500 to-amber-600";
      case "standard":
        return "from-primary to-primary/90";
      case "basic":
      case "free":
        return "from-slate-600 to-slate-700";
      default:
        return "from-slate-500 to-slate-600";
    }
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case "premium":
        return "Premium";
      case "standard":
        return "Standard";
      case "basic":
        return "Basic";
      case "free":
        return "Free";
      default:
        return tier;
    }
  };

  const getTierPricing = (tier: string) => {
    switch (tier) {
      case "premium":
        return "$349/mo or $299/yr";
      case "standard":
        return "$99/mo or $79/yr";
      case "basic":
      case "free":
        return "Free";
      default:
        return "-";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation Header */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-lg border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="https://019d10b5-13db-77bf-8d2c-806760d8fabe.mochausercontent.com/Logo-No-Background-cropped2.png" 
                alt="ScoreLink LIVE"
                className="h-14"
              />
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate("/dashboard")}
                variant="ghost"
                className="text-slate-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <Button
                onClick={logout}
                variant="outline"
                className="gap-2 border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 md:pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2">
            Financial Analytics
          </h1>
          <p className="text-slate-400">
            Revenue breakdown and subscription insights
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <SummaryCard
                icon={<DollarSign className="w-6 h-6" />}
                label="Total Revenue"
                value={`$${data.totalRevenue.toLocaleString()}`}
                color="green"
              />
              <SummaryCard
                icon={<Users className="w-6 h-6" />}
                label="Total Customers"
                value={data.totalCustomers}
                color="primary"
              />
              <SummaryCard
                icon={<TrendingUp className="w-6 h-6" />}
                label="Avg Revenue/Customer"
                value={`$${data.totalCustomers > 0 ? Math.round(data.totalRevenue / data.totalCustomers) : 0}`}
                color="primary"
              />
            </div>

            {/* Revenue by Tier */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Revenue by Subscription Tier</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {data.revenueByTier.map((tier) => (
                  <div
                    key={tier.tier}
                    className={`bg-gradient-to-br ${getTierColor(tier.tier)} rounded-xl p-6 text-white`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-black uppercase">{getTierLabel(tier.tier)}</h3>
                      <span className="text-sm opacity-80">{getTierPricing(tier.tier)}</span>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm opacity-80">Revenue</p>
                        <p className="text-2xl font-bold">${tier.revenue.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="opacity-80">Customers:</span>
                        <span className="font-semibold">{tier.customers}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="opacity-80">Total Fields:</span>
                        <span className="font-semibold">{tier.fields}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Monthly Growth */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Recent Monthly Activity
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Month</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">New Customers</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Fields Added</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.monthlyData.map((month: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-white font-medium">{month.month}</td>
                        <td className="py-3 px-4 text-right text-white">{month.new_customers}</td>
                        <td className="py-3 px-4 text-right text-white">{month.fields}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-400">Failed to load financial data</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "green" | "primary";
}) {
  const colors = {
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    primary: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <div className={`rounded-xl border p-6 ${colors[color]}`}>
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-sm opacity-80">{label}</span>
      </div>
      <p className="text-4xl font-black text-white">{value}</p>
    </div>
  );
}
