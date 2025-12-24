import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DutyBadge, PhoneButton, DoctorAvatar } from '@/components/ui/DutyComponents';
import { Search, Filter, X, ArrowLeftRight, RefreshCw, Wifi, Calendar, Clock, MapPin, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRealtimeDutyAssignments, DutyWithDoctor } from '@/hooks/useRealtimeData';
import { useAuth } from '@/contexts/AuthContext';
import { SwapRequestDialog } from '@/components/roster/SwapRequestDialog';
import { SwapRequestsList } from '@/components/roster/SwapRequestsList';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuLabel,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import type { Database } from '@/integrations/supabase/types';

type DutyType = Database['public']['Enums']['duty_type'];

const dutyTypes: DutyType[] = ['OPD', 'OT', 'Night Duty', 'Ward', 'Camp'];

const Roster: React.FC = () => {
  const { user } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const { assignments, isLoading, refetch } = useRealtimeDutyAssignments(today);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<DutyType | null>(null);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<DutyWithDoctor | null>(null);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesSearch = assignment.doctor.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter = !selectedFilter || assignment.duty_type === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [assignments, searchQuery, selectedFilter]);

  const myAssignments = useMemo(() => {
    if (!user?.doctorId) return [];
    return assignments.filter(a => a.doctor_id === user.doctorId);
  }, [assignments, user?.doctorId]);

  const handleSwapRequest = (assignment: DutyWithDoctor) => {
    setSelectedAssignment(assignment);
    setSwapDialogOpen(true);
  };

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <div className="animate-fade-in flex items-start justify-between">
        <div>
          <h2 className="text-title text-foreground">Daily Roster</h2>
          <p className="text-caption text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-green-600">
            <Wifi className="w-3 h-3" />
            <span>Live</span>
          </div>
          <Button variant="ghost" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Swap Requests */}
      <SwapRequestsList />

      {/* My Duties Section (for doctors) */}
      {user?.role === 'doctor' && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 animate-slide-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              Your Duties Today
              {myAssignments.length > 0 && (
                <Badge variant="secondary" className="ml-auto">
                  {myAssignments.length} {myAssignments.length === 1 ? 'duty' : 'duties'}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {myAssignments.length === 0 ? (
              <div className="py-6 text-center">
                <Calendar className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">No duties assigned for today</p>
              </div>
            ) : (
              myAssignments.map((assignment) => (
                <ContextMenu key={assignment.id}>
                  <ContextMenuTrigger>
                    <div className="group relative p-3 rounded-lg bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-context-menu">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                          <DutyBadge type={assignment.duty_type} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-sm">{assignment.duty_type}</p>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {assignment.unit}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {assignment.start_time} — {assignment.end_time}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Mobile dropdown menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Duty Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleSwapRequest(assignment)}>
                              <ArrowLeftRight className="w-4 h-4 mr-2" />
                              Request Exchange
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      
                      {/* Right-click hint */}
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[10px] text-muted-foreground">Right-click for options</span>
                      </div>
                    </div>
                  </ContextMenuTrigger>
                  
                  <ContextMenuContent className="w-48">
                    <ContextMenuLabel>Duty: {assignment.duty_type}</ContextMenuLabel>
                    <ContextMenuSeparator />
                    <ContextMenuItem onClick={() => handleSwapRequest(assignment)}>
                      <ArrowLeftRight className="w-4 h-4 mr-2" />
                      Request Exchange
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative animate-slide-up">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by doctor name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-12 bg-card border-border"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted flex items-center justify-center hover:bg-muted-foreground/20 transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="animate-slide-up stagger-1">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-tiny text-muted-foreground font-medium">Filter by duty type</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedFilter(null)}
            className={cn(
              'px-3 py-1.5 rounded-full text-tiny font-medium transition-colors',
              !selectedFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
            )}
          >
            All
          </button>
          {dutyTypes.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedFilter(selectedFilter === type ? null : type)}
              className={cn(
                'px-3 py-1.5 rounded-full text-tiny font-medium transition-colors',
                selectedFilter === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between animate-fade-in stagger-2">
        <p className="text-caption text-muted-foreground">
          Showing {filteredAssignments.length} of {assignments.length} duties
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading roster...</p>
        </div>
      )}

      {/* Roster List */}
      {!isLoading && (
        <div className="space-y-3 animate-slide-up stagger-2">
          {filteredAssignments.map((assignment, index) => (
            <Card 
              key={assignment.id} 
              className={cn(
                "shadow-soft card-interactive overflow-hidden",
                assignment.doctor_id === user?.doctorId && "ring-1 ring-primary/30"
              )}
              style={{ animationDelay: `${0.03 * index}s` }}
            >
              <CardContent className="py-4 px-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <DoctorAvatar name={assignment.doctor.name} />
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-foreground truncate">
                        {assignment.doctor.name}
                        {assignment.doctor_id === user?.doctorId && (
                          <span className="ml-2 text-xs text-primary">(You)</span>
                        )}
                      </p>
                      <p className="text-tiny text-muted-foreground mt-0.5">
                        {assignment.unit}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <DutyBadge type={assignment.duty_type} />
                        <span className="text-tiny text-muted-foreground">
                          {assignment.start_time} — {assignment.end_time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.role === 'doctor' && assignment.doctor_id !== user?.doctorId && myAssignments.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Use the first of my assignments to request swap
                          setSelectedAssignment(myAssignments[0]);
                          setSwapDialogOpen(true);
                        }}
                        className="h-8 px-2"
                        title="Request swap"
                      >
                        <ArrowLeftRight className="w-4 h-4" />
                      </Button>
                    )}
                    <PhoneButton phone={assignment.doctor.phone} size="sm" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredAssignments.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <p className="text-body text-muted-foreground">No duties found</p>
              <p className="text-caption text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>
      )}

      {/* Swap Dialog */}
      {selectedAssignment && (
        <SwapRequestDialog
          open={swapDialogOpen}
          onOpenChange={setSwapDialogOpen}
          myAssignment={selectedAssignment}
        />
      )}
    </div>
  );
};

export default Roster;
