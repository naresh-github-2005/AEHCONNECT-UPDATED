import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createSwapRequest, DutyWithDoctor, useRealtimeDutyAssignments } from '@/hooks/useRealtimeData';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeftRight, Loader2, AlertTriangle, Info } from 'lucide-react';
import { format } from 'date-fns';
import { isDutyAllowed, getDesignationLabel, DoctorProfile } from '@/lib/dutyRules';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

interface SwapRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  myAssignment: DutyWithDoctor;
}

export const SwapRequestDialog: React.FC<SwapRequestDialogProps> = ({
  open,
  onOpenChange,
  myAssignment,
}) => {
  const { user } = useAuth();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myDoctorProfile, setMyDoctorProfile] = React.useState<DoctorProfile | null>(null);
  
  const { assignments } = useRealtimeDutyAssignments(myAssignment.duty_date);

  // Fetch my doctor profile for role-based validation
  React.useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.doctorId) return;
      const { data } = await supabase
        .from('doctors')
        .select('id, name, designation, specialty, created_at')
        .eq('id', user.doctorId)
        .single();
      if (data) {
        setMyDoctorProfile(data as DoctorProfile);
      }
    };
    fetchProfile();
  }, [user?.doctorId]);
  
  // Filter available swaps based on role restrictions
  const availableSwaps = useMemo(() => {
    if (!myDoctorProfile) {
      return assignments.filter(
        a => a.id !== myAssignment.id && a.doctor_id !== myAssignment.doctor_id
      );
    }

    return assignments.filter(a => {
      // Exclude my own assignment
      if (a.id === myAssignment.id || a.doctor_id === myAssignment.doctor_id) {
        return false;
      }

      // Check if I can take their duty based on role rules
      const result = isDutyAllowed(myDoctorProfile, a.duty_type);
      return result.allowed;
    });
  }, [assignments, myAssignment, myDoctorProfile]);

  const selectedAssignment = availableSwaps.find(a => a.id === selectedAssignmentId);

  const handleSubmit = async () => {
    if (!selectedAssignment || !user?.doctorId) return;
    
    setIsSubmitting(true);
    try {
      await createSwapRequest(
        myAssignment.id,
        selectedAssignment.id,
        myAssignment.doctor_id,
        selectedAssignment.doctor_id,
        reason || undefined
      );
      
      toast.success('Swap request sent!', {
        description: `Request sent to ${selectedAssignment.doctor.name}`,
      });
      
      onOpenChange(false);
      setSelectedAssignmentId('');
      setReason('');
    } catch (error) {
      console.error('Error creating swap request:', error);
      toast.error('Failed to send swap request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5" />
            Request Duty Swap
          </DialogTitle>
          <DialogDescription>
            Request to swap your duty with another doctor
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Role info */}
          {myDoctorProfile && (
            <Alert className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                As a <strong>{getDesignationLabel(myDoctorProfile.designation)}</strong>, 
                you can only swap for duties allowed by your role.
              </AlertDescription>
            </Alert>
          )}

          {/* My duty */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Label className="text-xs text-muted-foreground">Your Duty</Label>
            <div className="flex items-center gap-2 mt-1">
              <p className="font-medium">{myAssignment.duty_type}</p>
              {myDoctorProfile && (
                <Badge variant="outline" className="text-[10px]">
                  {getDesignationLabel(myDoctorProfile.designation)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {myAssignment.unit} • {myAssignment.start_time} - {myAssignment.end_time}
            </p>
          </div>
          
          <div className="flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
          </div>
          
          {/* Select target duty */}
          <div className="space-y-2">
            <Label>Swap with (showing only duties allowed for your role)</Label>
            <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a duty to swap with" />
              </SelectTrigger>
              <SelectContent>
                {availableSwaps.length === 0 ? (
                  <div className="p-3 text-center">
                    <AlertTriangle className="w-5 h-5 mx-auto text-warning mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No compatible duties available for swap
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Only duties allowed for your role are shown
                    </p>
                  </div>
                ) : (
                  availableSwaps.map((assignment) => (
                    <SelectItem key={assignment.id} value={assignment.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{assignment.doctor.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {assignment.duty_type} • {assignment.unit} • {assignment.start_time}-{assignment.end_time}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {selectedAssignment && (
            <div className="p-3 rounded-lg bg-secondary/50 border">
              <Label className="text-xs text-muted-foreground">Their Duty</Label>
              <p className="font-medium">{selectedAssignment.duty_type}</p>
              <p className="text-sm text-muted-foreground">
                {selectedAssignment.doctor.name} • {selectedAssignment.unit}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedAssignment.start_time} - {selectedAssignment.end_time}
              </p>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Add a reason for the swap request..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!selectedAssignmentId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              'Send Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
