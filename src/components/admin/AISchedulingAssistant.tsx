import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DutyBadge, DoctorAvatar } from '@/components/ui/DutyComponents';
import { Sparkles, Loader2, Check, AlertCircle, Brain, Calendar, RefreshCw } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { toast } from 'sonner';
import { useData } from '@/contexts/DataContext';
import { DutyType } from '@/lib/mockData';

interface AIAssignment {
  doctorId: string;
  doctorName: string;
  dutyType: string;
  unit: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface AISuggestion {
  assignments: AIAssignment[];
  reasoning: string;
  workloadSummary: {
    balanced: boolean;
    notes: string;
  };
}

const AISchedulingAssistant: React.FC = () => {
  const { doctors, leaveRequests, dutyAssignments, applyAISuggestions } = useData();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<AISuggestion | null>(null);
  const [targetDate, setTargetDate] = useState(format(addDays(new Date(), 1), 'yyyy-MM-dd'));

  const generateSuggestions = async () => {
    setIsLoading(true);
    setSuggestion(null);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-scheduling-assistant`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            doctors: doctors.map(d => ({
              id: d.id,
              name: d.name,
              department: d.department,
            })),
            leaveRequests: leaveRequests.filter(l => {
              const start = new Date(l.startDate);
              const end = new Date(l.endDate);
              const target = new Date(targetDate);
              return target >= start && target <= end;
            }),
            existingAssignments: dutyAssignments.slice(0, 20), // Recent assignments for context
            targetDate,
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
      toast.success('AI suggestions generated successfully!');
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
    <Card className="border-primary/20 shadow-lg overflow-hidden">
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
                Smart duty assignments powered by AI
              </p>
            </div>
          </div>
          <Sparkles className="w-5 h-5 text-accent animate-pulse" />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
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
            <p className="text-body text-foreground font-medium">Analyzing doctor schedules...</p>
            <p className="text-tiny text-muted-foreground mt-1">
              Considering availability, workload, and leave requests
            </p>
          </div>
        )}

        {/* Suggestions Display */}
        {suggestion && (
          <div className="space-y-4 animate-fade-in">
            {/* Workload Summary */}
            <div className={`p-3 rounded-lg ${suggestion.workloadSummary.balanced ? 'bg-success/10 border border-success/20' : 'bg-warning/10 border border-warning/20'}`}>
              <div className="flex items-center gap-2 mb-1">
                {suggestion.workloadSummary.balanced ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-warning" />
                )}
                <span className="text-body font-medium">
                  {suggestion.workloadSummary.balanced ? 'Balanced Schedule' : 'Review Recommended'}
                </span>
              </div>
              <p className="text-tiny text-muted-foreground">
                {suggestion.workloadSummary.notes}
              </p>
            </div>

            {/* Reasoning */}
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-tiny text-muted-foreground italic">
                "{suggestion.reasoning}"
              </p>
            </div>

            {/* Assignments Preview */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {suggestion.assignments.map((assignment, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
                >
                  <div className="flex items-center gap-3">
                    <DoctorAvatar name={assignment.doctorName} size="sm" />
                    <div>
                      <p className="text-body font-medium text-foreground">
                        {assignment.doctorName}
                      </p>
                      <p className="text-tiny text-muted-foreground">
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
            <p className="text-tiny text-muted-foreground">
              Select a date and click Generate to get AI-powered scheduling suggestions
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AISchedulingAssistant;
