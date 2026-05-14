import { useAuth } from "@/react-app/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/react-app/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/react-app/components/ui/dialog";
import { UserPlus, Pencil, Trash2, Download, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { useSportAccount } from "@/react-app/hooks/useSportAccount";

interface Referee {
  id: number;
  name: string;
  phone_number: string;
  email?: string;
  is_active: boolean;
  created_at: string;
}

interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

export default function RefereeManagement() {
  const { user, isPending, redirectToLogin } = useAuth();
  const navigate = useNavigate();
  const { activeSportAccount } = useSportAccount();
  const [referees, setReferees] = useState<Referee[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingReferee, setEditingReferee] = useState<Referee | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone_number: "",
    email: "",
  });

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data);
          
          if (data.role !== "admin") {
            navigate("/");
          }
        }
      } catch (error) {
        console.error("Failed to fetch current user:", error);
      }
    };

    if (user) {
      fetchCurrentUser();
    }
  }, [user, navigate]);

  useEffect(() => {
    if (currentUser && activeSportAccount) {
      fetchReferees();
    }
  }, [currentUser, activeSportAccount]);

  const fetchReferees = async () => {
    if (!currentUser || currentUser.role !== "admin" || !activeSportAccount) return;

    try {
      const response = await fetch(`/api/referees?sport_account_id=${activeSportAccount.id}`);
      if (response.ok) {
        const data = await response.json();
        setReferees(data);
      }
    } catch (error) {
      console.error("Failed to fetch referees:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingReferee ? `/api/referees/${editingReferee.id}` : "/api/referees";
      const method = editingReferee ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sport_account_id: activeSportAccount?.id,
        }),
      });

      if (response.ok) {
        await fetchReferees();
        setIsAddDialogOpen(false);
        setEditingReferee(null);
        setFormData({ name: "", phone_number: "", email: "" });
      }
    } catch (error) {
      console.error("Failed to save referee:", error);
    }
  };

  const handleEdit = (referee: Referee) => {
    setEditingReferee(referee);
    setFormData({
      name: referee.name,
      phone_number: referee.phone_number,
      email: referee.email || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this referee?")) return;

    try {
      const response = await fetch(`/api/referees/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await fetchReferees();
      }
    } catch (error) {
      console.error("Failed to delete referee:", error);
    }
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setEditingReferee(null);
    setFormData({ name: "", phone_number: "", email: "" });
  };

  const downloadTemplate = () => {
    // Create sample data with headers
    const templateData = [
      {
        'Name': 'John Doe',
        'Phone Number': '+1 (555) 123-4567',
        'Email': 'john.doe@example.com',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Referees");

    // Generate and download file
    XLSX.writeFile(workbook, "referee_template.xlsx");
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<{
        'Name': string;
        'Phone Number': string;
        'Email'?: string;
      }>;

      if (jsonData.length === 0) {
        setUploadError("The uploaded file contains no data");
        return;
      }

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Validate required fields
        if (!row['Name'] || !row['Phone Number']) {
          errors.push(`Row ${i + 2}: Missing name or phone number`);
          errorCount++;
          continue;
        }

        try {
          const response = await fetch("/api/referees", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: row['Name'],
              phone_number: row['Phone Number'],
              email: row['Email'] || '',
              sport_account_id: activeSportAccount?.id,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            const error = await response.json();
            errors.push(`Row ${i + 2}: ${error.error || 'Failed to create referee'}`);
            errorCount++;
          }
        } catch (error) {
          errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          errorCount++;
        }
      }

      if (successCount > 0) {
        await fetchReferees();
        setUploadSuccess(`Successfully imported ${successCount} referee(s)`);
      }

      if (errorCount > 0) {
        setUploadError(`${errorCount} error(s) occurred:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`);
      }
    } catch (error) {
      setUploadError(`Failed to process file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Reset file input
    event.target.value = '';
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
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
          <p className="text-slate-400">You need to sign in to access this page</p>
          <Button onClick={redirectToLogin}>Sign in with Google</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Referee Management</h1>
            <p className="text-slate-400">Manage referee database and assignments</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate("/")} className="text-white">
              Back to Home
            </Button>
          </div>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              if (open) {
                setIsAddDialogOpen(true);
              } else {
                handleDialogClose();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Referee
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800">
                <DialogHeader>
                  <DialogTitle className="text-white">
                    {editingReferee ? "Edit Referee" : "Add New Referee"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Name *</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter referee name"
                      required
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Phone Number *</label>
                    <Input
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                      required
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="referee@example.com"
                      className="bg-slate-800/50 border-slate-700 text-white"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={handleDialogClose} className="text-white">
                      Cancel
                    </Button>
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                      {editingReferee ? "Update" : "Add"} Referee
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              onClick={downloadTemplate}
              className="border-blue-500 text-blue-300 hover:bg-blue-500/10 hover:text-blue-200"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Template
            </Button>

            <label>
              <Button 
                variant="outline" 
                className="border-green-500 text-green-300 hover:bg-green-500/10 hover:text-green-200 cursor-pointer"
                asChild
              >
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Referees
                </span>
              </Button>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {uploadSuccess && (
            <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400">
              {uploadSuccess}
            </div>
          )}

          {uploadError && (
            <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 whitespace-pre-line">
              {uploadError}
            </div>
          )}
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-blue-400">Name</TableHead>
                <TableHead className="text-blue-400">Phone Number</TableHead>
                <TableHead className="text-blue-400">Email</TableHead>
                <TableHead className="text-blue-400">Status</TableHead>
                <TableHead className="text-blue-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {referees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    No referees added yet. Click "Add Referee" to get started.
                  </TableCell>
                </TableRow>
              ) : (
                referees.map((referee) => (
                  <TableRow key={referee.id}>
                    <TableCell className="text-white font-medium">{referee.name}</TableCell>
                    <TableCell className="text-slate-300">{referee.phone_number}</TableCell>
                    <TableCell className="text-slate-300">{referee.email || "—"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        referee.is_active 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-slate-500/20 text-slate-400"
                      }`}>
                        {referee.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(referee)}
                          className="text-white"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(referee.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
