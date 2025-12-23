import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Users, Search, Edit2, Save, X, Loader2, Shield, 
  Moon, Tent, Activity, Clock, Heart
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SeniorityLevel, MedicalSpecialty } from '@/lib/mockData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Doctor {
  id: string;
  name: string;
  phone: string;
  department: string;
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
  is_active: boolean;
}

const seniorityLabels: Record<SeniorityLevel, string> = {
  'senior_consultant': 'Senior Consultant',
  'consultant': 'Consultant',
  'fellow': 'Fellow',
  'resident': 'Resident',
  'intern': 'Intern',
};

const seniorityColors: Record<SeniorityLevel, string> = {
  'senior_consultant': 'bg-purple-500/10 text-purple-600 border-purple-200',
  'consultant': 'bg-blue-500/10 text-blue-600 border-blue-200',
  'fellow': 'bg-green-500/10 text-green-600 border-green-200',
  'resident': 'bg-orange-500/10 text-orange-600 border-orange-200',
  'intern': 'bg-gray-500/10 text-gray-600 border-gray-200',
};

const specialtyLabels: Record<MedicalSpecialty, string> = {
  'general': 'General',
  'cornea': 'Cornea',
  'retina': 'Retina',
  'glaucoma': 'Glaucoma',
  'oculoplasty': 'Oculoplasty',
  'pediatric': 'Pediatric',
  'neuro': 'Neuro',
  'cataract': 'Cataract',
};

const DoctorProfiles: React.FC = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .order('name');
    
    if (error) {
      toast.error('Failed to fetch doctors');
    } else if (data) {
      setDoctors(data as Doctor[]);
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!selectedDoctor) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from('doctors')
      .update({
        seniority: selectedDoctor.seniority,
        specialty: selectedDoctor.specialty,
        max_night_duties_per_month: selectedDoctor.max_night_duties_per_month,
        max_hours_per_week: selectedDoctor.max_hours_per_week,
        fixed_off_days: selectedDoctor.fixed_off_days,
        health_constraints: selectedDoctor.health_constraints,
        can_do_opd: selectedDoctor.can_do_opd,
        can_do_ot: selectedDoctor.can_do_ot,
        can_do_ward: selectedDoctor.can_do_ward,
        can_do_camp: selectedDoctor.can_do_camp,
        can_do_night: selectedDoctor.can_do_night,
        is_active: selectedDoctor.is_active,
      })
      .eq('id', selectedDoctor.id);
    
    if (error) {
      toast.error('Failed to update doctor profile');
    } else {
      toast.success('Doctor profile updated successfully');
      setIsDialogOpen(false);
      fetchDoctors();
    }
    setIsSaving(false);
  };

  const filteredDoctors = doctors.filter(d =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Doctor Profiles</h1>
        <p className="text-tiny text-muted-foreground">Manage seniority, specialty & constraints</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-10"
          placeholder="Search doctors..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(seniorityLabels).map(([key, label]) => {
          const count = doctors.filter(d => d.seniority === key).length;
          return (
            <div key={key} className="p-2 rounded-lg bg-muted/50 text-center">
              <p className="text-lg font-bold">{count}</p>
              <p className="text-[10px] text-muted-foreground truncate">{label}s</p>
            </div>
          );
        })}
      </div>

      {/* Doctors Grid */}
      <div className="grid gap-3">
        {filteredDoctors.map((doctor) => (
          <Card 
            key={doctor.id} 
            className={`cursor-pointer hover:border-primary/50 transition-colors ${!doctor.is_active ? 'opacity-60' : ''}`}
            onClick={() => {
              setSelectedDoctor({ ...doctor });
              setIsDialogOpen(true);
            }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {doctor.name.split(' ').filter(p => !p.startsWith('Dr.')).map(p => p[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{doctor.name}</p>
                      {!doctor.is_active && (
                        <Badge variant="secondary" className="text-[10px]">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className={`text-[10px] ${seniorityColors[doctor.seniority]}`}>
                        {seniorityLabels[doctor.seniority]}
                      </Badge>
                      <span className="text-tiny text-muted-foreground capitalize">
                        {specialtyLabels[doctor.specialty]}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <div className="flex items-center gap-1 text-tiny">
                    <Moon className="w-3 h-3" />
                    <span>{doctor.max_night_duties_per_month}/mo</span>
                  </div>
                  <div className="flex items-center gap-1 text-tiny">
                    <Clock className="w-3 h-3" />
                    <span>{doctor.max_hours_per_week}h/wk</span>
                  </div>
                  {doctor.health_constraints && (
                    <Heart className="w-4 h-4 text-red-500" />
                  )}
                  <Edit2 className="w-4 h-4" />
                </div>
              </div>
              
              {/* Capabilities */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {doctor.can_do_opd && <Badge variant="secondary" className="text-[9px]">OPD</Badge>}
                {doctor.can_do_ot && <Badge variant="secondary" className="text-[9px]">OT</Badge>}
                {doctor.can_do_ward && <Badge variant="secondary" className="text-[9px]">Ward</Badge>}
                {doctor.can_do_night && <Badge variant="secondary" className="text-[9px]">Night</Badge>}
                {doctor.can_do_camp && <Badge variant="secondary" className="text-[9px]">Camp</Badge>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Edit Doctor Profile
            </DialogTitle>
          </DialogHeader>
          
          {selectedDoctor && (
            <div className="space-y-5 pt-2">
              <div className="text-center py-3 bg-muted/50 rounded-lg">
                <p className="font-semibold text-lg">{selectedDoctor.name}</p>
                <p className="text-tiny text-muted-foreground">{selectedDoctor.department}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Seniority Level</Label>
                  <Select
                    value={selectedDoctor.seniority}
                    onValueChange={(value) => setSelectedDoctor({ ...selectedDoctor, seniority: value as SeniorityLevel })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(seniorityLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Specialty</Label>
                  <Select
                    value={selectedDoctor.specialty}
                    onValueChange={(value) => setSelectedDoctor({ ...selectedDoctor, specialty: value as MedicalSpecialty })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(specialtyLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5" />
                    Max Night Duties / Month
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={15}
                    value={selectedDoctor.max_night_duties_per_month}
                    onChange={(e) => setSelectedDoctor({ ...selectedDoctor, max_night_duties_per_month: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Max Hours / Week
                  </Label>
                  <Input
                    type="number"
                    min={20}
                    max={80}
                    value={selectedDoctor.max_hours_per_week}
                    onChange={(e) => setSelectedDoctor({ ...selectedDoctor, max_hours_per_week: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5" />
                  Health Constraints
                </Label>
                <Input
                  value={selectedDoctor.health_constraints || ''}
                  onChange={(e) => setSelectedDoctor({ ...selectedDoctor, health_constraints: e.target.value || null })}
                  placeholder="e.g., No night duties due to health condition"
                />
              </div>

              <div className="space-y-3">
                <Label>Duty Capabilities</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm">OPD</span>
                    <Switch
                      checked={selectedDoctor.can_do_opd}
                      onCheckedChange={(checked) => setSelectedDoctor({ ...selectedDoctor, can_do_opd: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm">OT</span>
                    <Switch
                      checked={selectedDoctor.can_do_ot}
                      onCheckedChange={(checked) => setSelectedDoctor({ ...selectedDoctor, can_do_ot: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm">Ward</span>
                    <Switch
                      checked={selectedDoctor.can_do_ward}
                      onCheckedChange={(checked) => setSelectedDoctor({ ...selectedDoctor, can_do_ward: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                    <span className="text-sm">Night Duty</span>
                    <Switch
                      checked={selectedDoctor.can_do_night}
                      onCheckedChange={(checked) => setSelectedDoctor({ ...selectedDoctor, can_do_night: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50 col-span-2">
                    <div className="flex items-center gap-2">
                      <Tent className="w-4 h-4" />
                      <span className="text-sm">Camp Duty</span>
                    </div>
                    <Switch
                      checked={selectedDoctor.can_do_camp}
                      onCheckedChange={(checked) => setSelectedDoctor({ ...selectedDoctor, can_do_camp: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div>
                  <p className="font-medium">Active Status</p>
                  <p className="text-tiny text-muted-foreground">Include in scheduling</p>
                </div>
                <Switch
                  checked={selectedDoctor.is_active}
                  onCheckedChange={(checked) => setSelectedDoctor({ ...selectedDoctor, is_active: checked })}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsDialogOpen(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DoctorProfiles;
