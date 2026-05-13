import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/react-app/components/ui/dialog";
import { ArrowLeft, Plus, MapPin, Clock, CheckCircle, XCircle, AlertTriangle, Pencil, Trash2, QrCode, Printer } from "lucide-react";
import PrintableFieldSign from "@/react-app/components/PrintableFieldSign";

interface Field {
  id: number;
  name: string;
  status: "pending" | "active" | "expired";
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
  game_count?: number;
  branding_id?: number;
  sponsor_id?: number;
  template_id?: number;
  branding_org_name?: string;
  branding_primary_color?: string;
  branding_secondary_color?: string;
  branding_background_color?: string;
  branding_text_color?: string;
  branding_accent_color?: string;
  branding_logo_url?: string;
  sponsor_name?: string;
  sponsor_logo_url?: string;
  template_name?: string;
  template_sport_type?: string;
}

interface UserInfo {
  fields_allowed: number;
  fields_used: number;
  fields_remaining: number;
}

interface Game {
  id: number;
  home_team: string;
  away_team: string;
  scheduled_date?: string;
  scheduled_time?: string;
}

interface Branding {
  id: number;
  organization_name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  accent_color: string;
}

interface Sponsor {
  id: number;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  additional_text: string | null;
}

interface Template {
  id: number;
  name: string;
  sport_type: string;
  description: string | null;
}

type ViewMode = "list" | "printable";

export default function FieldManagement() {
  const navigate = useNavigate();
  const [fields, setFields] = useState<Field[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newFieldName, setNewFieldName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [editField, setEditField] = useState<Field | null>(null);
  const [editFieldName, setEditFieldName] = useState("");
  const [deleteField, setDeleteField] = useState<Field | null>(null);
  const [userTier, setUserTier] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [createBrandingId, setCreateBrandingId] = useState<number | null>(null);
  const [createSponsorId, setCreateSponsorId] = useState<number | null>(null);
  const [createTemplateId, setCreateTemplateId] = useState<number | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  
  // Printable sign state
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [printableField, setPrintableField] = useState<Field | null>(null);
  const [fieldGames, setFieldGames] = useState<Game[]>([]);
  const [brandings, setBrandings] = useState<Branding[]>([]);
  const [selectedBranding, setSelectedBranding] = useState<Branding | null>(null);

  useEffect(() => {
    fetchFields();
    fetchBrandings();
    fetchSponsors();
    fetchTemplates();
    fetchUserTier();
  }, []);

  const fetchUserTier = async () => {
    try {
      const res = await fetch("/api/users/me");
      if (res.ok) {
        const data = await res.json();
        setUserTier(data.subscription_tier);
        setUserRole(data.role);
      }
    } catch (err) {
      console.error("Error fetching user tier:", err);
    }
  };

  const fetchFields = async () => {
    try {
      const res = await fetch("/api/fields");
      if (!res.ok) throw new Error("Failed to fetch fields");
      const data = await res.json();
      setFields(data.fields || []);
      setUserInfo(data.userInfo || null);
    } catch (err) {
      console.error("Error fetching fields:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBrandings = async () => {
    try {
      const res = await fetch("/api/brandings");
      if (res.ok) {
        const data = await res.json();
        setBrandings(data);
      }
    } catch (err) {
      console.error("Error fetching brandings:", err);
    }
  };

  const fetchSponsors = async () => {
    try {
      const res = await fetch("/api/sponsors");
      if (res.ok) {
        const data = await res.json();
        setSponsors(data);
      }
    } catch (err) {
      console.error("Error fetching sponsors:", err);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (err) {
      console.error("Error fetching templates:", err);
    }
  };

  const fetchFieldGames = async (fieldId: number) => {
    try {
      const res = await fetch("/api/games/all");
      if (res.ok) {
        const allGames = await res.json();
        const filtered = allGames.filter((g: any) => g.field_id === fieldId);
        setFieldGames(filtered);
      }
    } catch (err) {
      console.error("Error fetching games:", err);
    }
  };

  const openPrintableSign = async (field: Field) => {
    setPrintableField(field);
    await fetchFieldGames(field.id);
    
    // If field has branding, set it as selected
    if (field.branding_id && field.branding_logo_url) {
      setSelectedBranding({
        id: field.branding_id,
        organization_name: field.branding_org_name || '',
        logo_url: field.branding_logo_url,
        primary_color: field.branding_primary_color || '#2563EB',
        secondary_color: field.branding_secondary_color || '#3b82f6',
        background_color: field.branding_background_color || '#ffffff',
        text_color: field.branding_text_color || '#1e293b',
        accent_color: field.branding_accent_color || '#3b82f6',
      });
    }
    
    setViewMode("printable");
  };

  const backToList = () => {
    setViewMode("list");
    setPrintableField(null);
    setFieldGames([]);
    setSelectedBranding(null);
  };

  const handlePrint = () => {
    window.print();
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
          branding_id: createBrandingId,
          sponsor_id: createSponsorId,
          template_id: createTemplateId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create field");
      }

      setNewFieldName("");
      setCreateBrandingId(null);
      setCreateSponsorId(null);
      setCreateTemplateId(null);
      setShowForm(false);
      fetchFields();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editField || !editFieldName.trim()) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/fields/${editField.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editFieldName.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update field");
      }

      setEditField(null);
      setEditFieldName("");
      fetchFields();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteField = async () => {
    if (!deleteField) return;

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`/api/fields/${deleteField.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete field");
      }

      setDeleteField(null);
      fetchFields();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditDialog = (field: Field) => {
    setEditField(field);
    setEditFieldName(field.name);
    setError("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-green-500/20 text-green-400">
            <CheckCircle className="w-3 h-3" /> Active
          </span>
        );
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
            <XCircle className="w-3 h-3" /> Expired
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  const formatExpiration = (expiresAt: string | null) => {
    if (!expiresAt) return "—";
    const expDate = new Date(expiresAt);
    const now = new Date();
    const diff = expDate.getTime() - now.getTime();
    
    if (diff <= 0) return "Expired";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m remaining`;
    return `${minutes}m remaining`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Printable Sign View
  if (viewMode === "printable" && printableField) {
    return (
      <div className="min-h-screen bg-slate-950">
        <div className="max-w-4xl mx-auto p-8 no-print">
          <Button variant="outline" onClick={backToList} className="mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Fields
          </Button>

          {brandings.length > 0 && (
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-6 mb-6">
              <h3 className="text-white font-bold mb-4">Select Branding (Optional)</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={selectedBranding === null ? "default" : "outline"}
                  onClick={() => setSelectedBranding(null)}
                  className="justify-start"
                >
                  Default (ScoreLink)
                </Button>
                {brandings.map((branding) => (
                  <Button
                    key={branding.id}
                    variant={selectedBranding?.id === branding.id ? "default" : "outline"}
                    onClick={() => setSelectedBranding(branding)}
                    className="justify-start"
                  >
                    {branding.organization_name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 mb-6">
            <Button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </Button>
          </div>
        </div>

        <PrintableFieldSign
          field={printableField}
          games={fieldGames}
          branding={selectedBranding}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent" />
      
      <div className="relative z-10 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Field Management</h1>
              <p className="text-slate-400 mt-1">Create and manage your event fields</p>
            </div>
            <Button variant="outline" onClick={() => navigate(-1)} className="border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </div>

          {/* Field Credits Summary */}
          {userInfo && (
            <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800 p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Field Credits</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400">
                    {userRole === "admin" ? "∞" : userInfo.fields_allowed}
                  </div>
                  <div className="text-sm text-slate-400">Total Allowed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-slate-300">{userInfo.fields_used}</div>
                  <div className="text-sm text-slate-400">Used</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${userRole === "admin" || userInfo.fields_remaining > 0 ? "text-green-400" : "text-red-400"}`}>
                    {userRole === "admin" ? "∞" : userInfo.fields_remaining}
                  </div>
                  <div className="text-sm text-slate-400">Remaining</div>
                </div>
              </div>
            </div>
          )}

          {/* Create Field Button/Form */}
          {!showForm ? (
            <div className="mb-6">
              <Button
                onClick={() => setShowForm(true)}
                disabled={!!(userRole !== "admin" && userInfo && userInfo.fields_remaining <= 0)}
                className="bg-blue-600 hover:bg-blue-500 text-white min-h-[44px]"
              >
                <Plus className="w-4 h-4 mr-2" /> Create New Field
              </Button>
              {userRole !== "admin" && userInfo && userInfo.fields_remaining <= 0 && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  No field credits remaining. Purchase more to create fields.
                </p>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800 p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Create New Field</h2>
              <form onSubmit={handleCreateField} className="space-y-4">
                <div>
                  <Label htmlFor="fieldName" className="text-slate-300">Field Name</Label>
                  <Input
                    id="fieldName"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    placeholder="e.g., Field 1, North Field, Main Stadium"
                    className="bg-slate-800 border-slate-700 text-white mt-1 min-h-[44px]"
                  />
                </div>

                {/* Branding Selection - Standard and Premium only */}
                {(userTier === "standard" || userTier === "premium") && (
                  <div>
                    <Label htmlFor="fieldBranding" className="text-slate-300">Custom Branding (Optional)</Label>
                    {brandings.length > 0 ? (
                      <>
                        <select
                          id="fieldBranding"
                          value={createBrandingId || ""}
                          onChange={(e) => setCreateBrandingId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full bg-slate-800 border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[44px]"
                        >
                          <option value="">Default (ScoreLink)</option>
                          {brandings.map((branding) => (
                            <option key={branding.id} value={branding.id}>
                              {branding.organization_name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">
                          This branding will appear on scoreboards and QR codes for this field
                        </p>
                      </>
                    ) : (
                      <div className="bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 mt-1 min-h-[44px] flex items-center justify-between">
                        <span className="text-slate-400 text-sm">No custom branding created yet</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/admin/branding")}
                          className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                        >
                          Create Branding
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Template Selection - Standard and Premium only */}
                {(userTier === "standard" || userTier === "premium") && (
                  <div>
                    <Label htmlFor="fieldTemplate" className="text-slate-300">Scoreboard Template (Optional)</Label>
                    {templates.length > 0 ? (
                      <>
                        <select
                          id="fieldTemplate"
                          value={createTemplateId || ""}
                          onChange={(e) => setCreateTemplateId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full bg-slate-800 border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[44px]"
                        >
                          <option value="">Default (Your Settings)</option>
                          {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                              {template.name} {template.description ? `- ${template.description}` : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">
                          Override your default game settings for this field only
                        </p>
                      </>
                    ) : (
                      <div className="bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 mt-1 min-h-[44px] flex items-center justify-between">
                        <span className="text-slate-400 text-sm">No templates created yet</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/admin/templates")}
                          className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                        >
                          Create Template
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Sponsor Selection - Premium only */}
                {userTier === "premium" && (
                  <div>
                    <Label htmlFor="fieldSponsor" className="text-slate-300">Sponsor (Optional)</Label>
                    {sponsors.length > 0 ? (
                      <>
                        <select
                          id="fieldSponsor"
                          value={createSponsorId || ""}
                          onChange={(e) => setCreateSponsorId(e.target.value ? Number(e.target.value) : null)}
                          className="w-full bg-slate-800 border-slate-700 text-white rounded-md px-3 py-2 mt-1 min-h-[44px]"
                        >
                          <option value="">No sponsor</option>
                          {sponsors.map((sponsor) => (
                            <option key={sponsor.id} value={sponsor.id}>
                              {sponsor.name}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-slate-400 mt-1">
                          This sponsor will display on scoreboards for games on this field
                        </p>
                      </>
                    ) : (
                      <div className="bg-slate-800/50 border border-slate-700 rounded-md px-3 py-2 mt-1 min-h-[44px] flex items-center justify-between">
                        <span className="text-slate-400 text-sm">No sponsors created yet</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/admin/sponsors")}
                          className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                        >
                          Create Sponsor
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {error && <p className="text-red-400 text-sm">{error}</p>}
                <div className="flex gap-3">
                  <Button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-500 text-white min-h-[44px]">
                    {submitting ? "Creating..." : "Create Field"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setError(""); setCreateBrandingId(null); setCreateSponsorId(null); setCreateTemplateId(null); }} className="min-h-[44px]">
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Fields List */}
          <div className="bg-slate-900/60 backdrop-blur-sm rounded-xl border border-slate-800 overflow-hidden">
            <div className="bg-slate-800/50 px-4 py-3 border-b border-slate-700">
              <h2 className="text-lg font-semibold text-white">Your Fields</h2>
            </div>
          
          {fields.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No fields created yet.</p>
              <p className="text-sm mt-1">Create a field to start scheduling games.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {fields.map((field) => (
                <div key={field.id} className="p-4 hover:bg-slate-800/30">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                      <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-medium truncate">{field.name}</div>
                        <div className="text-sm text-slate-400">
                          Created {new Date(field.created_at).toLocaleDateString()}
                          {field.game_count !== undefined && ` • ${field.game_count} game${field.game_count !== 1 ? "s" : ""}`}
                        </div>
                        {/* Customization badges */}
                        {(field.branding_org_name || field.sponsor_name || field.template_name) && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {field.branding_org_name && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                🎨 {field.branding_org_name}
                              </span>
                            )}
                            {field.sponsor_name && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                💼 {field.sponsor_name}
                              </span>
                            )}
                            {field.template_name && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30">
                                ⚙️ {field.template_name}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
                      {field.status === "active" && field.expires_at && (
                        <div className="text-sm text-slate-400 hidden md:block">
                          {formatExpiration(field.expires_at)}
                        </div>
                      )}
                      {getStatusBadge(field.status)}
                      <div className="flex gap-1">
                        <Button
                          onClick={() => openPrintableSign(field)}
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] min-w-[44px] p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                          title="Field QR code & printable sign"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => openEditDialog(field)}
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] min-w-[44px] p-2"
                          title="Edit field"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => setDeleteField(field)}
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px] min-w-[44px] p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title="Delete field"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

          {/* Info Box */}
          <div className="mt-6 bg-slate-900/40 backdrop-blur-sm rounded-xl border border-slate-700 p-4">
            <h3 className="text-blue-400 font-medium mb-2">How Fields Work</h3>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Create a field for each physical location at your event</li>
              <li>• Fields start as "Pending" until the first game goes active</li>
              <li>• When a game on the field goes active, one field credit is consumed</li>
              <li>• Active fields expire 24 hours after activation</li>
              <li>• You can only schedule games on pending or active (non-expired) fields</li>
            </ul>
          </div>
        </div>

        {/* Edit Field Dialog */}
        <Dialog open={!!editField} onOpenChange={(open) => !open && setEditField(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Edit Field</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleEditField} className="space-y-4">
              <div>
                <Label htmlFor="editFieldName" className="text-slate-300">Field Name</Label>
                <Input
                  id="editFieldName"
                  value={editFieldName}
                  onChange={(e) => setEditFieldName(e.target.value)}
                  placeholder="e.g., Field 1, North Field, Main Stadium"
                  className="bg-slate-800 border-slate-700 text-white mt-1 min-h-[44px]"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditField(null)}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-500 text-white min-h-[44px]"
                >
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Field Dialog */}
        <Dialog open={!!deleteField} onOpenChange={(open) => !open && setDeleteField(null)}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Delete Field</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-slate-300">
                Are you sure you want to delete <strong>{deleteField?.name}</strong>?
              </p>
              <p className="text-slate-400 text-sm mt-2">
                This action cannot be undone. Fields with scheduled games cannot be deleted.
              </p>
              {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteField(null)}
                className="min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDeleteField}
                disabled={submitting}
                variant="destructive"
                className="min-h-[44px]"
              >
                {submitting ? "Deleting..." : "Delete Field"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
