import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Phone, Mail, User } from "lucide-react";

export default function EmployeesPanel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", username: "", email: "", password: "", role: "employee" });

  const { data: employees, isLoading } = useQuery({
    queryKey: [api.admin.allEmployees.path],
    queryFn: async () => {
      const res = await fetch(api.admin.allEmployees.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch employees");
      return res.json();
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(api.auth.register.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Registration failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.allEmployees.path] });
      toast({ title: "Employee Added", description: "New employee has been registered." });
      setShowAdd(false);
      setForm({ name: "", mobile: "", username: "", email: "", password: "", role: "employee" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="space-y-3 mt-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>;
  }

  return (
    <div className="space-y-4 mt-4" data-testid="employees-panel">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-900">Team ({(employees || []).length})</h3>
        <Button size="sm" onClick={() => setShowAdd(true)} data-testid="button-add-employee">
          <UserPlus className="w-4 h-4 mr-1" />
          Add Employee
        </Button>
      </div>

      {(employees || []).map((emp: any) => (
        <Card key={emp.id} className="border-0 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
              {emp.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{emp.name}</div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                {emp.mobile && (
                  <a href={`tel:${emp.mobile}`} className="flex items-center gap-1 text-primary" data-testid={`link-call-employee-${emp.id}`}>
                    <Phone className="w-3 h-3" />{emp.mobile}
                  </a>
                )}
                {emp.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</span>}
                {emp.username && <span className="flex items-center gap-1"><User className="w-3 h-3" />@{emp.username}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={emp.isOnline ? "default" : "secondary"} className="text-xs">
                {emp.isOnline ? "Online" : "Offline"}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">{emp.role}</Badge>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Full name" data-testid="input-emp-name" />
            </div>
            <div>
              <Label>Mobile</Label>
              <Input value={form.mobile} onChange={e => setForm({ ...form, mobile: e.target.value })} placeholder="Phone number" data-testid="input-emp-mobile" />
            </div>
            <div>
              <Label>Username</Label>
              <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="Login username" data-testid="input-emp-username" />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email address" data-testid="input-emp-email" />
            </div>
            <div>
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Login password" data-testid="input-emp-password" />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger data-testid="select-emp-role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button
              onClick={() => registerMutation.mutate(form)}
              disabled={registerMutation.isPending || !form.name || !form.password}
              data-testid="button-submit-employee"
            >
              {registerMutation.isPending ? "Adding..." : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
