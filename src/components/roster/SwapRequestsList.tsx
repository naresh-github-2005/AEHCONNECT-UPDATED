import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRealtimeSwapRequests, updateSwapRequestStatus, SwapRequestWithDetails } from '@/hooks/useRealtimeData';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeftRight, Check, X, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const SwapRequestsList: React.FC = () => {
  const { user } = useAuth();
  const { swapRequests, isLoading } = useRealtimeSwapRequests();
  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const pendingRequests = swapRequests.filter(r => r.status === 'pending');
  const myPendingRequests = pendingRequests.filter(
    r => r.target_doctor_id === user?.doctorId || r.requester_doctor_id === user?.doctorId
  );

  const handleAction = async (requestId: string, action: 'approved' | 'rejected') => {
    setProcessingId(requestId);
    try {
      await updateSwapRequestStatus(requestId, action);
      toast.success(action === 'approved' ? 'Swap approved!' : 'Swap rejected');
    } catch (error) {
      console.error('Error updating swap request:', error);
      toast.error('Failed to update swap request');
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Show all pending for admins, or just relevant ones for doctors
  const displayRequests = user?.role === 'admin' ? pendingRequests : myPendingRequests;

  if (displayRequests.length === 0) {
    return null;
  }

  return (
    <Card className="border-dashed border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4" />
          Pending Swap Requests
          <Badge variant="secondary" className="ml-auto">{displayRequests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayRequests.map((request) => (
          <SwapRequestCard
            key={request.id}
            request={request}
            currentDoctorId={user?.doctorId}
            isAdmin={user?.role === 'admin'}
            isProcessing={processingId === request.id}
            onApprove={() => handleAction(request.id, 'approved')}
            onReject={() => handleAction(request.id, 'rejected')}
          />
        ))}
      </CardContent>
    </Card>
  );
};

interface SwapRequestCardProps {
  request: SwapRequestWithDetails;
  currentDoctorId?: string;
  isAdmin?: boolean;
  isProcessing: boolean;
  onApprove: () => void;
  onReject: () => void;
}

const SwapRequestCard: React.FC<SwapRequestCardProps> = ({
  request,
  currentDoctorId,
  isAdmin,
  isProcessing,
  onApprove,
  onReject,
}) => {
  const isTargetDoctor = request.target_doctor_id === currentDoctorId;
  const isRequester = request.requester_doctor_id === currentDoctorId;
  const canRespond = isTargetDoctor || isAdmin;

  return (
    <div className="p-3 rounded-lg bg-card border">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{request.requester_doctor.name}</span>
            <ArrowLeftRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-sm">{request.target_doctor.name}</span>
          </div>
          
          <div className="mt-1 text-xs text-muted-foreground space-y-0.5">
            <p>
              {request.requester_assignment.duty_type} ({request.requester_assignment.unit}) 
              ↔ {request.target_assignment.duty_type} ({request.target_assignment.unit})
            </p>
            {request.reason && (
              <p className="italic">"{request.reason}"</p>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-2">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
            </span>
            {isRequester && (
              <Badge variant="outline" className="text-xs">Your request</Badge>
            )}
            {isTargetDoctor && (
              <Badge variant="secondary" className="text-xs">Needs your response</Badge>
            )}
          </div>
        </div>
        
        {canRespond && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={onReject}
              disabled={isProcessing}
              className="h-8 px-2"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              onClick={onApprove}
              disabled={isProcessing}
              className="h-8 px-2"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
