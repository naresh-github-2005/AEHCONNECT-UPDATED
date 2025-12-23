import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DutyBadge, DoctorAvatar } from '@/components/ui/DutyComponents';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, Loader2, Check, AlertCircle, Brain, Calendar, RefreshCw,
  Users, TrendingUp, Shield, Tent, Clock, Award
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContext';
import { supabase } from '@/integrations/supabase/client';
import { DutyType, SeniorityLevel, MedicalSpecialty } from '@/lib/mockData';

interface AIAssignment {
  doctorId: string;
  doctorName: string;
  seniority?: string;
  specialty?: string;
  dutyType: string;
  unit: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface CampAssignment {
  campId: string;
  campName: string;
  assignedDoctors: { doctorId: string; doctorName: string; role: string }[];
}

interface AISuggestion {
  assignments: AIAssignment[];
  reasoning: string;
  workloadSummary: {
    balanced: boolean;
    fairnessScore?: number;
    concerns?: string[];
    notes: string;
  };
  campAssignments?: CampAssignment[];
}

interface DbDoctor {
  id: string;
  name: string;
  department: string;
  phone: string;
  seniority: SeniorityLevel;
  specialty: MedicalSpecialty;
  max_night_duties_per_month: number;
  max_hours_per_week: number;
  fixed_off_days: string[] | null;
  health_constraints: string | null;
  can_do_opd: boolean;
  can_do_ot: boolean;
  can_do_ward: boolean;
  can_do_camp: boolean;
  can_do_night: boolean;
}

interface DbCamp {
  id: string;
  name: string;
  location: string;
  camp_date: string;
  start_time: string;
  end_time: string;
  required_doctors: number;
  specialty_required: MedicalSpecialty | null;
  notes: string | null;
}

interface DbDutyStats {
  id: string;
  doctor_id: string;
  month: number;
  year: number;
  night_duty_count: number;
  weekend_duty_count: number;
  total_hours: number;
  camp_count: number;
}

const seniorityColors: Record<string, string> = {
  'senior_consultant': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'consultant': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'fellow': 'bg-green-500/10 text-green-600 border-green-200',
  'resident': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'intern': 'bg-gray-500/10 text-gray-600 border-gray-200',
};

const seniorityLabels: Record<string, string> = {
  'senior_consultant': 'Sr. Consultant',
  'consultant': 'Consultant',
  'fellow': 'Fellow',
  'resident': 'Resident',
  'intern': 'Intern',
};

const specialtyLabels: Record<string, string> = {
  'general': 'General',
  'cornea': 'Cornea',
  'retina': 'Retina',
  'glaucoma': 'Glaucoma',
  'oculoplasty': 'Oculoplasty',
  'pediatric': 'Pediatric',
  'neuro': 'Neuro',
  'cataract': 'Cataract',
};

const AISchedulingAssistant: React.FC = () => {
  const { dutyAssignments, applyAISuggestions } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [targetDate, setTargetDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [dbDoctors, setDbDoctors] = useState<DbDoctor[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [dutyStats, setDutyStats] = useState<DbDutyStats[]>([]);
  const [camps, setCamps] = useState<DbCamp[]>([]);

  // Fetch data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      // Fetch doctors with advanced fields
      const { data: doctorsData } = await supabase
        .from('doctors')
        .select('*')
        .eq('is_active', true);
      
      if (doctorsData) {
        setDbDoctors(doctorsData as DbDoctor[]);
      }

      // Fetch leave requests
      const { data: leavesData } = await supabase
        .from('leave_requests')
        .select('*');
      
      if (leavesData) setLeaveRequests(leavesData);

      // Fetch duty stats for current month
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      const { data: statsData } = await supabase
        .from('doctor_duty_stats')
        .select('*')
        .eq('month', currentMonth)
        .eq('year', currentYear);
      
      if (statsData) setDutyStats(statsData as DbDutyStats[]);

      // Fetch camps
      const { data: campsData } = await supabase
        .from('camps')
        .select('*')
        .gte('camp_date', format(new Date(), 'yyyy-MM-dd'));
      
      if (campsData) setCamps(campsData as DbCamp[]);
    };

    fetchData();
  }, []);

  const generateSuggestions = async () => {
    setIsLoading(true);
    setSuggestion(null);

    try {
      // Filter leave requests for target date
      const relevantLeaves = leaveRequests.filter(l => {
        const start = new Date(l.start_date);
        const end = new Date(l.end_date);
        const target = new Date(targetDate);
        return target >= start && target <= end;
      });

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-scheduling-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            doctors: dbDoctors,
            leaveRequests: relevantLeaves,
            existingAssignments: dutyAssignments.slice(0, 30),
            targetDate,
            dutyStats,
            camps: camps.filter(c => c.camp_date === targetDate),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 429) {
          toast.error('Rate limit exceeded. Please wait a moment and try again.');
        } else if (response.status === 402) {
          toast.error('AI credits exhausted. Please add credits to your workspace.');
        } else {
          toast.error(errorData.error || 'Failed to generate suggestions');
        }
        return;
      }

      const data = await response.json();
      setSuggestion(data);
      toast.success('AI suggestions generated with advanced rules!');
    } catch (error) {
      console.error('Error generating suggestions:', error);
      toast.error('Failed to connect to AI service');
    } finally {
      setIsLoading(false);
    }
  };

  const applySuggestions = () => {
    if (!suggestion) return;
    
    applyAISuggestions(suggestion.assignments, targetDate);
    toast.success('AI suggestions applied to roster!');
    setSuggestion(null);
  };

  return (
    <Card className="border-primary/20 shadow-lg overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Scheduling Assistant</CardTitle>
              <p className="text-tiny text-muted-foreground mt-0.5">
                Smart scheduling with seniority, specialty & fairness rules
              </p>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-accent animate-pulse" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <Users className="w-4 h-4 mx-auto text-primary mb-1" />
            <p className="text-tiny font-medium">{dbDoctors.length}</p>
            <p className="text-[10px] text-muted-foreground">Doctors</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <Shield className="w-4 h-4 mx-auto text-orange-500 mb-1" />
            <p className="text-tiny font-medium">{dbDoctors.filter(d => d.seniority === 'consultant' || d.seniority === 'senior_consultant').length}</p>
            <p className="text-[10px] text-muted-foreground">Consultants</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <Tent className="w-4 h-4 mx-auto text-green-500 mb-1" />
            <p className="text-tiny font-medium">{camps.filter(c => c.camp_date === targetDate).length}</p>
            <p className="text-[10px] text-muted-foreground">Camps</p>
          </div>
          <div className="p-2 rounded-lg bg-muted/50 text-center">
            <Clock className="w-4 h-4 mx-auto text-red-500 mb-1" />
            <p className="text-tiny font-medium">{leaveRequests.filter(l => l.status === 'pending').length}</p>
            <p className="text-[10px] text-muted-foreground">On Leave</p>
          </div>
        </div>

        {/* Date Selection */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="flex-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button
            onClick={generateSuggestions}
            disabled={isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate
              </>
            )}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-8 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-primary animate-pulse" />
            </div>
            <p className="text-body text-foreground font-medium">Analyzing with advanced rules...</p>
            <p className="text-tiny text-muted-foreground mt-1">
              Considering seniority, specialty, workload limits & camp schedules
            </p>
          </div>
        )}

        {/* Suggestions Display */}
        {suggestion && (
          <div className="space-y-4 animate-fade-in">
            {/* Fairness Score */}
            {suggestion.workloadSummary.fairnessScore !== undefined && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Award className="w-5 h-5 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-body font-medium">Fairness Score</span>
                    <span className="text-lg font-bold text-primary">{suggestion.workloadSummary.fairnessScore}/100</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                      style={{ width: `${suggestion.workloadSummary.fairnessScore}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Workload Summary */}
            <div className={`p-3 rounded-lg ${suggestion.workloadSummary.balanced ? 'bg-success/10 border border-success/20' : 'bg-warning/10 border border-warning/20'}`}>
              <div className="flex items-center gap-2 mb-1">
                {suggestion.workloadSummary.balanced ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-warning" />
                )}
                <span className="text-body font-medium">
                  {suggestion.workloadSummary.balanced ? 'Balanced & Fair Schedule' : 'Review Recommended'}
                </span>
              </div>
              <p className="text-tiny text-muted-foreground">
                {suggestion.workloadSummary.notes}
              </p>
              {suggestion.workloadSummary.concerns && suggestion.workloadSummary.concerns.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {suggestion.workloadSummary.concerns.map((concern, idx) => (
                    <li key={idx} className="text-tiny text-warning flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {concern}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Camp Assignments */}
            {suggestion.campAssignments && suggestion.campAssignments.length > 0 && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2 mb-2">
                  <Tent className="w-4 h-4 text-green-600" />
                  <span className="text-body font-medium text-green-700">Camp Assignments</span>
                </div>
                {suggestion.campAssignments.map((camp, idx) => (
                  <div key={idx} className="mt-2 p-2 rounded bg-background/50">
                    <p className="text-sm font-medium">{camp.campName}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {camp.assignedDoctors.map((doc, dIdx) => (
                        <Badge key={dIdx} variant="secondary" className="text-[10px]">
                          {doc.doctorName} ({doc.role})
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reasoning */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-tiny text-muted-foreground italic">
                "{suggestion.reasoning}"
              </p>
            </div>

            {/* Assignments Preview */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {suggestion.assignments.map((assignment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                >
                  <div className="flex items-center gap-3">
                    <DoctorAvatar name={assignment.doctorName} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-body font-medium text-foreground">
                          {assignment.doctorName}
                        </p>
                        {assignment.seniority && (
                          <Badge variant="outline" className={`text-[10px] ${seniorityColors[assignment.seniority] || ''}`}>
                            {seniorityLabels[assignment.seniority] || assignment.seniority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-tiny text-muted-foreground">
                        {assignment.specialty && <span className="capitalize">{specialtyLabels[assignment.specialty] || assignment.specialty} • </span>}
                        {assignment.unit} • {assignment.startTime} - {assignment.endTime}
                      </p>
                    </div>
                  </div>
                  <DutyBadge type={assignment.dutyType as DutyType} />
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={generateSuggestions}
              >
                <RefreshCw className="w-4 h-4" />
                Regenerate
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={applySuggestions}
              >
                <Check className="w-4 h-4" />
                Apply Suggestions
              </Button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !suggestion && (
          <div className="py-6 text-center">
            <div className="flex justify-center gap-2 mb-3">
              <Badge variant="outline" className="text-[10px]">Seniority Rules</Badge>
              <Badge variant="outline" className="text-[10px]">Specialty Matching</Badge>
              <Badge variant="outline" className="text-[10px]">Fairness Limits</Badge>
            </div>
            <p className="text-tiny text-muted-foreground">
              AI considers seniority, specialty, night duty limits, camp schedules & workload fairness
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AISchedulingAssistant;
