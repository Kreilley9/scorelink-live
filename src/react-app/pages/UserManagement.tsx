import { useAuth } from "@/react-app/hooks/useAuth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/react-app/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";
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
} from "@/react-app/components/ui/dialog";
import { Input } from "@/react-app/components/ui/input";
import { Label } from "@/react-app/components/ui/label";
import { SubscriptionDialog } from "@/react-app/components/SubscriptionDialog";
import { Settings, UserPlus, X, Mail, Pencil, Trash2 } from "lucide-react";

interface User {
  id: number;
  clerk_user_id: string;
  email: string;
  role: string;
  subscription_tier?: string | null;
  organization_name?: string | null;
  fields_allowed?: number | null;
  subscription_start_date?: string | null;
  subscription_end_date?: string | null;
  created_at: string;
}

interface CurrentUser {
  id: string;
  email: string;
  role: string;
}

interface Field {
  id: number;
  name: string;
  status: string;
  coordinator_user_id: number;
}

interface FieldAssignment {
  id: number;
  user_id: number;
  field_id: number;
  field_name: string;
  field_status: string;
  created_at: string;
}

export default function UserManagement() {
  const { user, isPending, redirectToLogin, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedUserForAssignment, setSelectedUserForAssignment] = useState<User | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [assignments, setAssignments] = useState<FieldAssignment[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("referee");
  const [inviteError, setInviteError] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editOrgName, setEditOrgName] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch("/api/users/me");
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data);
          
          if (!["admin", "coordinator"].includes(data.role)) {
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
    const fetchData = async () => {
      if (!currentUser || !["admin", "coordinator"].includes(currentUser.role)) return;

      try {
        const [usersRes, fieldsRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/fields"),
        ]);
        
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(data);
        }
        
        if (fieldsRes.ok) {
          const fieldsData = await fieldsRes.json();
          setFields(fieldsData);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setUsers(users.map(u => 
          u.clerk_user_id === userId ? { ...u, role: newRole } : u
        ));
      }
    } catch (error) {
      console.error("Failed to update role:", error);
    }
  };

  const handleSubscriptionUpdate = async (userId: string, data: any) => {
    try {
      const response = await fetch(`/api/users/${userId}/subscription`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUsers(users.map(u => 
          u.clerk_user_id === userId ? { ...u, ...updatedUser } : u
        ));
      }
    } catch (error) {
      console.error("Failed to update subscription:", error);
      throw error;
    }
  };

  const openSubscriptionDialog = (user: User) => {
    setSelectedUser(user);
    setSubscriptionDialogOpen(true);
  };

  const openAssignDialog = async (user: User) => {
    setSelectedUserForAssignment(user);
    setAssignDialogOpen(true);
    
    // Fetch current assignments
    try {
      const response = await fetch(`/api/users/${user.id}/field-assignments`);
      if (response.ok) {
        const data = await response.json();
        setAssignments(data);
      }
    } catch (error) {
      console.error("Failed to fetch assignments:", error);
    }
  };

  const handleAssignField = async (fieldId: number) => {
    if (!selectedUserForAssignment) return;
    
    try {
      const response = await fetch(`/api/users/${selectedUserForAssignment.id}/field-assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field_id: fieldId }),
      });
      
      if (response.ok) {
        // Refresh assignments
        const assignmentsRes = await fetch(`/api/users/${selectedUserForAssignment.id}/field-assignments`);
        if (assignmentsRes.ok) {
          const data = await assignmentsRes.json();
          setAssignments(data);
        }
      }
    } catch (error) {
      console.error("Failed to assign field:", error);
    }
  };

  const handleRemoveAssignment = async (assignmentId: number, userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/field-assignments/${assignmentId}`, {
        method: "DELETE",
      });
      
      if (response.ok) {
        setAssignments(assignments.filter(a => a.id !== assignmentId));
      }
    } catch (error) {
      console.error("Failed to remove assignment:", error);
    }
  };

  const handleInviteUser = async () => {
    setInviteError("");
    
    if (!inviteEmail || !inviteRole) {
      setInviteError("Email and role are required");
      return;
    }
    
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        setInviteError(data.error || "Failed to invite user");
        return;
      }
      
      const newUser = await response.json();
      setUsers([...users, newUser]);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("referee");
    } catch (error) {
      console.error("Failed to invite user:", error);
      setInviteError("An error occurred");
    }
  };

  const openEditDialog = (user: User) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditOrgName(user.organization_name || "");
    setEditError("");
    setEditDialogOpen(true);
  };

  const handleEditUser = async () => {
    if (!editingUser) return;
    
    setEditError("");
    
    if (!editEmail) {
      setEditError("Email is required");
      return;
    }
    
    try {
      const response = await fetch(`/api/users/${editingUser.clerk_user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: editEmail,
          organization_name: editOrgName || null,
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        setEditError(data.error || "Failed to update user");
        return;
      }
      
      const updatedUser = await response.json();
      setUsers(users.map(u => 
        u.clerk_user_id === editingUser.clerk_user_id ? updatedUser : u
      ));
      setEditDialogOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error("Failed to update user:", error);
      setEditError("An error occurred");
    }
  };

  const openDeleteDialog = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const response = await fetch(`/api/users/${userToDelete.clerk_user_id}`, {
        method: "DELETE",
      });
      
      if (!response.ok) {
        const data = await response.json();
        alert(data.error || "Failed to delete user");
        return;
      }
      
      setUsers(users.filter(u => u.clerk_user_id !== userToDelete.clerk_user_id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("An error occurred");
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
          <p className="text-slate-400">You need to sign in to access this page</p>
          <Button onClick={redirectToLogin}>Sign in with Google</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
            <p className="text-slate-400">Manage user roles and permissions</p>
          </div>
          <div className="flex gap-2 md:gap-4 w-full md:w-auto">
            <Button 
              onClick={() => setInviteDialogOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white gap-2 flex-1 md:flex-none min-h-[44px]"
            >
              <UserPlus className="w-4 h-4" />
              <span className="hidden sm:inline">Invite User</span>
              <span className="sm:hidden">Invite</span>
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="min-h-[44px]">
              <span className="hidden md:inline">Back to Home</span>
              <span className="md:hidden">Back</span>
            </Button>
            <Button variant="destructive" onClick={logout} className="min-h-[44px] hidden md:flex">
              Sign Out
            </Button>
          </div>
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-primary">Email</TableHead>
                <TableHead className="text-primary">Role</TableHead>
                <TableHead className="text-primary">Joined</TableHead>
                <TableHead className="text-primary">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="text-white">{u.email}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      u.role === "admin" ? "bg-red-500/20 text-red-400" :
                      u.role === "coordinator" ? "bg-primary/20 text-primary" :
                      u.role === "referee" ? "bg-accent/20 text-accent" :
                      "bg-slate-500/20 text-slate-400"
                    }`}>
                      {u.role}
                    </span>
                    {u.role === "coordinator" && u.subscription_tier && (
                      <span className="ml-2 px-2 py-1 rounded text-xs font-medium bg-slate-700 text-slate-300 capitalize">
                        {u.subscription_tier}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {new Date(u.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Select
                        value={u.role}
                        onValueChange={(value) => handleRoleChange(u.clerk_user_id, value)}
                        disabled={currentUser?.id === u.clerk_user_id}
                      >
                        <SelectTrigger className="w-32 min-h-[44px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="coordinator">Coordinator</SelectItem>
                          <SelectItem value="referee">Referee</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      {currentUser?.role === "admin" && (
                        <>
                          <Button
                            onClick={() => openEditDialog(u)}
                            variant="ghost"
                            size="sm"
                            className="min-h-[44px]"
                            title="Edit user"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {currentUser?.id !== u.clerk_user_id && (
                            <Button
                              onClick={() => openDeleteDialog(u)}
                              variant="ghost"
                              size="sm"
                              className="min-h-[44px] text-red-400 hover:text-red-300"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </>
                      )}
                      {u.role === "coordinator" && (
                        <Button
                          onClick={() => openSubscriptionDialog(u)}
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px]"
                          title="Manage subscription"
                        >
                          <Settings className="w-4 h-4" />
                        </Button>
                      )}
                      {(u.role === "coordinator" || u.role === "referee" || u.role === "viewer") && (
                        <Button
                          onClick={() => openAssignDialog(u)}
                          variant="ghost"
                          size="sm"
                          className="min-h-[44px]"
                          title="Manage field access"
                        >
                          <UserPlus className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {selectedUser && (
          <SubscriptionDialog
            isOpen={subscriptionDialogOpen}
            onClose={() => setSubscriptionDialogOpen(false)}
            user={selectedUser}
            onSave={handleSubscriptionUpdate}
          />
        )}

        {/* Invite User Dialog */}
        <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Invite New User</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-slate-300">Email Address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white min-h-[44px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-role" className="text-slate-300">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currentUser?.role === "admin" && (
                      <>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="coordinator">Coordinator</SelectItem>
                      </>
                    )}
                    <SelectItem value="referee">Referee</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {inviteError && (
                <p className="text-red-400 text-sm">{inviteError}</p>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setInviteDialogOpen(false);
                    setInviteEmail("");
                    setInviteRole("referee");
                    setInviteError("");
                  }}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleInviteUser}
                  className="bg-primary hover:bg-primary/90 text-white min-h-[44px]"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Field Assignment Dialog */}
        {selectedUserForAssignment && (
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl text-white">
                  Manage Field Access - {selectedUserForAssignment.email}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Current Assignments */}
                <div>
                  <h3 className="text-sm font-medium text-primary mb-3">Current Field Access</h3>
                  {assignments.length === 0 ? (
                    <p className="text-sm text-slate-400">No field assignments yet</p>
                  ) : (
                    <div className="space-y-2">
                      {assignments.map((assignment) => (
                        <div
                          key={assignment.id}
                          className="flex items-center justify-between bg-slate-800 rounded p-3"
                        >
                          <div>
                            <div className="text-white font-medium">{assignment.field_name}</div>
                            <div className="text-xs text-slate-400">
                              Status: {assignment.field_status}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveAssignment(assignment.id, selectedUserForAssignment.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Available Fields to Assign */}
                <div>
                  <h3 className="text-sm font-medium text-primary mb-3">Add Field Access</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {fields
                      .filter(f => !assignments.some(a => a.field_id === f.id))
                      .map((field) => (
                        <div
                          key={field.id}
                          className="flex items-center justify-between bg-slate-800 rounded p-3"
                        >
                          <div>
                            <div className="text-white font-medium">{field.name}</div>
                            <div className="text-xs text-slate-400">
                              Status: {field.status}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => handleAssignField(field.id)}
                            className="bg-primary hover:bg-primary/90 text-white"
                          >
                            Assign
                          </Button>
                        </div>
                      ))}
                    {fields.filter(f => !assignments.some(a => a.field_id === f.id)).length === 0 && (
                      <p className="text-sm text-slate-400">All fields already assigned</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-700">
                  <Button onClick={() => setAssignDialogOpen(false)} variant="outline" className="min-h-[44px]">
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Edit User Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Edit User</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email" className="text-slate-300">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  placeholder="user@example.com"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white min-h-[44px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-org" className="text-slate-300">Organization Name (optional)</Label>
                <Input
                  id="edit-org"
                  type="text"
                  placeholder="Organization name"
                  value={editOrgName}
                  onChange={(e) => setEditOrgName(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white min-h-[44px]"
                />
              </div>

              {editError && (
                <p className="text-red-400 text-sm">{editError}</p>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditDialogOpen(false);
                    setEditingUser(null);
                    setEditError("");
                  }}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleEditUser}
                  className="bg-primary hover:bg-primary/90 text-white min-h-[44px]"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete User Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Delete User</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-slate-300">
                Are you sure you want to delete <strong className="text-white">{userToDelete?.email}</strong>?
              </p>
              <p className="text-sm text-red-400">
                This will permanently delete the user and all their associated data including fields, games, referees, and sponsors. This action cannot be undone.
              </p>

              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setUserToDelete(null);
                  }}
                  className="min-h-[44px]"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleDeleteUser}
                  variant="destructive"
                  className="min-h-[44px]"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete User
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
