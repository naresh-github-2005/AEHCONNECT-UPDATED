import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarDays, Clock, CheckCircle2, XCircle, User, AlertTriangle, Timer, FileText, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaveRequest {
  id: string;
  doctor_id: string;
  leave_type: "Casual" | "Medical" | "Emergency" | "Festival" | "Annual";
  start_date: string;
  end_date: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string | null;
  doctors?: { name: string } | null;
}

interface PermissionRequest {
  id: string;
  doctor_id: string;
  permission_date: string;
  start_time: string;
  end_time: string;
  hours_requested: number;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string | null;
  doctors?: { name: string } | null;
}

interface LeaveBalance {
  total_leaves: number;
  used_leaves: number;
  remaining_leaves: number;
}

interface PermissionBalance {
  total_minutes: number;
  used_minutes: number;
  remaining_minutes: number;
}

const LEAVE_TYPES = ["Casual", "Medical", "Emergency", "Festival"] as const;

const Leave: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const isAdmin = user?.role === 'admin';

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({ total_leaves: 25, used_leaves: 0, remaining_leaves: 25 });
  const [leaveLoading, setLeaveLoading] = useState(true);
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const [permissionRequests, setPermissionRequests] = useState<PermissionRequest[]>([]);
  const [permissionBalance, setPermissionBalance] = useState<PermissionBalance>({ total_minutes: 180, used_minutes: 0, remaining_minutes: 180 });
  const [permissionLoading, setPermissionLoading] = useState(true);
  const [submittingPermission, setSubmittingPermission] = useState(false);

  const [leaveType, setLeaveType] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [leaveReason, setLeaveReason] = useState("");

  const [permissionDate, setPermissionDate] = useState<Date | undefined>();
  const [permissionStartTime, setPermissionStartTime] = useState("");
  const [permissionEndTime, setPermissionEndTime] = useState("");
  const [permissionReason, setPermissionReason] = useState("");

  const [activeTab, setActiveTab] = useState("leave");

  const fetchLeaveRequests = async () => {
    setLeaveLoading(true);
    try {
      let query = supabase.from("leave_requests").select("*, doctors(name)").order("created_at", { ascending: false });
      if (!isAdmin && user?.doctorId) {
        query = query.eq("doctor_id", user.doctorId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setLeaveRequests((data as LeaveRequest[]) || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLeaveLoading(false);
    }
  };

  const fetchLeaveBalance = async () => {
    if (!user?.doctorId) return;
    try {
      const { data, error } = await supabase.rpc("get_total_leaves_taken", { p_doctor_id: user.doctorId, p_year: new Date().getFullYear() });
      if (error) throw error;
      const usedLeaves = data || 0;
      setLeaveBalance({
        total_leaves: 25,
        used_leaves: usedLeaves,
        remaining_leaves: Math.max(0, 25 - usedLeaves)
      });
    } catch (error: any) {
      console.error("Error fetching leave balance:", error);
    }
  };

  const fetchPermissionRequests = async () => {
    setPermissionLoading(true);
    try {
      let query = supabase.from("permission_requests").select("*, doctors(name)").order("created_at", { ascending: false });
      if (!isAdmin && user?.doctorId) {
        query = query.eq("doctor_id", user.doctorId);
      }
      const { data, error } = await query;
      if (error) throw error;
      setPermissionRequests((data as PermissionRequest[]) || []);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setPermissionLoading(false);
    }
  };

  const fetchPermissionBalance = async () => {
    if (!user?.doctorId) return;
    try {
      const { data, error } = await supabase.rpc("get_permission_hours_used", {
        p_doctor_id: user.doctorId,
        p_year: new Date().getFullYear(),
        p_month: new Date().getMonth() + 1,
      });
      if (error) throw error;
      const usedMinutes = (data || 0) * 60; // Convert hours to minutes
      setPermissionBalance({
        total_minutes: 180,
        used_minutes: usedMinutes,
        remaining_minutes: Math.max(0, 180 - usedMinutes)
      });
    } catch (error: any) {
      console.error("Error fetching permission balance:", error);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
    fetchLeaveBalance();
    fetchPermissionRequests();
    fetchPermissionBalance();
  }, [user?.doctorId, isAdmin]);

  const calculateLeaveDays = (): number => {
    if (!startDate || !endDate) return 0;
    return differenceInDays(endDate, startDate) + 1;
  };

  const calculatePermissionDuration = (): number => {
    if (!permissionStartTime || !permissionEndTime) return 0;
    const [startHour, startMin] = permissionStartTime.split(":").map(Number);
    const [endHour, endMin] = permissionEndTime.split(":").map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  };

  const handleSubmitLeave = async () => {
    if (!user?.doctorId) return;
    if (!leaveType || !startDate || !endDate || !leaveReason) {
      toast({ title: "Validation Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    const days = calculateLeaveDays();
    if (days <= 0) {
      toast({ title: "Invalid Dates", description: "End date must be after start date", variant: "destructive" });
      return;
    }

    if (days > leaveBalance.remaining_leaves) {
      toast({
        title: "Insufficient Leave Balance",
        description: `You have only ${leaveBalance.remaining_leaves} days remaining. Cannot apply for ${days} days.`,
        variant: "destructive",
      });
      return;
    }

    setSubmittingLeave(true);
    try {
      const { error } = await supabase.from("leave_requests").insert({
        doctor_id: user.doctorId,
        leave_type: leaveType as "Casual" | "Medical" | "Emergency" | "Festival",
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        reason: leaveReason,
        status: "pending" as const,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Leave request submitted successfully" });
      setLeaveType("");
      setStartDate(undefined);
      setEndDate(undefined);
      setLeaveReason("");
      fetchLeaveRequests();
      fetchLeaveBalance();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleSubmitPermission = async () => {
    if (!user?.doctorId) return;
    if (!permissionDate || !permissionStartTime || !permissionEndTime || !permissionReason) {
      toast({ title: "Validation Error", description: "Please fill all fields", variant: "destructive" });
      return;
    }

    const duration = calculatePermissionDuration();
    if (duration <= 0) {
      toast({ title: "Invalid Time", description: "End time must be after start time", variant: "destructive" });
      return;
    }

    if (duration > permissionBalance.remaining_minutes) {
      toast({
        title: "Insufficient Permission Balance",
        description: `You have only ${permissionBalance.remaining_minutes} minutes remaining this month. Cannot apply for ${duration} minutes.`,
        variant: "destructive",
      });
      return;
    }

    setSubmittingPermission(true);
    try {
      const durationHours = duration / 60; // Convert minutes to hours
      const { error } = await supabase.from("permission_requests").insert({
        doctor_id: user.doctorId,
        permission_date: format(permissionDate, "yyyy-MM-dd"),
        start_time: permissionStartTime,
        end_time: permissionEndTime,
        hours_requested: durationHours,
        reason: permissionReason,
        status: "pending" as const,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Permission request submitted successfully" });
      setPermissionDate(undefined);
      setPermissionStartTime("");
      setPermissionEndTime("");
      setPermissionReason("");
      fetchPermissionRequests();
      fetchPermissionBalance();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmittingPermission(false);
    }
  };

  const handleUpdateLeaveStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("leave_requests")
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: `Leave request ${status.toLowerCase()}` });
      fetchLeaveRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdatePermissionStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      const { error } = await supabase
        .from("permission_requests")
        .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: `Permission request ${status.toLowerCase()}` });
      fetchPermissionRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const StatusBadge = ({ status }: { status: string | null }) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown";
    return <Badge variant={variants[status || ""] || "outline"}>{displayStatus}</Badge>;
  };

  const renderLeaveBalanceCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Annual Leave</CardDescription>
          <CardTitle className="text-3xl">{leaveBalance.total_leaves} days</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Used Leave</CardDescription>
          <CardTitle className="text-3xl text-orange-600">{leaveBalance.used_leaves} days</CardTitle>
        </CardHeader>
      </Card>
      <Card className={leaveBalance.remaining_leaves === 0 ? "border-destructive" : ""}>
        <CardHeader className="pb-2">
          <CardDescription>Remaining Leave</CardDescription>
          <CardTitle className={cn("text-3xl", leaveBalance.remaining_leaves === 0 ? "text-destructive" : "text-green-600")}>
            {leaveBalance.remaining_leaves} days
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );

  const renderPermissionBalanceCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Monthly Permission Limit</CardDescription>
          <CardTitle className="text-3xl">{Math.floor(permissionBalance.total_minutes / 60)}h {permissionBalance.total_minutes % 60}m</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Used This Month</CardDescription>
          <CardTitle className="text-3xl text-orange-600">{Math.floor(permissionBalance.used_minutes / 60)}h {permissionBalance.used_minutes % 60}m</CardTitle>
        </CardHeader>
      </Card>
      <Card className={permissionBalance.remaining_minutes === 0 ? "border-destructive" : ""}>
        <CardHeader className="pb-2">
          <CardDescription>Remaining This Month</CardDescription>
          <CardTitle className={cn("text-3xl", permissionBalance.remaining_minutes === 0 ? "text-destructive" : "text-green-600")}>
            {Math.floor(permissionBalance.remaining_minutes / 60)}h {permissionBalance.remaining_minutes % 60}m
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );

  const renderLeaveForm = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Apply for Leave
        </CardTitle>
        <CardDescription>Submit a new leave request (Max {leaveBalance.total_leaves} days per year)</CardDescription>
      </CardHeader>
      <CardContent>
        {leaveBalance.remaining_leaves === 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have exhausted your annual leave balance. No more leave can be applied this year.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select value={leaveType} onValueChange={setLeaveType} disabled={leaveBalance.remaining_leaves === 0}>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")} disabled={leaveBalance.remaining_leaves === 0}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus disabled={(date) => date < new Date()} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")} disabled={leaveBalance.remaining_leaves === 0}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus disabled={(date) => date < (startDate || new Date())} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Days Requested</Label>
            <Input value={calculateLeaveDays() > 0 ? `${calculateLeaveDays()} day(s)` : "-"} disabled />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Reason</Label>
            <Textarea placeholder="Enter reason for leave" value={leaveReason} onChange={(e) => setLeaveReason(e.target.value)} disabled={leaveBalance.remaining_leaves === 0} />
          </div>
        </div>

        <Button className="mt-4" onClick={handleSubmitLeave} disabled={submittingLeave || leaveBalance.remaining_leaves === 0}>
          {submittingLeave && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Leave Request
        </Button>
      </CardContent>
    </Card>
  );

  const renderPermissionForm = () => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="h-5 w-5" />
          Apply for Permission
        </CardTitle>
        <CardDescription>Request short leave (Max 3 hours per month)</CardDescription>
      </CardHeader>
      <CardContent>
        {permissionBalance.remaining_minutes === 0 && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              You have exhausted your monthly permission limit. No more permissions can be applied this month.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !permissionDate && "text-muted-foreground")} disabled={permissionBalance.remaining_minutes === 0}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {permissionDate ? format(permissionDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={permissionDate} onSelect={setPermissionDate} initialFocus disabled={(date) => date < new Date()} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Duration</Label>
            <Input value={calculatePermissionDuration() > 0 ? `${calculatePermissionDuration()} minutes` : "-"} disabled />
          </div>

          <div className="space-y-2">
            <Label>Start Time</Label>
            <Input type="time" value={permissionStartTime} onChange={(e) => setPermissionStartTime(e.target.value)} disabled={permissionBalance.remaining_minutes === 0} />
          </div>

          <div className="space-y-2">
            <Label>End Time</Label>
            <Input type="time" value={permissionEndTime} onChange={(e) => setPermissionEndTime(e.target.value)} disabled={permissionBalance.remaining_minutes === 0} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Reason</Label>
            <Textarea placeholder="Enter reason for permission" value={permissionReason} onChange={(e) => setPermissionReason(e.target.value)} disabled={permissionBalance.remaining_minutes === 0} />
          </div>
        </div>

        <Button className="mt-4" onClick={handleSubmitPermission} disabled={submittingPermission || permissionBalance.remaining_minutes === 0}>
          {submittingPermission && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Permission Request
        </Button>
      </CardContent>
    </Card>
  );

  const renderLeaveRequestsList = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {isAdmin ? "All Leave Requests" : "My Leave Requests"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {leaveLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : leaveRequests.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No leave requests found</p>
        ) : (
          <div className="space-y-4">
            {leaveRequests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    {isAdmin && request.doctors && (
                      <p className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {request.doctors.name}
                      </p>
                    )}
                    <p className="text-sm">
                      <Badge variant="outline" className="mr-2">{request.leave_type}</Badge>
                      {format(parseISO(request.start_date), "MMM d, yyyy")} - {format(parseISO(request.end_date), "MMM d, yyyy")}
                      <span className="text-muted-foreground ml-2">
                        ({differenceInDays(parseISO(request.end_date), parseISO(request.start_date)) + 1} days)
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={request.status} />
                    {isAdmin && request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdateLeaveStatus(request.id, "approved")}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleUpdateLeaveStatus(request.id, "rejected")}>
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderPermissionRequestsList = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {isAdmin ? "All Permission Requests" : "My Permission Requests"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {permissionLoading ? (
          <div className="flex justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : permissionRequests.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No permission requests found</p>
        ) : (
          <div className="space-y-4">
            {permissionRequests.map((request) => (
              <Card key={request.id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-1">
                    {isAdmin && request.doctors && (
                      <p className="font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {request.doctors.name}
                      </p>
                    )}
                    <p className="text-sm">
                      <Badge variant="outline" className="mr-2">
                        <Clock className="h-3 w-3 mr-1" />
                        {Math.round(request.hours_requested * 60)} min
                      </Badge>
                      {format(parseISO(request.permission_date), "MMM d, yyyy")}
                      <span className="text-muted-foreground ml-2">
                        ({request.start_time} - {request.end_time})
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">{request.reason}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={request.status} />
                    {isAdmin && request.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleUpdatePermissionStatus(request.id, "approved")}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleUpdatePermissionStatus(request.id, "rejected")}>
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto p-4 md:p-6 pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Leave & Permissions</h1>
        <p className="text-muted-foreground">Manage your leave requests and permissions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="leave" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Leave
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Timer className="h-4 w-4" />
            Permissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="leave">
          {!isAdmin && renderLeaveBalanceCards()}
          {!isAdmin && renderLeaveForm()}
          {renderLeaveRequestsList()}
        </TabsContent>

        <TabsContent value="permissions">
          {!isAdmin && renderPermissionBalanceCards()}
          {!isAdmin && renderPermissionForm()}
          {renderPermissionRequestsList()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Leave;
