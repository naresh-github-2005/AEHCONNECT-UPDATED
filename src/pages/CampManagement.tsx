import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Tent, MapPin, Calendar, Clock, Users, Plus, 
  CheckCircle, XCircle, Loader2, Edit2, Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MedicalSpecialty } from '@/lib/mockData';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Camp {
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

interface CampAssignment {
  id: string;
  camp_id: string;
  doctor_id: string;
  status: string;
  doctor?: {
    id: string;
    name: string;
    specialty: MedicalSpecialty;
  };
}

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

const CampManagement: React.FC = () => {
  const [camps, setCamps] = useState<Camp[]>([]);
  const [assignments, setAssignments] = useState<CampAssignment[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCamp, setSelectedCamp] = useState<Camp | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    camp_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '08:00',
    end_time: '17:00',
    required_doctors: 2,
    specialty_required: '' as MedicalSpecialty | '',
    notes: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    
    const { data: campsData } = await supabase
      .from('camps')
      .select('*')
      .order('camp_date', { ascending: true });
    
    if (campsData) setCamps(campsData);

    const { data: assignmentsData } = await supabase
      .from('camp_assignments')
      .select(`
        *,
        doctor:doctors(id, name, specialty)
      `);
    
    if (assignmentsData) setAssignments(assignmentsData as CampAssignment[]);

    // Get all active doctors - filter by eligible_duties containing 'Camp' in the UI
    const { data: doctorsData } = await supabase
      .from('doctors')
      .select('*')
      .eq('is_active', true);
    
    // Filter doctors who can do camp duty based on eligible_duties
    if (doctorsData) {
      const campEligibleDoctors = doctorsData.filter(d => 
        d.eligible_duties && d.eligible_duties.includes('Camp')
      );
      setDoctors(campEligibleDoctors);
    }

    setIsLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.location || !formData.camp_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    const campData = {
      ...formData,
      specialty_required: formData.specialty_required || null,
    };

    if (selectedCamp) {
      const { error } = await supabase
        .from('camps')
        .update(campData)
        .eq('id', selectedCamp.id);
      
      if (error) {
        toast.error('Failed to update camp');
        return;
      }
      toast.success('Camp updated successfully');
    } else {
      const { error } = await supabase
        .from('camps')
        .insert([campData]);
      
      if (error) {
        toast.error('Failed to create camp');
        return;
      }
      toast.success('Camp created successfully');
    }

    setIsDialogOpen(false);
    setSelectedCamp(null);
    resetForm();
    fetchData();
  };

  const handleDelete = async (campId: string) => {
    const { error } = await supabase
      .from('camps')
      .delete()
      .eq('id', campId);
    
    if (error) {
      toast.error('Failed to delete camp');
      return;
    }
    
    toast.success('Camp deleted successfully');
    fetchData();
  };

  const assignDoctor = async (campId: string, doctorId: string) => {
    const { error } = await supabase
      .from('camp_assignments')
      .insert([{ camp_id: campId, doctor_id: doctorId }]);
    
    if (error) {
      if (error.code === '23505') {
        toast.error('Doctor already assigned to this camp');
      } else {
        toast.error('Failed to assign doctor');
      }
      return;
    }
    
    toast.success('Doctor assigned to camp');
    fetchData();
  };

  const removeAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from('camp_assignments')
      .delete()
      .eq('id', assignmentId);
    
    if (error) {
      toast.error('Failed to remove assignment');
      return;
    }
    
    toast.success('Assignment removed');
    fetchData();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      camp_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '08:00',
      end_time: '17:00',
      required_doctors: 2,
      specialty_required: '',
      notes: '',
    });
  };

  const openEditDialog = (camp: Camp) => {
    setSelectedCamp(camp);
    setFormData({
      name: camp.name,
      location: camp.location,
      camp_date: camp.camp_date,
      start_time: camp.start_time,
      end_time: camp.end_time,
      required_doctors: camp.required_doctors,
      specialty_required: camp.specialty_required || '',
      notes: camp.notes || '',
    });
    setIsDialogOpen(true);
  };

  const getCampAssignments = (campId: string) => {
    return assignments.filter(a => a.camp_id === campId);
  };

  const getAvailableDoctors = (camp: Camp) => {
    const assignedIds = getCampAssignments(camp.id).map(a => a.doctor_id);
    return doctors.filter(d => {
      if (assignedIds.includes(d.id)) return false;
      if (camp.specialty_required && d.specialty !== camp.specialty_required) return false;
      return true;
    });
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Camp Management</h1>
          <p className="text-tiny text-muted-foreground">Schedule and manage eye camps</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedCamp(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Camp
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedCamp ? 'Edit Camp' : 'Create New Camp'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>Camp Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Rural Eye Camp - Madurai"
                />
              </div>
              <div>
                <Label>Location *</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., District Hospital, Madurai"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.camp_date}
                    onChange={(e) => setFormData({ ...formData, camp_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Required Doctors</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.required_doctors}
                    onChange={(e) => setFormData({ ...formData, required_doctors: parseInt(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Specialty Required</Label>
                <Select
                  value={formData.specialty_required || "any"}
                  onValueChange={(value) => setFormData({ ...formData, specialty_required: value === "any" ? "" : value as MedicalSpecialty })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any specialty</SelectItem>
                    {Object.entries(specialtyLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
              <Button className="w-full" onClick={handleSubmit}>
                {selectedCamp ? 'Update Camp' : 'Create Camp'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Camps List */}
      <div className="space-y-4">
        {camps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Tent className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No camps scheduled</p>
              <p className="text-tiny text-muted-foreground mt-1">Click "Add Camp" to create one</p>
            </CardContent>
          </Card>
        ) : (
          camps.map((camp) => {
            const campAssignments = getCampAssignments(camp.id);
            const availableDoctors = getAvailableDoctors(camp);
            const isFullyStaffed = campAssignments.length >= camp.required_doctors;
            const isPast = new Date(camp.camp_date) < new Date();

            return (
              <Card key={camp.id} className={isPast ? 'opacity-60' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isFullyStaffed ? 'bg-green-500/10' : 'bg-orange-500/10'}`}>
                        <Tent className={`w-5 h-5 ${isFullyStaffed ? 'text-green-600' : 'text-orange-600'}`} />
                      </div>
                      <div>
                        <CardTitle className="text-base">{camp.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1 text-tiny text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          {camp.location}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isPast && (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(camp)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(camp.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3 text-tiny">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{format(new Date(camp.camp_date), 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{camp.start_time} - {camp.end_time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{campAssignments.length}/{camp.required_doctors} doctors</span>
                    </div>
                    {camp.specialty_required && (
                      <Badge variant="secondary" className="text-[10px]">
                        {specialtyLabels[camp.specialty_required]} specialty
                      </Badge>
                    )}
                  </div>

                  {/* Assigned Doctors */}
                  {campAssignments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-tiny font-medium text-muted-foreground">Assigned Doctors</p>
                      <div className="flex flex-wrap gap-2">
                        {campAssignments.map((assignment) => (
                          <Badge key={assignment.id} variant="outline" className="gap-1.5 pr-1">
                            <CheckCircle className="w-3 h-3 text-green-500" />
                            {assignment.doctor?.name}
                            {!isPast && (
                              <button
                                onClick={() => removeAssignment(assignment.id)}
                                className="ml-1 hover:text-destructive"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            )}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Add Doctor */}
                  {!isPast && !isFullyStaffed && availableDoctors.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <Select onValueChange={(doctorId) => assignDoctor(camp.id, doctorId)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Assign a doctor..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableDoctors.map((doctor) => (
                            <SelectItem key={doctor.id} value={doctor.id}>
                              {doctor.name} ({specialtyLabels[doctor.specialty] || doctor.specialty})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {camp.notes && (
                    <p className="text-tiny text-muted-foreground italic">
                      {camp.notes}
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default CampManagement;
