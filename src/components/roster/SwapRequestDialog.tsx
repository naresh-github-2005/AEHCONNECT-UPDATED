import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { createSwapRequest, DutyWithDoctor, useRealtimeDutyAssignments } from '@/hooks/useRealtimeData';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

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
  
  const { assignments } = useRealtimeDutyAssignments(myAssignment.duty_date);
  
  // Filter out my own assignment and show only other doctors' duties
  const availableSwaps = assignments.filter(
    a => a.id !== myAssignment.id && a.doctor_id !== myAssignment.doctor_id
  );

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
          {/* My duty */}
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <Label className="text-xs text-muted-foreground">Your Duty</Label>
            <p className="font-medium">{myAssignment.duty_type}</p>
            <p className="text-sm text-muted-foreground">
              {myAssignment.unit} • {myAssignment.start_time} - {myAssignment.end_time}
            </p>
          </div>
          
          <div className="flex items-center justify-center">
            <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
          </div>
          
          {/* Select target duty */}
          <div className="space-y-2">
            <Label>Swap with</Label>
            <Select value={selectedAssignmentId} onValueChange={setSelectedAssignmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a duty to swap with" />
              </SelectTrigger>
              <SelectContent>
                {availableSwaps.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    No other duties available for swap
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
