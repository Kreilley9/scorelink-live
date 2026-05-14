import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { ArrowLeft, Trophy, Users, TrendingUp, Activity, LogOut } from "lucide-react";
import { SportIcon } from "@/react-app/utils/sportIcons";
import { useAuth } from "@/react-app/hooks/useAuth";
import Footer from "@/react-app/components/Footer";

interface StatisticsData {
  gamesBySport: {
    sport_type: string;
    total: number;
    active: number;
    scheduled: number;
    completed: number;
  }[];
  subscriptionsByTier: {
    subscription_tier: string;
    count: number;
  }[];
  totals: {
    total_coordinators: number;
    total_referees: number;
    total_games: number;
    total_sponsors: number;
    total_fields: number;
  };
  recentActivity: {
    date: string;
    games_created: number;
  }[];
}

export default function Statistics() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [data, setData] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const res = await fetch("/api/analytics/statistics");
      if (res.ok) {
        const stats = await res.json();
        setData(stats);
      }
    } catch (error) {
      console.error("Failed to fetch statistics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getSportLabel = (sportType: string) => {
    const labels: { [key: string]: string } = {
      flag_football: "Flag Football",
      tackle_football: "Tackle Football",
      basketball: "Basketball",
      baseball_softball: "Baseball / Softball",
      soccer: "Soccer",
      field_hockey: "Field Hockey",
      lacrosse: "Lacrosse",
      tennis: "Tennis",
    };
    return labels[sportType] || sportType;
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
            Usage Statistics
          </h1>
          <p className="text-slate-400">
            Platform-wide activity and insights
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Platform Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <OverviewCard
                icon={<Users className="w-5 h-5" />}
                label="Coordinators"
                value={data.totals.total_coordinators}
                color="primary"
              />
              <OverviewCard
                icon={<Users className="w-5 h-5" />}
                label="Referees"
                value={data.totals.total_referees}
                color="primary"
              />
              <OverviewCard
                icon={<Trophy className="w-5 h-5" />}
                label="Total Games"
                value={data.totals.total_games}
                color="green"
              />
              <OverviewCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Sponsors"
                value={data.totals.total_sponsors}
                color="primary"
              />
              <OverviewCard
                icon={<Activity className="w-5 h-5" />}
                label="Total Fields"
                value={data.totals.total_fields}
                color="cyan"
              />
            </div>

            {/* Games by Sport Type */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Games by Sport Type</h2>
              <div className="space-y-4">
                {data.gamesBySport.map((sport) => (
                  <div
                    key={sport.sport_type}
                    className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <SportIcon sportId={sport.sport_type} className="w-6 h-6 text-primary" />
                        <h3 className="text-lg font-semibold text-white">
                          {getSportLabel(sport.sport_type)}
                        </h3>
                      </div>
                      <span className="text-2xl font-bold text-white">{sport.total}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-2 bg-green-500/10 rounded border border-green-500/20">
                        <p className="text-sm text-green-400">Active</p>
                        <p className="text-lg font-bold text-white">{sport.active}</p>
                      </div>
                      <div className="text-center p-2 bg-amber-500/10 rounded border border-amber-500/20">
                        <p className="text-sm text-primary">Scheduled</p>
                        <p className="text-lg font-bold text-white">{sport.scheduled}</p>
                      </div>
                      <div className="text-center p-2 bg-primary/10 rounded border border-primary/20">
                        <p className="text-sm text-primary">Completed</p>
                        <p className="text-lg font-bold text-white">{sport.completed}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Subscription Distribution */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Subscription Distribution</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {data.subscriptionsByTier.map((tier) => {
                  const tierColors = {
                    premium: "from-amber-500 to-amber-600",
                    standard: "from-primary to-primary/90",
                    basic: "from-slate-600 to-slate-700",
                    free: "from-slate-600 to-slate-700",
                  };
                  const color = tierColors[tier.subscription_tier as keyof typeof tierColors] || "from-slate-500 to-slate-600";

                  return (
                    <div
                      key={tier.subscription_tier}
                      className={`bg-gradient-to-br ${color} rounded-xl p-6 text-white`}
                    >
                      <h3 className="text-lg font-semibold uppercase mb-2 opacity-90">
                        {tier.subscription_tier}
                      </h3>
                      <p className="text-4xl font-black">{tier.count}</p>
                      <p className="text-sm opacity-80 mt-1">customers</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Recent Activity (Last 30 Days)</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                      <th className="text-right py-3 px-4 text-slate-400 font-medium">Games Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentActivity.map((activity: any, idx: number) => (
                      <tr key={idx} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-white">{new Date(activity.date).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right text-white font-semibold">{activity.games_created}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.recentActivity.length === 0 && (
                  <tr>
                    <td colSpan={2} className="text-center py-8 text-slate-400">
                      No activity in the last 30 days
                    </td>
                  </tr>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-slate-400">Failed to load statistics</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

function OverviewCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "primary" | "green" | "cyan";
}) {
  const colors = {
    primary: "bg-primary/10 text-primary border-primary/20",
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };

  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs opacity-80">{label}</span>
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
    </div>
  );
}
