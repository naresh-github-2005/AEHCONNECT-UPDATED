import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DutyBadge, PhoneButton, DoctorAvatar } from '@/components/ui/DutyComponents';
import { Search, Filter, X, ArrowLeftRight, RefreshCw, Wifi, Calendar, Clock, MapPin, MoreVertical, CalendarDays, CalendarRange } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useRealtimeDutyAssignments, DutyWithDoctor } from '@/hooks/useRealtimeData';
import { useAuth } from '@/contexts/AuthContext';
import { SwapRequestDialog } from '@/components/roster/SwapRequestDialog';
import { SwapRequestsList } from '@/components/roster/SwapRequestsList';
import MonthlyRosterView from '@/components/roster/MonthlyRosterView';
import YearlyRosterView from '@/components/roster/YearlyRosterView';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Database } from '@/integrations/supabase/types';

type DutyType = Database['public']['Enums']['duty_type'];

// Extended filter configuration with sub-filters
const filterConfig = {
  OPD: {
    label: 'OPD',
    units: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Free Unit', 'Cornea', 'Retina', 'Glaucoma', 'Neuro-Ophthalmology', 'IOL', 'UVEA', 'ORBIT', 'Pediatric']
  },
  OT: {
    label: 'OT',
    specialty: ['Cataract OT', 'Cornea OT', 'Retina OT', 'Glaucoma OT', 'Neuro OT', 'ORBIT OT', 'Pediatrics OT', 'IOL OT']
  },
  Ward: {
    label: 'Ward',
    types: ['General Ward', 'Cataract Ward', 'Cornea Ward', 'Retina Ward', 'Glaucoma Ward']
  },
  Camp: {
    label: 'Camp',
    types: ['Stay Camp', 'Day Camp']
  },
  Daycare: {
    label: 'Daycare'
  },
  Physician: {
    label: 'Physician'
  },
  'Block Room': {
    label: 'Block Room'
  },
  'Night Duty': {
    label: 'Night Duty'
  },
  Emergency: {
    label: 'Emergency'
  },
  'Today Doctor': {
    label: 'Today Doctor'
  }
};

// Main duty type categories for filtering
const mainDutyTypes = Object.keys(filterConfig) as (keyof typeof filterConfig)[];

type ViewType = 'daily' | 'monthly' | 'yearly';

const Roster: React.FC = () => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<ViewType>('daily');
  const today = format(new Date(), 'yyyy-MM-dd');
  const { assignments, isLoading, refetch } = useRealtimeDutyAssignments(today);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [selectedSubFilter, setSelectedSubFilter] = useState<string | null>(null);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<DutyWithDoctor | null>(null);

  // Get sub-filter options for the selected main filter
  const subFilterOptions = useMemo(() => {
    if (!selectedFilter) return null;
    const config = filterConfig[selectedFilter as keyof typeof filterConfig];
    if (!config) return null;
    
    if ('units' in config) return { type: 'units', options: config.units };
    if ('specialty' in config) return { type: 'specialty', options: config.specialty };
    if ('types' in config) return { type: 'types', options: config.types };
    return null;
  }, [selectedFilter]);

  const filteredAssignments = useMemo(() => {
    return assignments.filter((assignment) => {
      const matchesSearch = assignment.doctor.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      
      // Main filter matching
      let matchesFilter = true;
      if (selectedFilter) {
        // For OT filter, match any specialty OT or the generic OT type
        if (selectedFilter === 'OT') {
          const otTypes = filterConfig.OT.specialty;
          matchesFilter = assignment.duty_type === 'OT' || otTypes.some(ot => assignment.duty_type === ot);
        } else {
          matchesFilter = assignment.duty_type === selectedFilter;
        }
      }
      
      // Sub-filter matching (for unit/specialty/type)
      let matchesSubFilter = true;
      if (selectedSubFilter) {
        if (subFilterOptions?.type === 'units') {
          matchesSubFilter = assignment.unit === selectedSubFilter;
        } else if (subFilterOptions?.type === 'specialty') {
          matchesSubFilter = assignment.duty_type === selectedSubFilter;
        } else if (subFilterOptions?.type === 'types') {
          // For ward/camp types, check duty_type or unit
          matchesSubFilter = assignment.duty_type === selectedSubFilter || assignment.unit === selectedSubFilter;
        }
      }
      
      return matchesSearch && matchesFilter && matchesSubFilter;
    });
  }, [assignments, searchQuery, selectedFilter, selectedSubFilter, subFilterOptions]);

  const myAssignments = useMemo(() => {
    if (!user?.doctorId) return [];
    // Only show the first Ward duty
    const wardDuties = assignments.filter(a => 
      a.doctor_id === user.doctorId && 
      a.duty_type === 'Ward'
    );
    return wardDuties.slice(0, 1); // Show only first Ward duty
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
          <h2 className="text-title text-foreground">Duty Roster</h2>
          <p className="text-caption text-muted-foreground">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeView === 'daily' && (
            <>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Wifi className="w-3 h-3" />
                <span>Live</span>
              </div>
              <Button variant="ghost" size="sm" onClick={refetch}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewType)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="daily" className="gap-1.5">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Daily</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="gap-1.5">
            <CalendarDays className="w-4 h-4" />
            <span className="hidden sm:inline">Monthly</span>
          </TabsTrigger>
          <TabsTrigger value="yearly" className="gap-1.5">
            <CalendarRange className="w-4 h-4" />
            <span className="hidden sm:inline">Yearly</span>
          </TabsTrigger>
        </TabsList>

        {/* Daily View Content */}
        <TabsContent value="daily" className="space-y-4 mt-4">
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
      <div className="animate-slide-up stagger-1 space-y-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-tiny text-muted-foreground font-medium">Filter by duty type</span>
          {(selectedFilter || selectedSubFilter) && (
            <button
              onClick={() => {
                setSelectedFilter(null);
                setSelectedSubFilter(null);
              }}
              className="ml-auto text-tiny text-primary hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
        
        {/* Main Duty Type Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedFilter(null);
              setSelectedSubFilter(null);
            }}
            className={cn(
              'px-3 py-1.5 rounded-full text-tiny font-medium transition-colors',
              !selectedFilter
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
            )}
          >
            All
          </button>
          {mainDutyTypes.map((type) => (
            <button
              key={type}
              onClick={() => {
                if (selectedFilter === type) {
                  setSelectedFilter(null);
                  setSelectedSubFilter(null);
                } else {
                  setSelectedFilter(type);
                  setSelectedSubFilter(null);
                }
              }}
              className={cn(
                'px-3 py-1.5 rounded-full text-tiny font-medium transition-colors',
                selectedFilter === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted-foreground/20'
              )}
            >
              {filterConfig[type].label}
            </button>
          ))}
        </div>

        {/* Sub-Filters (shown when main filter has sub-options) */}
        {subFilterOptions && (
          <div className="pl-4 border-l-2 border-primary/30">
            <p className="text-tiny text-muted-foreground mb-2">
              {subFilterOptions.type === 'units' ? 'Select Unit:' : 
               subFilterOptions.type === 'specialty' ? 'Select Specialty:' : 'Select Type:'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedSubFilter(null)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                  !selectedSubFilter
                    ? 'bg-primary/80 text-primary-foreground'
                    : 'bg-muted/80 text-muted-foreground hover:bg-muted-foreground/20'
                )}
              >
                All {subFilterOptions.type}
              </button>
              {subFilterOptions.options.map((option) => (
                <button
                  key={option}
                  onClick={() => setSelectedSubFilter(selectedSubFilter === option ? null : option)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors',
                    selectedSubFilter === option
                      ? 'bg-primary/80 text-primary-foreground'
                      : 'bg-muted/80 text-muted-foreground hover:bg-muted-foreground/20'
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}
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
        </TabsContent>

        {/* Monthly View Content */}
        <TabsContent value="monthly" className="mt-4">
          <MonthlyRosterView />
        </TabsContent>

        {/* Yearly View Content */}
        <TabsContent value="yearly" className="mt-4">
          <YearlyRosterView />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Roster;
