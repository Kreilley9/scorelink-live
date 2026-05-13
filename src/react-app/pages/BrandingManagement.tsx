import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { ArrowLeft, Plus, Pencil, Trash2, Palette, Upload, X } from "lucide-react";
import { useSportAccount } from "@/react-app/hooks/useSportAccount";

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

export default function BrandingManagement() {
  const navigate = useNavigate();
  const { activeSportAccount } = useSportAccount();
  const [brandings, setBrandings] = useState<Branding[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBranding, setEditingBranding] = useState<Branding | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    organization_name: "",
    logo_url: "",
    primary_color: "#f59e0b",
    secondary_color: "#0ea5e9",
    background_color: "#0f172a",
    text_color: "#ffffff",
    accent_color: "#fbbf24",
  });

  const fetchBrandings = async () => {
    if (!activeSportAccount) return;
    
    try {
      const response = await fetch(`/api/brandings?sport_account_id=${activeSportAccount.id}`);
      if (response.ok) {
        const data = await response.json();
        setBrandings(data);
      }
    } catch (error) {
      console.error("Failed to fetch brandings:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSportAccount) {
      fetchBrandings();
    }
  }, [activeSportAccount]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("logo", file);

      const response = await fetch("/api/brandings/upload-logo", {
        method: "POST",
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.logoUrl) {
          console.log("Logo uploaded successfully, URL:", data.logoUrl);
          setFormData({ ...formData, logo_url: data.logoUrl });
        } else if (data.error) {
          alert(data.error);
        }
      } else {
        const errorData = await response.json();
        console.error("Upload failed:", response.status, errorData);
        alert(errorData.error || "Failed to upload logo. File storage works in published apps.");
      }
    } catch (error) {
      console.error("Failed to upload logo:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingBranding
        ? `/api/brandings/${editingBranding.id}`
        : "/api/brandings";
      const method = editingBranding ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sport_account_id: activeSportAccount?.id,
        }),
      });

      if (response.ok) {
        setShowForm(false);
        setEditingBranding(null);
        setFormData({
          organization_name: "",
          logo_url: "",
          primary_color: "#f59e0b",
          secondary_color: "#0ea5e9",
          background_color: "#0f172a",
          text_color: "#ffffff",
          accent_color: "#fbbf24",
        });
        fetchBrandings();
      }
    } catch (error) {
      console.error("Failed to save branding:", error);
    }
  };

  const handleEdit = (branding: Branding) => {
    setEditingBranding(branding);
    setFormData({
      organization_name: branding.organization_name,
      logo_url: branding.logo_url || "",
      primary_color: branding.primary_color,
      secondary_color: branding.secondary_color,
      background_color: branding.background_color,
      text_color: branding.text_color,
      accent_color: branding.accent_color,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this branding?")) return;

    try {
      const response = await fetch(`/api/brandings/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchBrandings();
      }
    } catch (error) {
      console.error("Failed to delete branding:", error);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingBranding(null);
    setFormData({
      organization_name: "",
      logo_url: "",
      primary_color: "#f59e0b",
      secondary_color: "#0ea5e9",
      background_color: "#0f172a",
      text_color: "#ffffff",
      accent_color: "#fbbf24",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent"></div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <Button
            onClick={() => navigate("/")}
            variant="outline"
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>

          <div className="flex justify-between items-center">
            <div>
              <h1
                className="text-4xl font-black text-white mb-2"
                style={{ fontFamily: "Orbitron, monospace" }}
              >
                Branding Management
              </h1>
              <p className="text-slate-400">
                Customize scoreboard colors and branding
              </p>
            </div>
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Branding
              </Button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingBranding ? "Edit Branding" : "Create New Branding"}
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Form Section */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">
                    Organization Name
                  </label>
                  <Input
                    value={formData.organization_name}
                    onChange={(e) =>
                      setFormData({ ...formData, organization_name: e.target.value })
                    }
                    placeholder="Enter organization name"
                    className="bg-slate-800/50 border-slate-700 text-white"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">
                    Logo
                  </label>
                  <div className="space-y-3">
                    {formData.logo_url ? (
                      <div className="relative bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-slate-400">Logo uploaded</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setFormData({ ...formData, logo_url: "" })}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="bg-white rounded-lg p-4 flex items-center justify-center">
                          <img
                            src={formData.logo_url}
                            alt="Organization logo"
                            className="max-h-24 max-w-full object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="logo-upload"
                          disabled={uploading}
                        />
                        <label
                          htmlFor="logo-upload"
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
                        >
                          <Upload className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-300">
                            {uploading ? "Uploading..." : "Upload Logo"}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Primary Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) =>
                          setFormData({ ...formData, primary_color: e.target.value })
                        }
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={formData.primary_color}
                        onChange={(e) =>
                          setFormData({ ...formData, primary_color: e.target.value })
                        }
                        className="bg-slate-800/50 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Secondary Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.secondary_color}
                        onChange={(e) =>
                          setFormData({ ...formData, secondary_color: e.target.value })
                        }
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={formData.secondary_color}
                        onChange={(e) =>
                          setFormData({ ...formData, secondary_color: e.target.value })
                        }
                        className="bg-slate-800/50 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Background Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.background_color}
                        onChange={(e) =>
                          setFormData({ ...formData, background_color: e.target.value })
                        }
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={formData.background_color}
                        onChange={(e) =>
                          setFormData({ ...formData, background_color: e.target.value })
                        }
                        className="bg-slate-800/50 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Text Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.text_color}
                        onChange={(e) =>
                          setFormData({ ...formData, text_color: e.target.value })
                        }
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={formData.text_color}
                        onChange={(e) =>
                          setFormData({ ...formData, text_color: e.target.value })
                        }
                        className="bg-slate-800/50 border-slate-700 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-slate-400 mb-2 block">
                      Accent Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.accent_color}
                        onChange={(e) =>
                          setFormData({ ...formData, accent_color: e.target.value })
                        }
                        className="w-12 h-10 rounded cursor-pointer"
                      />
                      <Input
                        value={formData.accent_color}
                        onChange={(e) =>
                          setFormData({ ...formData, accent_color: e.target.value })
                        }
                        className="bg-slate-800/50 border-slate-700 text-white"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingBranding ? "Update" : "Create"} Branding
                  </Button>
                  <Button
                    type="button"
                    onClick={cancelForm}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </form>

              {/* Scoreboard Preview Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Scoreboard Preview</h3>
                  <p className="text-sm text-slate-400">See how your branding will look</p>
                </div>
                
                <div 
                  className="rounded-2xl overflow-hidden border-4 shadow-2xl"
                  style={{ 
                    backgroundColor: formData.background_color,
                    borderColor: formData.primary_color
                  }}
                >
                  {/* Header with Logo */}
                  <div 
                    className="py-4 px-6 flex items-center justify-center border-b-2"
                    style={{ 
                      backgroundColor: formData.primary_color,
                      borderColor: formData.accent_color
                    }}
                  >
                    {formData.logo_url ? (
                      <img 
                        src={formData.logo_url} 
                        alt={formData.organization_name}
                        className="h-12 max-w-[200px] object-contain"
                      />
                    ) : (
                      <span 
                        className="text-2xl font-black"
                        style={{ color: formData.text_color }}
                      >
                        {formData.organization_name || "Your Organization"}
                      </span>
                    )}
                  </div>

                  {/* Score Section */}
                  <div className="py-8 px-6">
                    <div className="grid grid-cols-3 gap-4 items-center">
                      {/* Home Team */}
                      <div className="text-center">
                        <div 
                          className="text-xs font-semibold mb-2 uppercase tracking-wider"
                          style={{ color: formData.secondary_color }}
                        >
                          Home
                        </div>
                        <div 
                          className="text-5xl font-black mb-2"
                          style={{ color: formData.accent_color }}
                        >
                          21
                        </div>
                        <div 
                          className="text-sm font-medium"
                          style={{ color: formData.text_color }}
                        >
                          Eagles
                        </div>
                      </div>

                      {/* Period/Clock */}
                      <div className="text-center">
                        <div 
                          className="text-xs font-semibold mb-2 uppercase tracking-wider"
                          style={{ color: formData.secondary_color }}
                        >
                          2nd Period
                        </div>
                        <div 
                          className="text-4xl font-black"
                          style={{ color: formData.text_color }}
                        >
                          8:42
                        </div>
                      </div>

                      {/* Away Team */}
                      <div className="text-center">
                        <div 
                          className="text-xs font-semibold mb-2 uppercase tracking-wider"
                          style={{ color: formData.secondary_color }}
                        >
                          Away
                        </div>
                        <div 
                          className="text-5xl font-black mb-2"
                          style={{ color: formData.accent_color }}
                        >
                          14
                        </div>
                        <div 
                          className="text-sm font-medium"
                          style={{ color: formData.text_color }}
                        >
                          Tigers
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Accent */}
                  <div 
                    className="h-3"
                    style={{ backgroundColor: formData.accent_color }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 py-12">
            Loading brandings...
          </div>
        ) : brandings.length === 0 ? (
          <div className="text-center py-12">
            <Palette className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">No brandings yet</p>
            <p className="text-slate-500 text-sm mt-2">
              Create your first branding configuration
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {brandings.map((branding) => (
              <div
                key={branding.id}
                className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6"
              >
                <div className="mb-4">
                  {branding.logo_url && (
                    <div className="mb-4 h-20 flex items-center justify-center bg-slate-800/50 rounded-lg">
                      <img
                        src={branding.logo_url}
                        alt={branding.organization_name}
                        className="max-h-16 max-w-full object-contain"
                      />
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-white mb-4">
                    {branding.organization_name}
                  </h3>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Primary</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border border-slate-700"
                        style={{ backgroundColor: branding.primary_color }}
                      ></div>
                      <span className="text-xs text-slate-500 font-mono">
                        {branding.primary_color}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Secondary</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border border-slate-700"
                        style={{ backgroundColor: branding.secondary_color }}
                      ></div>
                      <span className="text-xs text-slate-500 font-mono">
                        {branding.secondary_color}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Accent</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded border border-slate-700"
                        style={{ backgroundColor: branding.accent_color }}
                      ></div>
                      <span className="text-xs text-slate-500 font-mono">
                        {branding.accent_color}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => handleEdit(branding)}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(branding.id)}
                    variant="outline"
                    size="sm"
                    className="gap-2 text-red-400 border-red-400/30 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
