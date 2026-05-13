import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import { ArrowLeft, Plus, Pencil, Trash2, Star, Upload, X } from "lucide-react";
import { useSportAccount } from "@/react-app/hooks/useSportAccount";

interface Sponsor {
  id: number;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  additional_text: string | null;
}

export default function SponsorManagement() {
  const navigate = useNavigate();
  const { activeSportAccount } = useSportAccount();
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    logo_url: "",
    website_url: "",
    additional_text: "",
  });

  const fetchSponsors = async () => {
    if (!activeSportAccount) return;
    
    try {
      const response = await fetch(`/api/sponsors?sport_account_id=${activeSportAccount.id}`);
      if (response.ok) {
        const data = await response.json();
        setSponsors(data);
      }
    } catch (error) {
      console.error("Failed to fetch sponsors:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeSportAccount) {
      fetchSponsors();
    }
  }, [activeSportAccount]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("logo", file);

      const response = await fetch("/api/sponsors/upload-logo", {
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
      const url = editingSponsor
        ? `/api/sponsors/${editingSponsor.id}`
        : "/api/sponsors";
      const method = editingSponsor ? "PATCH" : "POST";

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
        setEditingSponsor(null);
        setFormData({
          name: "",
          logo_url: "",
          website_url: "",
          additional_text: "",
        });
        fetchSponsors();
      }
    } catch (error) {
      console.error("Failed to save sponsor:", error);
    }
  };

  const handleEdit = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setFormData({
      name: sponsor.name,
      logo_url: sponsor.logo_url || "",
      website_url: sponsor.website_url || "",
      additional_text: sponsor.additional_text || "",
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this sponsor?")) return;

    try {
      const response = await fetch(`/api/sponsors/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchSponsors();
      }
    } catch (error) {
      console.error("Failed to delete sponsor:", error);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingSponsor(null);
    setFormData({
      name: "",
      logo_url: "",
      website_url: "",
      additional_text: "",
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
              <h1 className="text-4xl font-black text-white mb-2">
                Sponsor Management
              </h1>
              <p className="text-slate-400">
                Manage sponsors that appear on your scoreboards
              </p>
            </div>
            {!showForm && (
              <Button
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Sponsor
              </Button>
            )}
          </div>
        </div>

        {showForm && (
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingSponsor ? "Edit Sponsor" : "Add New Sponsor"}
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Form Section */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">
                    Sponsor Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter sponsor name"
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
                            alt="Sponsor logo"
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

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">
                    Website URL
                  </label>
                  <Input
                    value={formData.website_url}
                    onChange={(e) =>
                      setFormData({ ...formData, website_url: e.target.value })
                    }
                    placeholder="https://example.com"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                </div>

                <div>
                  <label className="text-sm text-slate-400 mb-2 block">
                    Additional Text (optional)
                  </label>
                  <Input
                    value={formData.additional_text}
                    onChange={(e) =>
                      setFormData({ ...formData, additional_text: e.target.value })
                    }
                    placeholder="Your local hardware store"
                    className="bg-slate-800/50 border-slate-700 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    A tagline or description shown below the sponsor name
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={uploading}
                  >
                    {editingSponsor ? "Update" : "Add"} Sponsor
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

              {/* Preview Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-3">Scoreboard Preview</h3>
                  <p className="text-sm text-slate-400 mb-4">
                    This is how your sponsor will appear on the scoreboard
                  </p>
                </div>

                {/* Mobile Scoreboard Preview */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-slate-700 rounded-xl p-4">
                  <div className="text-xs text-slate-500 mb-3 text-center">Mobile View</div>
                  
                  {/* Mock scoreboard content */}
                  <div className="bg-slate-800/50 rounded-lg p-3 mb-3 border border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                      <div className="text-center flex-1">
                        <div className="text-xs text-slate-400 mb-1">HOME</div>
                        <div className="text-3xl font-black text-blue-400">14</div>
                      </div>
                      <div className="text-2xl font-black text-slate-600 px-2">VS</div>
                      <div className="text-center flex-1">
                        <div className="text-xs text-slate-400 mb-1">AWAY</div>
                        <div className="text-3xl font-black text-blue-400">21</div>
                      </div>
                    </div>
                  </div>

                  {/* Sponsor banner preview */}
                  <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-3">
                    <div className="text-center">
                      <div className="text-xs text-slate-400 mb-2">GAME BROUGHT TO YOU BY</div>
                      
                      {formData.logo_url && (
                        <div className="bg-white rounded-lg p-2 mb-2 max-w-[200px] mx-auto">
                          {formData.website_url ? (
                            <a
                              href={formData.website_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <img
                                src={formData.logo_url}
                                alt="Sponsor preview"
                                className="max-h-12 max-w-full object-contain mx-auto"
                              />
                            </a>
                          ) : (
                            <img
                              src={formData.logo_url}
                              alt="Sponsor preview"
                              className="max-h-12 max-w-full object-contain mx-auto"
                            />
                          )}
                        </div>
                      )}
                      
                      {formData.name ? (
                        formData.website_url ? (
                          <a
                            href={formData.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 font-bold text-sm hover:text-blue-300 transition-colors block mb-1"
                          >
                            {formData.name}
                          </a>
                        ) : (
                          <div className="text-blue-400 font-bold text-sm mb-1">
                            {formData.name}
                          </div>
                        )
                      ) : (
                        <div className="text-slate-500 text-sm mb-1 italic">
                          Sponsor name will appear here
                        </div>
                      )}
                      
                      {formData.additional_text && (
                        <div className="text-slate-400 text-xs">
                          {formData.additional_text}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center text-slate-400 py-12">
            Loading sponsors...
          </div>
        ) : sponsors.length === 0 ? (
          <div className="text-center py-12">
            <Star className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400">No sponsors yet</p>
            <p className="text-slate-500 text-sm mt-2">
              Add your first sponsor to start displaying them on scoreboards
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6"
              >
                {sponsor.logo_url && (
                  <div className="mb-4 h-24 flex items-center justify-center bg-white rounded-lg">
                    <img
                      src={sponsor.logo_url}
                      alt={sponsor.name}
                      className="max-h-20 max-w-full object-contain"
                    />
                  </div>
                )}
                <h3 className="text-xl font-bold text-white mb-1">
                  {sponsor.name}
                </h3>
                {sponsor.additional_text && (
                  <p className="text-sm text-slate-400 mb-3">
                    {sponsor.additional_text}
                  </p>
                )}
                {sponsor.website_url && (
                  <a
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-400 hover:text-blue-300 mb-4 block truncate"
                  >
                    {sponsor.website_url}
                  </a>
                )}
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={() => handleEdit(sponsor)}
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                  >
                    <Pencil className="w-3 h-3" />
                    Edit
                  </Button>
                  <Button
                    onClick={() => handleDelete(sponsor.id)}
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
