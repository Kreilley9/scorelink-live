import { useAuth } from "@/react-app/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Alert, AlertDescription } from "@/react-app/components/ui/alert";
import { 
  ArrowLeft, Plus, MapPin, Calendar, QrCode, Link2, Copy, 
  Trash2, Pencil, ChevronDown, ChevronUp, ExternalLink,
  AlertTriangle, MessageSquare, CheckCircle, XCircle, Clock,
  Play, Search, Printer, Download, Upload
} from "lucide-react";
import Select from "react-select";
import { downloadBulkScheduleTemplate, parseBulkScheduleFile } from "@/react-app/utils/excelTemplate";
import GameQRCode from "@/react-app/components/GameQRCode";
import PrintableFieldSign from "@/react-app/components/PrintableFieldSign";
import { useCurrentUser } from "@/react-app/hooks/useCurrentUser";
import { useSportAccount } from "@/react-app/hooks/useSportAccount";
import { getSportIcon } from "@/react-app/utils/sportIcons";

interface Field {
  id: number;
  name: string;
  location?: string;
  status: "pending" | "active" | "expired";
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
  game_count?: number;
  branding_id?: number;
  sponsor_id?: number;
  template_id?: number;
  branding_org_name?: string;
  branding_logo_url?: string;
  sponsor_name?: string;
}

interface Game {
  id: number;
  game_code: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
  time_remaining: number;
  half: number;
  is_running: boolean;
  scheduled_date?: string;
  scheduled_time?: string;
  field_location?: string;
  field_id?: number;
  status: string;
  created_at: string;
  referees?: { id: number; name: string; phone_number?: string }[];
}

interface Referee {
  id: number;
  name: string;
  phone_number: string;
}

export default function GamesUnified() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();
  const { currentUser, hasFeature } = useCurrentUser();
  const { activeSportAccount } = useSportAccount();
  
  // Fields state
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldsExpanded, setFieldsExpanded] = useState(true);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLocation, setNewFieldLocation] = useState("");
  const [newFieldBrandingId, setNewFieldBrandingId] = useState<string>("");
  const [newFieldSponsorId, setNewFieldSponsorId] = useState<string>("");
  const [newFieldTemplateId, setNewFieldTemplateId] = useState<string>("");
  const [printableField, setPrintableField] = useState<Field | null>(null);
  const [fieldGames, setFieldGames] = useState<Game[]>([]);
  
  // Games state
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [fieldFilter, setFieldFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [showGameForm, setShowGameForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [referees, setReferees] = useState<Referee[]>([]);
  const [sponsors, setSponsors] = useState<{ id: number; name: string; logo_url: string | null }[]>([]);
  const [brandings, setBrandings] = useState<{ id: number; organization_name: string; logo_url: string | null }[]>([]);
  const [templates, setTemplates] = useState<{ id: number; name: string; sport_type: string }[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    home_team: "",
    away_team: "",
    scheduled_date: "",
    scheduled_time: "",
    field_id: "" as string | number,
    referee_ids: [] as number[],
    sponsor_ids: [] as number[],
    branding_id: "" as string | number,
    template_id: "" as string | number,
  });
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [qrCodeGame, setQrCodeGame] = useState<Game | null>(null);
  const [linkShareGame, setLinkShareGame] = useState<Game | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [userSportType, setUserSportType] = useState<string>("flag_football");
  const [userTemplate, setUserTemplate] = useState<{ game_length_minutes?: number } | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkUploadResult, setBulkUploadResult] = useState<string | null>(null);

  useEffect(() => {
    const checkUser = async () => {
      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const data = await response.json();
          if (data.role !== "admin" && data.role !== "coordinator") {
            navigate("/");
          }
          if (data.sport_type) setUserSportType(data.sport_type);
          if (data.template_config) setUserTemplate(data.template_config);
        }
      } catch (error) {
        console.error("Failed to check user:", error);
      }
    };
    if (user) checkUser();
  }, [user, navigate]);

  useEffect(() => {
    if (currentUser && activeSportAccount) {
      fetchAllData();
      const interval = setInterval(() => fetchGames(), 3000);
      return () => clearInterval(interval);
    }
  }, [currentUser, activeSportAccount]);

  useEffect(() => {
    let filtered = games;
    if (searchQuery) {
      filtered = filtered.filter(
        (game) =>
          game.game_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          game.home_team.toLowerCase().includes(searchQuery.toLowerCase()) ||
          game.away_team.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (game.field_location && game.field_location.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((game) => game.status === statusFilter);
    }
    if (fieldFilter !== "all") {
      filtered = filtered.filter((game) => game.field_id === Number(fieldFilter));
    }
    if (locationFilter !== "all") {
      const locationFields = fields.filter(f => f.location === locationFilter).map(f => f.id);
      filtered = filtered.filter((game) => game.field_id && locationFields.includes(game.field_id));
    }
    setFilteredGames(filtered);
  }, [games, searchQuery, statusFilter, fieldFilter, locationFilter, fields]);

  // Auto-fill template, branding, and sponsor from field when field is selected (only for new games)
  useEffect(() => {
    if (!editingGame && formData.field_id && fields.length > 0) {
      const selectedField = fields.find(f => f.id === Number(formData.field_id));
      if (selectedField) {
        setFormData(prev => ({
          ...prev,
          template_id: selectedField.template_id || "",
          branding_id: selectedField.branding_id || "",
          sponsor_ids: selectedField.sponsor_id ? [selectedField.sponsor_id] : [],
        }));
      }
    }
  }, [formData.field_id, fields, editingGame]);

  const fetchAllData = async () => {
    if (!activeSportAccount) return;
    
    try {
      const sportAccountParam = `sport_account_id=${activeSportAccount.id}`;
      const [fieldsRes, gamesRes, refereesRes, sponsorsRes, brandingsRes, templatesRes] = await Promise.all([
        fetch(`/api/fields?${sportAccountParam}`),
        fetch(`/api/games/all?${sportAccountParam}`),
        fetch(`/api/referees?${sportAccountParam}`),
        fetch(`/api/sponsors?${sportAccountParam}`),
        fetch(`/api/brandings?${sportAccountParam}`),
        fetch(`/api/templates`),
      ]);

      if (fieldsRes.ok) {
        const data = await fieldsRes.json();
        setFields(data.fields || []);
      }
      if (gamesRes.ok) setGames(await gamesRes.json());
      if (refereesRes.ok) setReferees(await refereesRes.json());
      if (sponsorsRes.ok) setSponsors(await sponsorsRes.json());
      if (brandingsRes.ok) setBrandings(await brandingsRes.json());
      if (templatesRes.ok) setTemplates(await templatesRes.json());
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = async () => {
    if (!activeSportAccount) return;
    
    try {
      const response = await fetch(`/api/games/all?sport_account_id=${activeSportAccount.id}`);
      if (response.ok) {
        const data = await response.json();
        setGames(data);
      }
    } catch (error) {
      console.error("Failed to fetch games:", error);
    }
  };

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFieldName.trim(),
          location: newFieldLocation.trim() || null,
          sport_account_id: activeSportAccount?.id,
          branding_id: newFieldBrandingId ? Number(newFieldBrandingId) : null,
          sponsor_id: newFieldSponsorId ? Number(newFieldSponsorId) : null,
          template_id: newFieldTemplateId ? Number(newFieldTemplateId) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create field");
      }

      setNewFieldName("");
      setNewFieldLocation("");
      setNewFieldBrandingId("");
      setNewFieldSponsorId("");
      setNewFieldTemplateId("");
      setShowFieldForm(false);
      fetchAllData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteField = async (fieldId: number) => {
    if (!confirm("Delete this field?")) return;

    try {
      const res = await fetch(`/api/fields/${fieldId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete field");
        return;
      }
      fetchAllData();
    } catch (err) {
      console.error("Failed to delete field:", err);
    }
  };

  const openPrintableSign = async (field: Field) => {
    setPrintableField(field);
    const res = await fetch("/api/games/all");
    if (res.ok) {
      const allGames = await res.json();
      setFieldGames(allGames.filter((g: any) => g.field_id === field.id));
    }
  };

  const resetGameForm = () => {
    setFormData({
      home_team: "",
      away_team: "",
      scheduled_date: "",
      scheduled_time: "",
      field_id: "",
      referee_ids: [],
      sponsor_ids: [],
      branding_id: "",
      template_id: "",
    });
    setEditingGame(null);
    setShowGameForm(false);
  };

  const openNewGameForm = () => {
    resetGameForm();
    setShowGameForm(true);
  };

  const openEditForm = async (game: Game) => {
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

    // Fetch the full game details to get branding_id and template_id
    let brandingId = "";
    let templateId = "";
    try {
      const gameResponse = await fetch(`/api/games/${game.id}`);
      if (gameResponse.ok) {
        const gameData = await gameResponse.json();
        brandingId = gameData.branding_id || "";
        templateId = gameData.template_id || "";
      }
    } catch (error) {
      console.error("Failed to fetch game details:", error);
    }

    setFormData({
      home_team: game.home_team,
      away_team: game.away_team,
      scheduled_date: game.scheduled_date || "",
      scheduled_time: game.scheduled_time || "",
      field_id: game.field_id || "",
      referee_ids: game.referees?.map(r => r.id) || [],
      sponsor_ids: gameSponsorIds,
      branding_id: brandingId,
      template_id: templateId,
    });
    setEditingGame(game);
    setShowGameForm(true);
  };

  const handleSubmitGame = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingGame ? `/api/games/${editingGame.id}` : "/api/games/schedule";
      const method = editingGame ? "PATCH" : "POST";

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
          sponsor_ids: formData.sponsor_ids,
          sport_type: activeSportAccount?.sport_type || userSportType,
          time_remaining: (userTemplate?.game_length_minutes || 20) * 60,
          sport_account_id: activeSportAccount?.id,
          branding_id: formData.branding_id ? Number(formData.branding_id) : null,
          template_id: formData.template_id ? Number(formData.template_id) : null,
        }),
      });

      if (response.ok) {
        await fetchAllData();
        resetGameForm();
      } else {
        const error = await response.json();
        alert(`Failed: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Failed to save game:", error);
      alert("Failed to save game");
    }
  };

  const handleDeleteGame = async (game: Game) => {
    if (!confirm(`Delete "${game.home_team} vs ${game.away_team}"?`)) return;

    try {
      const response = await fetch(`/api/games/${game.id}`, { method: "DELETE" });
      if (response.ok) {
        await fetchAllData();
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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBulkUploading(true);
    setBulkUploadResult(null);

    try {
      const parsed = await parseBulkScheduleFile(file);
      
      if (parsed.errors.length > 0) {
        setBulkUploadResult(`Errors: ${parsed.errors.join(', ')}`);
        setBulkUploading(false);
        return;
      }

      let fieldsCreated = 0;
      let refereesCreated = 0;
      let gamesCreated = 0;
      const fieldNameToId = new Map<string, number>();
      const refereeNameToId = new Map<string, number>();

      // Create fields
      for (const field of parsed.fields) {
        try {
          const res = await fetch("/api/fields", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: field.name,
              location: field.location || null,
              sport_account_id: activeSportAccount?.id,
            }),
          });
          
          if (res.ok) {
            const created = await res.json();
            fieldNameToId.set(field.name, created.field.id);
            fieldsCreated++;
          }
        } catch (error) {
          console.error(`Failed to create field ${field.name}:`, error);
        }
      }

      // Create referees
      for (const referee of parsed.referees) {
        try {
          const res = await fetch("/api/referees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: referee.name,
              phone_number: referee.phone_number,
              sport_account_id: activeSportAccount?.id,
            }),
          });
          
          if (res.ok) {
            const created = await res.json();
            refereeNameToId.set(referee.name, created.id);
            refereesCreated++;
          }
        } catch (error) {
          console.error(`Failed to create referee ${referee.name}:`, error);
        }
      }

      // Create games
      for (const game of parsed.games) {
        try {
          const fieldId = game.field_name ? fieldNameToId.get(game.field_name) : null;
          const refereeId = game.referee_name ? refereeNameToId.get(game.referee_name) : null;
          
          const res = await fetch("/api/games/schedule", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              home_team: game.home_team,
              away_team: game.away_team,
              scheduled_date: game.scheduled_date || null,
              scheduled_time: game.scheduled_time || null,
              field_id: fieldId || null,
              field_location: game.field_name || "",
              referee_ids: refereeId ? [refereeId] : [],
              sponsor_ids: [],
              sport_type: activeSportAccount?.sport_type || userSportType,
              time_remaining: (userTemplate?.game_length_minutes || 20) * 60,
              sport_account_id: activeSportAccount?.id,
            }),
          });
          
          if (res.ok) {
            gamesCreated++;
          }
        } catch (error) {
          console.error(`Failed to create game ${game.home_team} vs ${game.away_team}:`, error);
        }
      }

      setBulkUploadResult(
        `Successfully created: ${fieldsCreated} fields, ${refereesCreated} referees, ${gamesCreated} games`
      );
      
      // Refresh all data
      await fetchAllData();
      
      // Reset the file input
      event.target.value = '';
    } catch (error) {
      setBulkUploadResult(`Upload failed: ${error}`);
    } finally {
      setBulkUploading(false);
    }
  };

  const getFieldStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400"><CheckCircle className="w-3 h-3" /> Active</span>;
      case "expired":
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400"><XCircle className="w-3 h-3" /> Expired</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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

  if (!activeSportAccount) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md mx-auto p-8">
          <h1 className="text-2xl font-bold text-white">No Sport Account Found</h1>
          <p className="text-slate-400">
            You need to set up a sport account before you can manage games. Please complete onboarding or add a new sport from your dashboard.
          </p>
          <Button onClick={() => navigate("/dashboard")} className="bg-primary hover:bg-primary/90 text-white">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Printable Sign View
  if (printableField) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-4xl mx-auto p-8 no-print">
          <Button variant="outline" onClick={() => setPrintableField(null)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Games
          </Button>
          <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90 text-white gap-2 mb-6">
            <Printer className="w-4 h-4" /> Print / Save as PDF
          </Button>
        </div>
        <PrintableFieldSign field={printableField} games={fieldGames} branding={null} />
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
          <Button variant="outline" onClick={() => setLinkShareGame(null)} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Games
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

            <Alert className="mb-6 bg-amber-500/10 border-amber-500/30 text-amber-400">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <AlertDescription className="text-amber-300 font-medium ml-2">
                This link provides access to control the game. Only share this link with official personnel.
              </AlertDescription>
            </Alert>

            <div className="mb-6">
              <div className="text-lg font-bold text-white mb-3">REFEREE CONTROL LINK</div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-3">
                <div className="text-primary text-lg font-medium break-all">
                  {refereeLink}
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyRefereeLink} className="flex-1 bg-primary hover:bg-primary/90 text-white text-base py-6">
                  <Copy className="w-5 h-5 mr-2" />
                  {copySuccess ? "Copied!" : "Copy Referee Link"}
                </Button>
              </div>
              <p className="text-sm text-slate-400 mt-3 text-center">
                Share this link with your referee via text, email, or any messaging app
              </p>
            </div>

            {hasRefereeInfo && hasPhoneNumber && (
              <div className="border-t border-slate-700 pt-6">
                <Button onClick={sendViaSMS} className="w-full bg-primary hover:bg-primary/90 text-white">
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent" />
      
      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Games</h1>
              <p className="text-slate-400">Manage your fields and game schedule</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {hasFeature("bulk_scheduling") && (
                <>
                  <Button 
                    onClick={downloadBulkScheduleTemplate}
                    className="bg-primary hover:bg-primary/90 text-white gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Template
                  </Button>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleBulkUpload}
                      className="hidden"
                      disabled={bulkUploading}
                    />
                    <div className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                      <Upload className="w-4 h-4" />
                      {bulkUploading ? 'Uploading...' : 'Upload Schedule'}
                    </div>
                  </label>
                </>
              )}
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Dashboard
              </Button>
            </div>
          </div>

          {/* Bulk Upload Result */}
          {bulkUploadResult && (
            <Alert className="mb-6 bg-primary/10 border-primary/30">
              <AlertDescription className="text-white">
                {bulkUploadResult}
              </AlertDescription>
            </Alert>
          )}

          {/* Fields Section */}
          <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800 mb-8">
            <button
              onClick={() => setFieldsExpanded(!fieldsExpanded)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-800/30"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-white">Fields ({fields.length})</h2>
              </div>
              {fieldsExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </button>

            {fieldsExpanded && (
              <div className="border-t border-slate-800 p-4">
                {!showFieldForm && (
                  <Button onClick={() => setShowFieldForm(true)} className="bg-primary hover:bg-primary/90 text-white mb-4">
                    <Plus className="w-4 h-4 mr-2" /> Add Field
                  </Button>
                )}

                {showFieldForm && (
                  <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                    <h3 className="text-white font-medium mb-3">Add New Field</h3>
                    <form onSubmit={handleCreateField} className="space-y-3">
                      <div>
                        <Label className="text-slate-300">Field Name</Label>
                        <Input
                          value={newFieldName}
                          onChange={(e) => setNewFieldName(e.target.value)}
                          placeholder="e.g., Field 1, North Field"
                          className="bg-slate-800 border-slate-700 text-white mt-1"
                          required
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Location</Label>
                        <Input
                          value={newFieldLocation}
                          onChange={(e) => setNewFieldLocation(e.target.value)}
                          placeholder="e.g., Memorial Park, 123 Main St"
                          className="bg-slate-800 border-slate-700 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-slate-300">Custom Branding (Optional)</Label>
                        <select
                          value={newFieldBrandingId}
                          onChange={(e) => setNewFieldBrandingId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white mt-1"
                        >
                          <option value="">None (Use default)</option>
                          {brandings.map((branding) => (
                            <option key={branding.id} value={branding.id}>
                              {branding.organization_name}
                            </option>
                          ))}
                        </select>
                        {brandings.length === 0 && (
                          <p className="text-xs text-slate-400 mt-1">
                            No branding created yet. <button type="button" onClick={() => navigate('/admin/branding')} className="text-primary hover:underline">Create one</button>
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-slate-300">Sponsor (Optional)</Label>
                        <select
                          value={newFieldSponsorId}
                          onChange={(e) => setNewFieldSponsorId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white mt-1"
                        >
                          <option value="">None</option>
                          {sponsors.map((sponsor) => (
                            <option key={sponsor.id} value={sponsor.id}>
                              {sponsor.name}
                            </option>
                          ))}
                        </select>
                        {sponsors.length === 0 && (
                          <p className="text-xs text-slate-400 mt-1">
                            No sponsors created yet. <button type="button" onClick={() => navigate('/admin/sponsors')} className="text-primary hover:underline">Create one</button>
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-slate-300">Game Template (Optional)</Label>
                        <select
                          value={newFieldTemplateId}
                          onChange={(e) => setNewFieldTemplateId(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white mt-1"
                        >
                          <option value="">None (Use default)</option>
                          {templates.filter(t => t.sport_type === activeSportAccount?.sport_type).map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">
                          Choose a custom game template for all games on this field
                        </p>
                      </div>
                      {error && <p className="text-red-400 text-sm">{error}</p>}
                      <div className="flex gap-3">
                        <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-white">
                          {submitting ? "Creating..." : "Create Field"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => { setShowFieldForm(false); setError(""); }}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="grid gap-3">
                  {fields.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No fields created yet</p>
                    </div>
                  ) : (
                    fields.map((field) => (
                      <div key={field.id} className="flex items-center justify-between bg-slate-800/30 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-primary" />
                          <div>
                            <div className="text-white font-medium">{field.name}</div>
                            {field.location && <div className="text-xs text-slate-500">{field.location}</div>}
                            <div className="text-xs text-slate-400">{field.game_count || 0} games</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getFieldStatusBadge(field.status)}
                          <Button
                            onClick={() => openPrintableSign(field)}
                            variant="ghost"
                            size="sm"
                            className="text-primary hover:text-primary/80"
                          >
                            <QrCode className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDeleteField(field.id)}
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Games Section */}
          <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800">
            <div className="p-4 border-b border-slate-800">
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search games..."
                    className="pl-10 bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-white"
                >
                  <option value="all">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  value={fieldFilter}
                  onChange={(e) => setFieldFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-white"
                >
                  <option value="all">All Fields</option>
                  {fields.map(field => (
                    <option key={field.id} value={field.id}>{field.name}</option>
                  ))}
                </select>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-md text-white"
                >
                  <option value="all">All Locations</option>
                  {Array.from(new Set(fields.filter(f => f.location).map(f => f.location))).map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              {!showGameForm && (
                <Button onClick={openNewGameForm} className="bg-primary hover:bg-primary/90 text-white">
                  <Calendar className="w-4 h-4 mr-2" /> Schedule Game
                </Button>
              )}
            </div>

            {showGameForm && (
              <div className="p-4 border-b border-slate-800 bg-slate-800/30">
                <h3 className="text-white font-medium mb-4">{editingGame ? "Edit Game" : "Schedule New Game"}</h3>
                <form onSubmit={handleSubmitGame} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Home Team</Label>
                      <Input
                        value={formData.home_team}
                        onChange={(e) => setFormData({ ...formData, home_team: e.target.value })}
                        placeholder="Home team"
                        required
                        className="bg-slate-800 border-slate-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Away Team</Label>
                      <Input
                        value={formData.away_team}
                        onChange={(e) => setFormData({ ...formData, away_team: e.target.value })}
                        placeholder="Away team"
                        required
                        className="bg-slate-800 border-slate-700 text-white mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-slate-300">Date</Label>
                      <Input
                        type="date"
                        value={formData.scheduled_date}
                        onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-slate-300">Time</Label>
                      <Input
                        type="time"
                        value={formData.scheduled_time}
                        onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white mt-1"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-slate-300">Field</Label>
                    <select
                      value={formData.field_id}
                      onChange={(e) => setFormData({ ...formData, field_id: e.target.value })}
                      required
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white mt-1"
                    >
                      <option value="">Select a field...</option>
                      {fields.filter(f => f.status !== 'expired').map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.name} ({field.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label className="text-slate-300">Custom Branding (Optional)</Label>
                    <select
                      value={formData.branding_id}
                      onChange={(e) => setFormData({ ...formData, branding_id: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white mt-1"
                    >
                      <option value="">None (Use default)</option>
                      {brandings.map((branding) => (
                        <option key={branding.id} value={branding.id}>
                          {branding.organization_name}
                        </option>
                      ))}
                    </select>
                    {brandings.length === 0 && (
                      <p className="text-xs text-slate-400 mt-1">
                        No branding created yet. <button type="button" onClick={() => navigate('/admin/branding')} className="text-blue-400 hover:underline">Create one</button>
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-slate-300">Game Template (Optional)</Label>
                    <select
                      value={formData.template_id}
                      onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-white mt-1"
                    >
                      <option value="">None (Use default)</option>
                      {templates.filter(t => t.sport_type === activeSportAccount?.sport_type).map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-400 mt-1">
                      Choose a custom game template
                    </p>
                  </div>

                  {sponsors.length > 0 && (
                    <div>
                      <Label className="text-slate-300">Sponsors (Optional)</Label>
                      <Select
                        isMulti
                        value={sponsors.filter(s => formData.sponsor_ids.includes(s.id)).map(s => ({ value: s.id, label: s.name }))}
                        onChange={(selected: any) => {
                          setFormData(prev => ({
                            ...prev,
                            sponsor_ids: selected ? selected.map((s: any) => s.value) : []
                          }));
                        }}
                        options={sponsors.map(s => ({ value: s.id, label: s.name }))}
                        className="mt-1"
                        classNamePrefix="react-select"
                        placeholder="Select sponsors..."
                        styles={{
                          control: (base: any) => ({
                            ...base,
                            backgroundColor: 'rgb(30, 41, 59)',
                            borderColor: 'rgb(51, 65, 85)',
                            '&:hover': { borderColor: 'rgb(71, 85, 105)' }
                          }),
                          menu: (base: any) => ({
                            ...base,
                            backgroundColor: 'rgb(30, 41, 59)',
                            border: '1px solid rgb(51, 65, 85)'
                          }),
                          option: (base: any, state: any) => ({
                            ...base,
                            backgroundColor: state.isFocused ? 'rgb(51, 65, 85)' : 'rgb(30, 41, 59)',
                            color: 'rgb(203, 213, 225)',
                            '&:hover': { backgroundColor: 'rgb(51, 65, 85)' }
                          }),
                          multiValue: (base: any) => ({
                            ...base,
                            backgroundColor: 'rgb(59, 130, 246, 0.2)',
                            borderRadius: '4px'
                          }),
                          multiValueLabel: (base: any) => ({
                            ...base,
                            color: 'rgb(96, 165, 250)'
                          }),
                          multiValueRemove: (base: any) => ({
                            ...base,
                            color: 'rgb(96, 165, 250)',
                            '&:hover': { backgroundColor: 'rgb(59, 130, 246, 0.3)', color: 'rgb(147, 197, 253)' }
                          }),
                          input: (base: any) => ({
                            ...base,
                            color: 'white'
                          }),
                          placeholder: (base: any) => ({
                            ...base,
                            color: 'rgb(148, 163, 184)'
                          })
                        }}
                      />
                    </div>
                  )}

                  {referees.length > 0 && (
                    <div>
                      <Label className="text-slate-300">Referees</Label>
                      <Select
                        isMulti
                        value={referees.filter(r => formData.referee_ids.includes(r.id)).map(r => ({ value: r.id, label: r.name }))}
                        onChange={(selected: any) => {
                          setFormData(prev => ({
                            ...prev,
                            referee_ids: selected ? selected.map((r: any) => r.value) : []
                          }));
                        }}
                        options={referees.map(r => ({ value: r.id, label: r.name }))}
                        className="mt-1"
                        classNamePrefix="react-select"
                        placeholder="Select referees..."
                        styles={{
                          control: (base: any) => ({
                            ...base,
                            backgroundColor: 'rgb(30, 41, 59)',
                            borderColor: 'rgb(51, 65, 85)',
                            '&:hover': { borderColor: 'rgb(71, 85, 105)' }
                          }),
                          menu: (base: any) => ({
                            ...base,
                            backgroundColor: 'rgb(30, 41, 59)',
                            border: '1px solid rgb(51, 65, 85)'
                          }),
                          option: (base: any, state: any) => ({
                            ...base,
                            backgroundColor: state.isFocused ? 'rgb(51, 65, 85)' : 'rgb(30, 41, 59)',
                            color: 'rgb(203, 213, 225)',
                            '&:hover': { backgroundColor: 'rgb(51, 65, 85)' }
                          }),
                          multiValue: (base: any) => ({
                            ...base,
                            backgroundColor: 'rgb(59, 130, 246, 0.2)',
                            borderRadius: '4px'
                          }),
                          multiValueLabel: (base: any) => ({
                            ...base,
                            color: 'rgb(96, 165, 250)'
                          }),
                          multiValueRemove: (base: any) => ({
                            ...base,
                            color: 'rgb(96, 165, 250)',
                            '&:hover': { backgroundColor: 'rgb(59, 130, 246, 0.3)', color: 'rgb(147, 197, 253)' }
                          }),
                          input: (base: any) => ({
                            ...base,
                            color: 'white'
                          }),
                          placeholder: (base: any) => ({
                            ...base,
                            color: 'rgb(148, 163, 184)'
                          })
                        }}
                      />
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">
                      {editingGame ? "Update Game" : "Schedule Game"}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetGameForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </div>
            )}

            <div className="p-4">
              {filteredGames.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No games found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredGames.map((game) => (
                    <div key={game.id} className="bg-slate-800/30 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            {(() => {
                              const SportIcon = getSportIcon(activeSportAccount?.sport_type || 'flag_football');
                              return <SportIcon className="w-4 h-4 text-primary" />;
                            })()}
                            <span className="text-primary font-mono font-bold">{game.game_code}</span>
                            {game.is_running && (
                              <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full text-xs">
                                <Play className="w-3 h-3" /> LIVE
                              </span>
                            )}
                          </div>
                          <div className="text-white font-medium">{game.home_team} vs {game.away_team}</div>
                          <div className="text-sm text-slate-400 mt-1">
                            {game.scheduled_date && game.scheduled_time && `${new Date(game.scheduled_date).toLocaleDateString()} ${game.scheduled_time} • `}
                            {game.field_location || "No field"}
                            {game.field_id && fields.find(f => f.id === game.field_id)?.location && (
                              <> • {fields.find(f => f.id === game.field_id)?.location}</>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-white">{game.home_score} - {game.away_score}</div>
                          <div className="text-sm text-slate-400">{formatTime(game.time_remaining)} • H{game.half}</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-700">
                        <Button size="sm" onClick={() => openEditForm(game)} className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40">
                          <Pencil className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button size="sm" onClick={() => setQrCodeGame(game)} className="bg-accent/20 hover:bg-accent/30 text-accent border border-accent/40">
                          <QrCode className="w-3 h-3 mr-1" /> QR Code
                        </Button>
                        <Button size="sm" onClick={() => navigate(`/referee/${game.game_code}`)} className="bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40">
                          <ExternalLink className="w-3 h-3 mr-1" /> Control Panel
                        </Button>
                        <Button size="sm" onClick={() => handleShareLink(game)} className="bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary/90 border border-primary/30">
                          <Link2 className="w-3 h-3 mr-1" /> Share
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteGame(game)}>
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <GameQRCode
        gameCode={qrCodeGame?.game_code || 'TEST'}
        homeTeam={qrCodeGame?.home_team || 'Home'}
        awayTeam={qrCodeGame?.away_team || 'Away'}
        open={!!qrCodeGame}
        onOpenChange={(open) => !open && setQrCodeGame(null)}
      />
    </div>
  );
}
