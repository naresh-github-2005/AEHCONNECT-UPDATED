import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, Search, ExternalLink, ChevronDown, ArrowLeft,
  FileText, Users, Link as LinkIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface Publication {
  id: string;
  user_id: string;
  doctor_id: string | null;
  doctor_name: string;
  title: string;
  link: string | null;
  created_at: string;
}

interface DoctorPublications {
  doctorName: string;
  doctorId: string | null;
  userId: string;
  publications: Publication[];
}

const AllPublications: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [publications, setPublications] = useState<Publication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDoctors, setExpandedDoctors] = useState<Set<string>>(new Set());

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchAllPublications();
  }, []);

  const fetchAllPublications = async () => {
    try {
      const { data, error } = await supabase
        .from('publications')
        .select('*')
        .order('doctor_name', { ascending: true })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPublications(data || []);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  // Group publications by doctor
  const groupedByDoctor: DoctorPublications[] = React.useMemo(() => {
    const filtered = publications.filter(pub =>
      pub.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pub.doctor_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const grouped = new Map<string, DoctorPublications>();
    
    filtered.forEach(pub => {
      const key = pub.user_id;
      if (!grouped.has(key)) {
        grouped.set(key, {
          doctorName: pub.doctor_name,
          doctorId: pub.doctor_id,
          userId: pub.user_id,
          publications: [],
        });
      }
      grouped.get(key)!.publications.push(pub);
    });

    return Array.from(grouped.values()).sort((a, b) => 
      b.publications.length - a.publications.length
    );
  }, [publications, searchQuery]);

  const totalPublications = publications.length;
  const totalDoctors = new Set(publications.map(p => p.user_id)).size;

  const toggleDoctor = (userId: string) => {
    setExpandedDoctors(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDoctors(new Set(groupedByDoctor.map(d => d.userId)));
  };

  const collapseAll = () => {
    setExpandedDoctors(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">All Publications</h1>
          <p className="text-xs text-muted-foreground">
            {totalPublications} publication{totalPublications !== 1 ? 's' : ''} from {totalDoctors} doctor{totalDoctors !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 p-4">
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPublications}</p>
              <p className="text-xs text-muted-foreground">Publications</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDoctors}</p>
              <p className="text-xs text-muted-foreground">Contributors</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="px-4 pb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or doctor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
        </div>
      </div>

      {/* Grouped Publications */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {groupedByDoctor.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BookOpen className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm">
                {searchQuery ? 'No publications found' : 'No publications yet'}
              </p>
            </div>
          ) : (
            groupedByDoctor.map((doctor) => (
              <Card key={doctor.userId} className="overflow-hidden">
                <Collapsible
                  open={expandedDoctors.has(doctor.userId)}
                  onOpenChange={() => toggleDoctor(doctor.userId)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="p-4 flex items-center gap-3 cursor-pointer hover:bg-accent transition-colors">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {doctor.doctorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{doctor.doctorName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {doctor.publications.length} publication{doctor.publications.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {doctor.publications.length}
                      </Badge>
                      <ChevronDown className={`h-5 w-5 transition-transform ${expandedDoctors.has(doctor.userId) ? 'rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="border-t px-4 pb-4 space-y-3">
                      {doctor.publications.map((pub) => (
                        <div key={pub.id} className="flex items-start gap-3 pt-3 border-t first:border-t-0 first:pt-3">
                          <div className="p-1.5 rounded bg-muted shrink-0">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-tight">{pub.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(pub.created_at), 'MMM d, yyyy')}
                            </p>
                            {pub.link && (
                              <a
                                href={pub.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                              >
                                <LinkIcon className="h-3 w-3" />
                                View
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default AllPublications;
