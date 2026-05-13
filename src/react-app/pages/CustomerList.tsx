import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/react-app/components/ui/dialog";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/react-app/components/ui/select";
import { ArrowLeft, Search, TrendingUp, Calendar, Users, Gamepad2, LogOut, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@getmocha/users-service/react";
import Footer from "@/react-app/components/Footer";
import { SPORTS, SportType } from "@/data/sports";

interface Customer {
  id: number;
  email: string;
  organization_name: string;
  subscription_tier: string;
  subscription_start_date: string;
  subscription_end_date: string;
  fields_allowed: number;
  created_at: string;
  active_games: number;
  scheduled_games: number;
  completed_games: number;
  total_referees: number;
  total_sponsors: number;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  street_1?: string;
  street_2?: string;
  city?: string;
  state_province?: string;
  country?: string;
  zip_code?: string;
  sport_accounts?: SportAccount[];
}

interface SportAccount {
  id: number;
  user_id: number;
  sport_type: string;
  organization_name: string | null;
  subscription_tier: string;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  fields_allowed: number;
  billing_period: string;
  is_active: boolean;
}

export default function CustomerList() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    email: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    organization_name: "",
    street_1: "",
    street_2: "",
    city: "",
    state_province: "",
    country: "",
    zip_code: "",
    sport_type: "flag_football" as SportType,
    subscription_tier: "free",
    fields_allowed: 1,
    billing_period: "monthly",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/admin/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async () => {
    try {
      const res = await fetch("/api/admin/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchCustomers();
        setCreateDialogOpen(false);
        resetForm();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create customer");
      }
    } catch (error) {
      console.error("Failed to create customer:", error);
      alert("Failed to create customer");
    }
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      const res = await fetch(`/api/admin/customers/${selectedCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchCustomers();
        setEditDialogOpen(false);
        setSelectedCustomer(null);
        resetForm();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to update customer");
      }
    } catch (error) {
      console.error("Failed to update customer:", error);
      alert("Failed to update customer");
    }
  };

  const handleDeleteCustomer = async (customer: Customer) => {
    if (!confirm(`Delete customer ${customer.email}? This will also delete all their sport accounts, games, fields, and other data. This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/customers/${customer.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await fetchCustomers();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete customer");
      }
    } catch (error) {
      console.error("Failed to delete customer:", error);
      alert("Failed to delete customer");
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setCreateDialogOpen(true);
  };

  const openEditDialog = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      email: customer.email,
      first_name: customer.first_name || "",
      last_name: customer.last_name || "",
      phone_number: customer.phone_number || "",
      organization_name: customer.organization_name || "",
      street_1: customer.street_1 || "",
      street_2: customer.street_2 || "",
      city: customer.city || "",
      state_province: customer.state_province || "",
      country: customer.country || "",
      zip_code: customer.zip_code || "",
      sport_type: (customer.sport_accounts?.[0]?.sport_type as SportType) || "flag_football",
      subscription_tier: customer.subscription_tier || "free",
      fields_allowed: customer.fields_allowed || 1,
      billing_period: customer.sport_accounts?.[0]?.billing_period || "monthly",
    });
    setEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      email: "",
      first_name: "",
      last_name: "",
      phone_number: "",
      organization_name: "",
      street_1: "",
      street_2: "",
      city: "",
      state_province: "",
      country: "",
      zip_code: "",
      sport_type: "flag_football",
      subscription_tier: "free",
      fields_allowed: 1,
      billing_period: "monthly",
    });
  };

  const filteredCustomers = customers.filter(
    (c) =>
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.organization_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTierColor = (tier: string) => {
    switch (tier) {
      case "premium":
        return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      case "standard":
        return "bg-primary/10 text-primary border-primary/30";
      case "basic":
      case "free":
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/30";
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
        return tier || "None";
    }
  };

  const isExpiringSoon = (endDate: string) => {
    if (!endDate) return false;
    const daysUntilExpiry = Math.floor(
      (new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry > 0 && daysUntilExpiry <= 14;
  };

  const isExpired = (endDate: string) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
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
            Customer Management
          </h1>
          <p className="text-slate-400">
            View and manage all event coordinators
          </p>

          <div className="relative max-w-md mt-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by email or organization..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>

        <div className="mb-6">
          <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" />
            Add Customer
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCustomers.map((customer) => (
              <div
                key={customer.id}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 hover:border-primary/30 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-white">
                        {customer.organization_name || "Unnamed Organization"}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold border uppercase ${getTierColor(
                          customer.subscription_tier
                        )}`}
                      >
                        {getTierLabel(customer.subscription_tier)}
                      </span>
                      {isExpired(customer.subscription_end_date) && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                          Expired
                        </span>
                      )}
                      {isExpiringSoon(customer.subscription_end_date) && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Expiring Soon
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm mb-3">{customer.email}</p>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatBadge
                        icon={<Gamepad2 className="w-4 h-4" />}
                        label="Active Games"
                        value={customer.active_games}
                        color="green"
                      />
                      <StatBadge
                        icon={<Calendar className="w-4 h-4" />}
                        label="Scheduled"
                        value={customer.scheduled_games}
                        color="amber"
                      />
                      <StatBadge
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="Completed"
                        value={customer.completed_games}
                        color="blue"
                      />
                      <StatBadge
                        icon={<Users className="w-4 h-4" />}
                        label="Referees"
                        value={customer.total_referees}
                        color="blue"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-sm">
                    <div className="text-slate-400">
                      Fields: <span className="text-white font-semibold">{customer.fields_allowed}</span>
                    </div>
                    {customer.subscription_start_date && (
                      <div className="text-slate-400">
                        Started: <span className="text-white">{new Date(customer.subscription_start_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    {customer.subscription_end_date && (
                      <div className="text-slate-400">
                        Expires: <span className="text-white">{new Date(customer.subscription_end_date).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="text-slate-400">
                      Member since: <span className="text-white">{new Date(customer.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-700">
                  <Button
                    size="sm"
                    onClick={() => openEditDialog(customer)}
                    className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40"
                  >
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCustomer(customer)}
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))}

            {filteredCustomers.length === 0 && (
              <div className="text-center py-20">
                <p className="text-slate-400">No customers found</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Customer Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Customer</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a new coordinator account with sport account
            </DialogDescription>
          </DialogHeader>
          <CustomerForm formData={formData} setFormData={setFormData} />
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCustomer} className="bg-primary hover:bg-primary/90">Create Customer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Customer</DialogTitle>
            <DialogDescription className="text-slate-400">
              Update customer information and subscription details
            </DialogDescription>
          </DialogHeader>
          <CustomerForm formData={formData} setFormData={setFormData} isEdit />
          <div className="flex gap-2 justify-end pt-4">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleEditCustomer} className="bg-primary hover:bg-primary/90">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}

function CustomerForm({ formData, setFormData, isEdit = false }: { 
  formData: any; 
  setFormData: (data: any) => void;
  isEdit?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-300">Email *</Label>
          <Input
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="coordinator@league.com"
            className="bg-slate-800 border-slate-700 text-white"
            disabled={isEdit}
          />
        </div>
        <div>
          <Label className="text-slate-300">Organization Name</Label>
          <Input
            value={formData.organization_name}
            onChange={(e) => setFormData({ ...formData, organization_name: e.target.value })}
            placeholder="Thunder Youth League"
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-slate-300">First Name</Label>
          <Input
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div>
          <Label className="text-slate-300">Last Name</Label>
          <Input
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      <div>
        <Label className="text-slate-300">Phone Number</Label>
        <Input
          value={formData.phone_number}
          onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
          placeholder="+1 (555) 123-4567"
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>

      <div>
        <Label className="text-slate-300">Street Address 1</Label>
        <Input
          value={formData.street_1}
          onChange={(e) => setFormData({ ...formData, street_1: e.target.value })}
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>

      <div>
        <Label className="text-slate-300">Street Address 2</Label>
        <Input
          value={formData.street_2}
          onChange={(e) => setFormData({ ...formData, street_2: e.target.value })}
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label className="text-slate-300">City</Label>
          <Input
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div>
          <Label className="text-slate-300">State/Province</Label>
          <Input
            value={formData.state_province}
            onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        <div>
          <Label className="text-slate-300">Zip Code</Label>
          <Input
            value={formData.zip_code}
            onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
      </div>

      <div>
        <Label className="text-slate-300">Country</Label>
        <Input
          value={formData.country}
          onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          className="bg-slate-800 border-slate-700 text-white"
        />
      </div>

      <div className="border-t border-slate-700 pt-4 mt-4">
        <h3 className="text-lg font-semibold text-white mb-4">Sport & Subscription</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-slate-300">Sport Type</Label>
            <Select
              value={formData.sport_type}
              onValueChange={(value) => setFormData({ ...formData, sport_type: value })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {SPORTS.map((sport) => (
                  <SelectItem key={sport.id} value={sport.id} className="text-white">
                    {sport.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300">Subscription Tier</Label>
            <Select
              value={formData.subscription_tier}
              onValueChange={(value) => setFormData({ ...formData, subscription_tier: value })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="free" className="text-white">Free</SelectItem>
                <SelectItem value="basic" className="text-white">Basic</SelectItem>
                <SelectItem value="standard" className="text-white">Standard</SelectItem>
                <SelectItem value="premium" className="text-white">Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <Label className="text-slate-300">Fields Allowed</Label>
            <Input
              type="number"
              value={formData.fields_allowed}
              onChange={(e) => setFormData({ ...formData, fields_allowed: parseInt(e.target.value) || 1 })}
              min="1"
              className="bg-slate-800 border-slate-700 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300">Billing Period</Label>
            <Select
              value={formData.billing_period}
              onValueChange={(value) => setFormData({ ...formData, billing_period: value })}
            >
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="monthly" className="text-white">Monthly</SelectItem>
                <SelectItem value="annual" className="text-white">Annual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBadge({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "green" | "amber" | "blue";
}) {
  const colors = {
    green: "bg-green-500/10 text-green-400 border-green-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    blue: "bg-primary/10 text-primary border-primary/20",
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors[color]}`}>
      {icon}
      <div>
        <p className="text-xs opacity-70">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}
