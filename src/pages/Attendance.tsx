import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, LogIn, LogOut, Calendar, Timer, Users, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";

interface AttendanceRecord {
  id: string;
  doctor_id: string;
  date: string;
  punch_in: string | null;
  punch_out: string | null;
  total_hours: number | null;
  status: string;
  notes: string | null;
  doctor?: { name: string } | null;
}

interface DoctorAttendanceStats {
  doctor_id: string;
  doctor_name: string;
  present_days: number;
  absent_days: number;
  half_days: number;
  total_hours: number;
  avg_hours: number;
}

const Attendance = () => {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [doctorStats, setDoctorStats] = useState<DoctorAttendanceStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [punching, setPunching] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const isAdmin = user?.role === 'admin';

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchDoctorAttendance = async () => {
    if (!user?.doctorId) return;

    try {
      const today = format(new Date(), "yyyy-MM-dd");

      // Fetch today's record
      const { data: todayData } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("doctor_id", user.doctorId)
        .eq("date", today)
        .maybeSingle();

      setTodayRecord(todayData);

      // Fetch history (last 30 days)
      const { data: historyData } = await supabase
        .from("attendance_records")
        .select("*")
        .eq("doctor_id", user.doctorId)
        .order("date", { ascending: false })
        .limit(30);

      setHistory(historyData || []);
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminAttendance = async () => {
    try {
      const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
      const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

      // Fetch all attendance records for this month with doctor names
      const { data: records } = await supabase
        .from("attendance_records")
        .select("*, doctor:doctors(name)")
        .gte("date", monthStart)
        .lte("date", monthEnd)
        .order("date", { ascending: false });

      setAllRecords(records || []);

      // Calculate stats per doctor
      const statsMap = new Map<string, DoctorAttendanceStats>();
      
      (records || []).forEach((record) => {
        const doctorId = record.doctor_id;
        const doctorName = record.doctor?.name || 'Unknown';
        
        if (!statsMap.has(doctorId)) {
          statsMap.set(doctorId, {
            doctor_id: doctorId,
            doctor_name: doctorName,
            present_days: 0,
            absent_days: 0,
            half_days: 0,
            total_hours: 0,
            avg_hours: 0,
          });
        }
        
        const stats = statsMap.get(doctorId)!;
        if (record.status === 'present') stats.present_days++;
        else if (record.status === 'absent') stats.absent_days++;
        else if (record.status === 'half-day') stats.half_days++;
        stats.total_hours += record.total_hours || 0;
      });

      // Calculate averages
      statsMap.forEach((stats) => {
        const totalDays = stats.present_days + stats.half_days;
        stats.avg_hours = totalDays > 0 ? stats.total_hours / totalDays : 0;
      });

      setDoctorStats(Array.from(statsMap.values()).sort((a, b) => b.present_days - a.present_days));
    } catch (error) {
      console.error("Error fetching admin attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminAttendance();
    } else {
      fetchDoctorAttendance();
    }
  }, [user?.doctorId, isAdmin]);

  const handlePunchIn = async () => {
    if (!user?.doctorId) return;
    setPunching(true);

    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const now = new Date().toISOString();

      const { error } = await supabase.from("attendance_records").insert({
        doctor_id: user.doctorId,
        date: today,
        punch_in: now,
        status: "present",
      });

      if (error) throw error;

      toast({ title: "Punched In", description: `Successfully punched in at ${format(new Date(), "hh:mm a")}` });
      fetchDoctorAttendance();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setPunching(false);
    }
  };

  const handlePunchOut = async () => {
    if (!todayRecord?.id) return;
    setPunching(true);

    try {
      const now = new Date();
      const punchInTime = new Date(todayRecord.punch_in!);
      const hoursWorked = (now.getTime() - punchInTime.getTime()) / (1000 * 60 * 60);

      const { error } = await supabase
        .from("attendance_records")
        .update({
          punch_out: now.toISOString(),
          total_hours: Math.round(hoursWorked * 100) / 100,
          status: hoursWorked < 4 ? "half-day" : "present",
        })
        .eq("id", todayRecord.id);

      if (error) throw error;

      toast({ title: "Punched Out", description: `Successfully punched out at ${format(now, "hh:mm a")}` });
      fetchDoctorAttendance();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setPunching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      present: "default",
      "half-day": "secondary",
      late: "outline",
      absent: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const isPunchedIn = todayRecord?.punch_in && !todayRecord?.punch_out;
  const isPunchedOut = todayRecord?.punch_out;

  // Admin View - All Doctors Analytics
  if (isAdmin) {
    const totalPresent = doctorStats.reduce((acc, s) => acc + s.present_days, 0);
    const totalAbsent = doctorStats.reduce((acc, s) => acc + s.absent_days, 0);
    const totalHours = doctorStats.reduce((acc, s) => acc + s.total_hours, 0);
    const todayPresentCount = allRecords.filter(r => r.date === format(new Date(), "yyyy-MM-dd") && r.punch_in).length;

    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Attendance Overview</h1>
            <p className="text-muted-foreground">Monthly attendance analytics for all doctors</p>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-2 bg-primary/5 border-primary/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{todayPresentCount}</p>
                  <p className="text-sm text-muted-foreground">Present Today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 bg-success/5 border-success/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{totalPresent}</p>
                  <p className="text-sm text-muted-foreground">Total Present Days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 bg-destructive/5 border-destructive/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{totalAbsent}</p>
                  <p className="text-sm text-muted-foreground">Total Absent Days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 bg-accent/5 border-accent/20">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground">{totalHours.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">Total Hours (Month)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Doctor-wise Stats */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <CardTitle>Doctor Attendance Summary</CardTitle>
            </div>
            <CardDescription>This month's attendance statistics per doctor</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : doctorStats.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No attendance records found for this month</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead className="text-center">Present</TableHead>
                      <TableHead className="text-center">Half Days</TableHead>
                      <TableHead className="text-center">Absent</TableHead>
                      <TableHead className="text-center">Total Hours</TableHead>
                      <TableHead className="text-center">Avg Hours/Day</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctorStats.map((stats) => (
                      <TableRow key={stats.doctor_id}>
                        <TableCell className="font-medium">{stats.doctor_name}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="default">{stats.present_days}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary">{stats.half_days}</Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="destructive">{stats.absent_days}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{stats.total_hours.toFixed(1)} hrs</TableCell>
                        <TableCell className="text-center">{stats.avg_hours.toFixed(1)} hrs</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Records */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              <CardTitle>Recent Attendance Records</CardTitle>
            </div>
            <CardDescription>Latest attendance entries across all doctors</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : allRecords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No records found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Punch In</TableHead>
                      <TableHead>Punch Out</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allRecords.slice(0, 20).map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.doctor?.name || 'Unknown'}</TableCell>
                        <TableCell>{format(new Date(record.date), "EEE, MMM d")}</TableCell>
                        <TableCell>
                          {record.punch_in ? format(new Date(record.punch_in), "hh:mm a") : "-"}
                        </TableCell>
                        <TableCell>
                          {record.punch_out ? format(new Date(record.punch_out), "hh:mm a") : "-"}
                        </TableCell>
                        <TableCell>{record.total_hours ? `${record.total_hours.toFixed(1)} hrs` : "-"}</TableCell>
                        <TableCell>{getStatusBadge(record.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Doctor View - Punch In/Out
  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Clock className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Attendance</h1>
          <p className="text-muted-foreground">Track your daily attendance</p>
        </div>
      </div>

      {/* Current Time & Punch Card */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Current Time</CardTitle>
            <CardDescription>{format(currentTime, "EEEE, MMMM d, yyyy")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl md:text-5xl font-mono font-bold text-primary">
              {format(currentTime, "HH:mm:ss")}
            </div>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Today's Status</CardTitle>
            <CardDescription>
              {isPunchedIn
                ? `Punched in at ${format(new Date(todayRecord.punch_in!), "hh:mm a")}`
                : isPunchedOut
                ? "Day completed"
                : "Not punched in yet"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayRecord && (
              <div className="flex items-center gap-4 text-sm">
                {todayRecord.punch_in && (
                  <div className="flex items-center gap-1">
                    <LogIn className="h-4 w-4 text-green-500" />
                    <span>{format(new Date(todayRecord.punch_in), "hh:mm a")}</span>
                  </div>
                )}
                {todayRecord.punch_out && (
                  <div className="flex items-center gap-1">
                    <LogOut className="h-4 w-4 text-red-500" />
                    <span>{format(new Date(todayRecord.punch_out), "hh:mm a")}</span>
                  </div>
                )}
                {todayRecord.total_hours && (
                  <div className="flex items-center gap-1">
                    <Timer className="h-4 w-4 text-primary" />
                    <span>{todayRecord.total_hours.toFixed(1)} hrs</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {!todayRecord?.punch_in && (
                <Button onClick={handlePunchIn} disabled={punching} className="flex-1 gap-2">
                  <LogIn className="h-4 w-4" />
                  Punch In
                </Button>
              )}
              {isPunchedIn && (
                <Button onClick={handlePunchOut} disabled={punching} variant="destructive" className="flex-1 gap-2">
                  <LogOut className="h-4 w-4" />
                  Punch Out
                </Button>
              )}
              {isPunchedOut && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  {getStatusBadge(todayRecord.status)}
                  <span>Day completed</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Attendance History</CardTitle>
          </div>
          <CardDescription>Your attendance records for the last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No attendance records found</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Punch In</TableHead>
                    <TableHead>Punch Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {format(new Date(record.date), "EEE, MMM d")}
                      </TableCell>
                      <TableCell>
                        {record.punch_in ? format(new Date(record.punch_in), "hh:mm a") : "-"}
                      </TableCell>
                      <TableCell>
                        {record.punch_out ? format(new Date(record.punch_out), "hh:mm a") : "-"}
                      </TableCell>
                      <TableCell>{record.total_hours ? `${record.total_hours.toFixed(1)} hrs` : "-"}</TableCell>
                      <TableCell>{getStatusBadge(record.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Attendance;
