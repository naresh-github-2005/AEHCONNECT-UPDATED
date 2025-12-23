import React, { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DutyBadge, PhoneButton, DoctorAvatar } from '@/components/ui/DutyComponents';
import { DutyType } from '@/lib/mockData';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const dutyTypes: DutyType[] = ['OPD', 'OT', 'Night Duty', 'Ward', 'Camp'];

const Roster: React.FC = () => {
  const { dutyAssignments, lastUpdated } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<DutyType | null>(null);

  const filteredAssignments = useMemo(() => {
    return dutyAssignments.filter((assignment) => {
      const matchesSearch = assignment.doctor.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter = !selectedFilter || assignment.dutyType === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [dutyAssignments, searchQuery, selectedFilter]);

  return (
    <div className="px-4 py-6 space-y-4">
      {/* Header */}
      <div className="animate-fade-in">
        <h2 className="text-title text-foreground">Daily Roster</h2>
        <p className="text-caption text-muted-foreground">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

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
          Showing {filteredAssignments.length} of {dutyAssignments.length} duties
        </p>
      </div>

      {/* Roster List */}
      <div className="space-y-3 animate-slide-up stagger-2">
        {filteredAssignments.map((assignment, index) => (
          <Card 
            key={assignment.id} 
            className="shadow-soft card-interactive overflow-hidden"
            style={{ animationDelay: `${0.03 * index}s` }}
          >
            <CardContent className="py-4 px-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <DoctorAvatar name={assignment.doctor.name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium text-foreground truncate">
                      {assignment.doctor.name}
                    </p>
                    <p className="text-tiny text-muted-foreground mt-0.5">
                      {assignment.unit}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <DutyBadge type={assignment.dutyType} />
                      <span className="text-tiny text-muted-foreground">
                        {assignment.startTime} — {assignment.endTime}
                      </span>
                    </div>
                  </div>
                </div>
                <PhoneButton phone={assignment.doctor.phone} size="sm" />
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredAssignments.length === 0 && (
          <div className="text-center py-12">
            <p className="text-body text-muted-foreground">No duties found</p>
            <p className="text-caption text-muted-foreground mt-1">
              Try adjusting your search or filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Roster;
