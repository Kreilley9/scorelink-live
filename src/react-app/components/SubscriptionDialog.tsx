import { useState } from "react";
import { Button } from "@/react-app/components/ui/button";
import { Input } from "@/react-app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/react-app/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/react-app/components/ui/select";

interface SubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: number;
    mocha_user_id: string;
    email: string;
    organization_name?: string | null;
    subscription_tier?: string | null;
    fields_allowed?: number | null;
    subscription_start_date?: string | null;
    subscription_end_date?: string | null;
  };
  onSave: (userId: string, data: any) => Promise<void>;
}

export function SubscriptionDialog({ isOpen, onClose, user, onSave }: SubscriptionDialogProps) {
  const [organizationName, setOrganizationName] = useState(user.organization_name || "");
  const [tier, setTier] = useState(user.subscription_tier || "basic");
  const [fieldsAllowed, setFieldsAllowed] = useState(user.fields_allowed?.toString() || "5");
  const [startDate, setStartDate] = useState(
    user.subscription_start_date ? new Date(user.subscription_start_date).toISOString().split('T')[0] : 
    new Date().toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    user.subscription_end_date ? new Date(user.subscription_end_date).toISOString().split('T')[0] : 
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(user.mocha_user_id, {
        organization_name: organizationName,
        subscription_tier: tier,
        fields_allowed: parseInt(fieldsAllowed),
        subscription_start_date: startDate,
        subscription_end_date: endDate,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save subscription:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Subscription</DialogTitle>
          <DialogDescription>
            Configure subscription settings for {user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-2 block">Organization Name</label>
            <Input
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              placeholder="Enter organization name"
            />
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Subscription Tier</label>
            <Select value={tier} onValueChange={setTier}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic - $20/field/day</SelectItem>
                <SelectItem value="silver">Silver - $35/field/day</SelectItem>
                <SelectItem value="gold">Gold - $55/field/day</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm text-slate-400 mb-2 block">Fields Allowed</label>
            <Input
              type="number"
              value={fieldsAllowed}
              onChange={(e) => setFieldsAllowed(e.target.value)}
              min="1"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
