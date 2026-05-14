import { useAuth } from "@/react-app/hooks/useAuth";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Alert, AlertDescription } from "@/react-app/components/ui/alert";
import { Calendar, Link2, QrCode, Download, Upload, Trash2, X, ArrowLeft, Copy, MessageSquare, AlertTriangle } from "lucide-react";
import QRCode from "qrcode";
import * as XLSX from "xlsx";

interface Game {
  id: number;
  game_code: string;
  home_team: string;
  away_team: string;
  scheduled_date?: string;
  scheduled_time?: string;
  field_location?: string;
  status: string;
  created_at: string;
  sport_type?: string;
  referees?: { id: number; name: string; phone_number?: string }[];
}

interface Referee {
  id: number;
  name: string;
  phone_number: string;
}

interface Sponsor {
  id: number;
  name: string;
  package_type: string;
}

interface Field {
  id: number;
  name: string;
  status: string;
}

type ViewMode = "list" | "form" | "qr";

export default function GameSchedule() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userSportType, setUserSportType] = useState<string>("flag_football");
  const [userTemplate, setUserTemplate] = useState<{ game_length_minutes?: number } | null>(null);
  
  // View state - simple switch between list, form, and QR views
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [qrGame, setQrGame] = useState<Game | null>(null);
  const [linkShareGame, setLinkShareGame] = useState<Game | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    home_team: "",
    away_team: "",
    scheduled_date: "",
    scheduled_time: "",
    field_id: "" as string | number,
    referee_ids: [] as number[],
    sponsor_ids: [] as number[],
  });

  const [uploadMessage, setUploadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.role === "admin" || data.role === "coordinator");
          if (data.sport_type) setUserSportType(data.sport_type);
          if (data.template_config) setUserTemplate(data.template_config);
          if (data.role !== "admin" && data.role !== "coordinator") {
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Failed to check user:", error);
      }
    };
    if (user) checkAdmin();
  }, [user, navigate]);

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin]);

  const fetchData = async () => {
    try {
      const [gamesRes, refereesRes, sponsorsRes, fieldsRes] = await Promise.all([
        fetch("/api/games/all"),
        fetch("/api/referees"),
        fetch("/api/sponsors"),
        fetch("/api/fields"),
      ]);

      if (gamesRes.ok) setGames(await gamesRes.json());
      if (refereesRes.ok) setReferees(await refereesRes.json());
      if (sponsorsRes.ok) setSponsors(await sponsorsRes.json());
      if (fieldsRes.ok) {
        const fieldsData = await fieldsRes.json();
        setFields(fieldsData.fields || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      home_team: "",
      away_team: "",
      scheduled_date: "",
      scheduled_time: "",
      field_id: "",
      referee_ids: [],
      sponsor_ids: [],
    });
    setEditingGame(null);
  };

  const openNewGameForm = () => {
    resetForm();
    setViewMode("form");
  };

  const openEditForm = async (game: Game) => {
    // Fetch game sponsors
    let gameSponsorIds: number[] = [];
    try {
      const response = await fetch(`/api/games/${game.id}/sponsors`);
      if (response.ok) {
        const sponsorData = await response.json();
        gameSponsorIds = sponsorData.map((s: { id: number }) => s.id);
      }
    } catch (error) {
      console.error("Failed to fetch sponsors:", error);
    }

    setFormData({
      home_team: game.home_team,
      away_team: game.away_team,
      scheduled_date: game.scheduled_date || "",
      scheduled_time: game.scheduled_time || "",
      field_id: (game as any).field_id || "",
      referee_ids: game.referees?.map(r => r.id) || [],
      sponsor_ids: gameSponsorIds,
    });
    setEditingGame(game);
    setViewMode("form");
  };

  const openQR = (game: Game) => {
    setQrGame(game);
    setViewMode("qr");
  };

  const backToList = () => {
    setViewMode("list");
    setQrGame(null);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingGame ? `/api/games/${editingGame.id}` : "/api/games/schedule";
      const method = editingGame ? "PATCH" : "POST";

      // Get field name for field_location
      const selectedField = fields.find(f => f.id === Number(formData.field_id));
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_team: formData.home_team,
          away_team: formData.away_team,
          scheduled_date: formData.scheduled_date,
          scheduled_time: formData.scheduled_time,
          field_id: formData.field_id ? Number(formData.field_id) : null,
          field_location: selectedField?.name || "",
          referee_ids: formData.referee_ids,
          sport_type: userSportType,
          time_remaining: (userTemplate?.game_length_minutes || 20) * 60,
        }),
      });

      if (response.ok) {
        const gameData = await response.json();
        
        // Handle sponsors
        if (formData.sponsor_ids.length > 0) {
          for (const sponsorId of formData.sponsor_ids) {
            await fetch(`/api/games/${gameData.id}/sponsors/${sponsorId}`, { method: "POST" });
          }
        }

        await fetchData();
        backToList();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to save game:", error);
      alert("Failed to save game");
    }
  };

  const handleDelete = async (game: Game) => {
    if (!confirm(`Delete "${game.home_team} vs ${game.away_team}"?`)) return;

    try {
      const response = await fetch(`/api/games/${game.id}`, { method: "DELETE" });
      if (response.ok) {
        await fetchData();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to delete:", error);
      alert("Failed to delete game");
    }
  };

  const handleShareLink = (game: Game) => {
    setLinkShareGame(game);
    setCopySuccess(false);
  };

  const closeShareLink = () => {
    setLinkShareGame(null);
    setCopySuccess(false);
  };

  const copyRefereeLink = () => {
    if (!linkShareGame) return;
    const link = `${window.location.origin}/referee/${linkShareGame.game_code}`;
    navigator.clipboard.writeText(link);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const sendViaSMS = () => {
    if (!linkShareGame || !linkShareGame.referees?.[0]?.phone_number) return;
    const link = `${window.location.origin}/referee/${linkShareGame.game_code}`;
    const message = `Your game: ${linkShareGame.home_team} vs ${linkShareGame.away_team}. Control the scoreboard: ${link}`;
    const smsLink = `sms:${linkShareGame.referees[0].phone_number}${navigator.userAgent.includes('iPhone') ? '&' : '?'}body=${encodeURIComponent(message)}`;
    window.location.href = smsLink;
  };

  const downloadTemplate = () => {
    const templateData = [{
      'Home Team': 'Team A',
      'Away Team': 'Team B',
      'Date (YYYY-MM-DD)': '2024-01-15',
      'Time (HH:MM)': '14:30',
      'Field': 'Field 1',
      'Referee Name': referees[0]?.name || 'John Doe',
    }];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Games");
    XLSX.writeFile(workbook, "game_schedule_template.xlsx");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadMessage(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, string>>;

      let successCount = 0;
      for (const row of jsonData) {
        if (!row['Home Team'] || !row['Away Team']) continue;

        const referee = referees.find(r => r.name.toLowerCase() === row['Referee Name']?.toLowerCase());

        const response = await fetch("/api/games/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            home_team: row['Home Team'],
            away_team: row['Away Team'],
            scheduled_date: row['Date (YYYY-MM-DD)'] || '',
            scheduled_time: row['Time (HH:MM)'] || '',
            field_location: row['Field'] || '',
            referee_ids: referee ? [referee.id] : [],
            sport_type: userSportType,
            time_remaining: (userTemplate?.game_length_minutes || 20) * 60,
          }),
        });

        if (response.ok) successCount++;
      }

      if (successCount > 0) {
        await fetchData();
        setUploadMessage({ type: "success", text: `Imported ${successCount} game(s)` });
      }
    } catch (error) {
      setUploadMessage({ type: "error", text: "Failed to process file" });
    }

    event.target.value = '';
  };

  const toggleReferee = (id: number) => {
    setFormData(prev => ({
      ...prev,
      referee_ids: prev.referee_ids.includes(id)
        ? prev.referee_ids.filter(r => r !== id)
        : [...prev.referee_ids, id]
    }));
  };

  const toggleSponsor = (id: number) => {
    setFormData(prev => ({
      ...prev,
      sponsor_ids: prev.sponsor_ids.includes(id)
        ? prev.sponsor_ids.filter(s => s !== id)
        : [...prev.sponsor_ids, id]
    }));
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400"></div>
          <p className="mt-4 text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-white">Sign in required</h1>
          <Button onClick={redirectToLogin}>Sign in with Google</Button>
        </div>
      </div>
    );
  }

  // Link Share View
  if (linkShareGame) {
    const refereeLink = `${window.location.origin}/referee/${linkShareGame.game_code}`;
    const hasRefereeInfo = linkShareGame.referees && linkShareGame.referees.length > 0;
    const hasPhoneNumber = linkShareGame.referees?.[0]?.phone_number;

    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-2xl mx-auto">
          <Button variant="outline" onClick={closeShareLink} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Games
          </Button>

          <div className="bg-slate-900 rounded-lg border border-slate-800 p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Share Referee Link</h2>

            <div className="mb-6">
              <div className="text-sm text-slate-400 mb-2">Game</div>
              <div className="text-xl text-white font-bold">
                {linkShareGame.home_team} vs {linkShareGame.away_team}
              </div>
              {hasRefereeInfo && (
                <div className="text-sm text-slate-400 mt-1">
                  {linkShareGame.referees?.map(r => r.name).join(", ")}
                </div>
              )}
            </div>

            {/* Security Warning */}
            <Alert className="mb-6 bg-amber-500/10 border-amber-500/30 text-amber-400">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <AlertDescription className="text-amber-300 font-medium ml-2">
                This link provides access to control the game. Only share this link with official personnel.
              </AlertDescription>
            </Alert>

            {/* Copyable Link */}
            <div className="mb-6">
              <div className="text-sm text-slate-400 mb-2">Referee Control Link</div>
              <div className="flex gap-2">
                <Input
                  value={refereeLink}
                  readOnly
                  className="bg-slate-800 border-slate-700 text-white font-mono text-sm"
                />
                <Button onClick={copyRefereeLink} className="bg-amber-500 hover:bg-amber-600 text-slate-950">
                  <Copy className="w-4 h-4 mr-2" />
                  {copySuccess ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Share this link with your referee via text, email, or any messaging app
              </p>
            </div>

            {/* Text Message Option - Only for Premium users with referee database */}
            {hasRefereeInfo && hasPhoneNumber && (
              <div className="border-t border-slate-700 pt-6">
                <Button
                  onClick={sendViaSMS}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Text Link to {linkShareGame.referees?.[0]?.name}
                </Button>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Opens your messaging app with the link pre-filled
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // QR Code View
  if (viewMode === "qr" && qrGame) {
    return (
      <div className="min-h-screen bg-slate-950 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-md mx-auto pb-8">
          <Button variant="outline" onClick={backToList} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Games
          </Button>
          
          <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 md:p-6">
            <div className="text-center mb-6">
              <QrCode className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h2 className="text-xl font-bold text-white">QR Code</h2>
              <p className="text-amber-400 font-mono text-lg">{qrGame.game_code}</p>
              <p className="text-slate-300">{qrGame.home_team} vs {qrGame.away_team}</p>
            </div>

            <QRCanvas gameCode={qrGame.game_code} />
            
            <div className="mt-4 p-3 bg-slate-800/50 rounded">
              <p className="text-slate-400 text-xs mb-1">Scoreboard Link</p>
              <p className="text-slate-300 text-sm break-all font-mono">
                {window.location.origin}/game/{qrGame.game_code}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/game/${qrGame.game_code}`);
                  alert("Link copied!");
                }}
              >
                Copy Link
              </Button>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-slate-950"
                onClick={() => navigate(`/game/${qrGame.game_code}`)}
              >
                View Scoreboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Form View (Add/Edit)
  if (viewMode === "form") {
    return (
      <div className="min-h-screen bg-slate-950 p-8">
        <div className="max-w-2xl mx-auto">
          <Button variant="outline" onClick={backToList} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Games
          </Button>

          <div className="bg-slate-900 rounded-lg border border-slate-800 p-6">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingGame ? "Edit Game" : "Schedule New Game"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Home Team *</label>
                  <Input
                    value={formData.home_team}
                    onChange={(e) => setFormData({ ...formData, home_team: e.target.value })}
                    placeholder="Home team"
                    required
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Away Team *</label>
                  <Input
                    value={formData.away_team}
                    onChange={(e) => setFormData({ ...formData, away_team: e.target.value })}
                    placeholder="Away team"
                    required
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Date</label>
                  <Input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-400 block mb-1">Time</label>
                  <Input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">Field *</label>
                {fields.filter(f => f.status !== 'expired').length === 0 ? (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded p-3">
                    <p className="text-amber-400 text-sm">No fields available. Create a field first in Field Management.</p>
                  </div>
                ) : (
                  <select
                    value={formData.field_id}
                    onChange={(e) => setFormData({ ...formData, field_id: e.target.value })}
                    required
                    className="w-full bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select a field...</option>
                    {fields.filter(f => f.status !== 'expired').map((field) => (
                      <option key={field.id} value={field.id}>
                        {field.name} {field.status === 'active' ? '(Active)' : '(Pending)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">Referees</label>
                <div className="bg-slate-800/30 border border-slate-700 rounded p-3 max-h-32 overflow-y-auto">
                  {referees.length === 0 ? (
                    <p className="text-slate-500 text-sm">No referees available</p>
                  ) : (
                    referees.map((ref) => (
                      <label key={ref.id} className="flex items-center gap-2 p-1 cursor-pointer hover:bg-slate-700/30 rounded">
                        <input
                          type="checkbox"
                          checked={formData.referee_ids.includes(ref.id)}
                          onChange={() => toggleReferee(ref.id)}
                          className="rounded"
                        />
                        <span className="text-slate-300 text-sm">{ref.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">Sponsors</label>
                <div className="bg-slate-800/30 border border-slate-700 rounded p-3 max-h-32 overflow-y-auto">
                  {sponsors.length === 0 ? (
                    <p className="text-slate-500 text-sm">No sponsors available</p>
                  ) : (
                    sponsors.map((sponsor) => (
                      <label key={sponsor.id} className="flex items-center gap-2 p-1 cursor-pointer hover:bg-slate-700/30 rounded">
                        <input
                          type="checkbox"
                          checked={formData.sponsor_ids.includes(sponsor.id)}
                          onChange={() => toggleSponsor(sponsor.id)}
                          className="rounded"
                        />
                        <span className="text-slate-300 text-sm">{sponsor.name}</span>
                        <span className="text-xs text-slate-500">({sponsor.package_type})</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={backToList}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-amber-500 hover:bg-amber-600 text-slate-950">
                  {editingGame ? "Update Game" : "Schedule Game"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // List View (default)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Game Schedule</h1>
            <p className="text-slate-400">Manage scheduled games and referee assignments</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            Back to Home
          </Button>
        </div>

        {/* Action Buttons */}
        <div className="mb-6 flex gap-4 flex-wrap">
          <Button onClick={openNewGameForm} className="bg-amber-500 hover:bg-amber-600 text-slate-950">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Game
          </Button>

          <Button variant="outline" onClick={downloadTemplate} className="border-sky-500 text-sky-400 hover:bg-sky-500/10">
            <Download className="w-4 h-4 mr-2" />
            Download Template
          </Button>

          <label className="inline-block cursor-pointer">
            <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
            <span className="inline-flex items-center gap-2 px-4 py-2 border border-green-500 text-green-400 hover:bg-green-500/10 rounded-md cursor-pointer">
              <Upload className="w-4 h-4" />
              Upload Schedule
            </span>
          </label>
        </div>

        {/* Upload Messages */}
        {uploadMessage && (
          <div className={`mb-4 p-4 rounded-lg ${uploadMessage.type === "success" ? "bg-green-500/20 border border-green-500 text-green-400" : "bg-red-500/20 border border-red-500 text-red-400"}`}>
            {uploadMessage.text}
            <button onClick={() => setUploadMessage(null)} className="ml-2">
              <X className="w-4 h-4 inline" />
            </button>
          </div>
        )}

        {/* Games Table - Desktop */}
        <div className="hidden lg:block bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="text-left px-4 py-3 text-amber-400 text-sm font-medium">Code</th>
                <th className="text-left px-4 py-3 text-amber-400 text-sm font-medium">Teams</th>
                <th className="text-left px-4 py-3 text-amber-400 text-sm font-medium">Date/Time</th>
                <th className="text-left px-4 py-3 text-amber-400 text-sm font-medium">Field</th>
                <th className="text-left px-4 py-3 text-amber-400 text-sm font-medium">Referee</th>
                <th className="text-left px-4 py-3 text-amber-400 text-sm font-medium">Status</th>
                <th className="text-left px-4 py-3 text-amber-400 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {games.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-12">
                    No games scheduled. Click "Schedule Game" to get started.
                  </td>
                </tr>
              ) : (
                games.map((game) => (
                  <tr key={game.id} className="border-t border-slate-800 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-blue-400 font-mono font-bold">{game.game_code}</td>
                    <td className="px-4 py-3 text-white">{game.home_team} vs {game.away_team}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {game.scheduled_date && game.scheduled_time
                        ? `${new Date(game.scheduled_date).toLocaleDateString()} ${game.scheduled_time}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{game.field_location || "—"}</td>
                    <td className="px-4 py-3 text-slate-300">
                      {game.referees?.length ? game.referees.map(r => r.name).join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        game.status === "active" || game.status === "live" ? "bg-green-500/20 text-green-400" :
                        game.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                        "bg-slate-500/20 text-slate-400"
                      }`}>
                        {game.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditForm(game)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => openQR(game)}>
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/referee/${game.game_code}`)}>
                          Open
                        </Button>
                        <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => handleShareLink(game)}>
                          <Link2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(game)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Games Cards - Mobile & Tablet */}
        <div className="lg:hidden space-y-4">
          {games.length === 0 ? (
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-12 text-center text-slate-400">
              No games scheduled. Click "Schedule Game" to get started.
            </div>
          ) : (
            games.map((game) => (
              <div key={game.id} className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                {/* First Row - Main Info */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Code</div>
                    <div className="text-amber-400 font-mono font-bold">{game.game_code}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Field</div>
                    <div className="text-slate-300">{game.field_location || "—"}</div>
                  </div>
                </div>
                
                <div className="mb-3">
                  <div className="text-xs text-slate-400 mb-1">Teams</div>
                  <div className="text-white font-medium">{game.home_team} vs {game.away_team}</div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-slate-400 mb-1">Date/Time</div>
                  <div className="text-slate-300">
                    {game.scheduled_date && game.scheduled_time
                      ? `${new Date(game.scheduled_date).toLocaleDateString()} ${game.scheduled_time}`
                      : "—"}
                  </div>
                </div>

                {/* Second Row - Referee, Status, Actions */}
                <div className="grid grid-cols-2 gap-4 mb-3 pt-3 border-t border-slate-700">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Referee</div>
                    <div className="text-slate-300 text-sm">
                      {game.referees?.length ? game.referees.map(r => r.name).join(", ") : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Status</div>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      game.status === "active" || game.status === "live" ? "bg-green-500/20 text-green-400" :
                      game.status === "completed" ? "bg-blue-500/20 text-blue-400" :
                      "bg-slate-500/20 text-slate-400"
                    }`}>
                      {game.status}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-700">
                  <Button size="sm" variant="outline" onClick={() => openEditForm(game)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openQR(game)}>
                    <QrCode className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/referee/${game.game_code}`)}>
                    Open
                  </Button>
                  <Button size="sm" className="bg-blue-500 hover:bg-blue-600" onClick={() => handleShareLink(game)}>
                    <Link2 className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(game)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// Simple QR Code canvas component
function QRCanvas({ gameCode }: { gameCode: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `${window.location.origin}/game/${gameCode}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 250,
        margin: 2,
        color: { dark: '#0F172A', light: '#FFFFFF' },
      });
    }
  }, [url]);

  return (
    <div className="bg-white p-4 rounded-lg flex justify-center">
      <canvas ref={canvasRef} width="300" height="300" style={{ maxWidth: '100%', height: 'auto' }} />
    </div>
  );
}
