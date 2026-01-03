import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { PlusCircle, Edit2, Trash2, FileText } from "lucide-react";
import { format } from "date-fns";

interface Doctor {
  id: string;
  name: string;
  designation: string;
  department: string;
}

interface TestMark {
  id: string;
  doctor_id: string;
  test_name: string;
  test_date: string;
  marks_obtained: number;
  total_marks: number;
  month: number;
  year: number;
  remarks: string | null;
  doctors: Doctor;
}

interface TestMarkForm {
  doctor_id: string;
  test_name: string;
  test_date: string;
  marks_obtained: string;
  total_marks: string;
  month: string;
  year: string;
  remarks: string;
}

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function TestMarks() {
  const queryClient = useQueryClient();
  const [selectedDesignation, setSelectedDesignation] = useState<string>("fellow");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingMark, setEditingMark] = useState<TestMark | null>(null);
  const [formData, setFormData] = useState<TestMarkForm>({
    doctor_id: "",
    test_name: "",
    test_date: "",
    marks_obtained: "",
    total_marks: "",
    month: "",
    year: currentYear.toString(),
    remarks: "",
  });

  // Fetch doctors based on designation (fellow or pg)
  const { data: doctors = [] } = useQuery({
    queryKey: ["doctors", selectedDesignation],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, name, designation, department")
        .eq("designation", selectedDesignation as "fellow" | "pg")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Doctor[];
    },
  });

  // Fetch all test marks for filtered doctors
  const { data: testMarks = [], isLoading } = useQuery({
    queryKey: ["test_marks", selectedDesignation],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_marks")
        .select(`
          *,
          doctors:doctor_id (
            id,
            name,
            designation,
            department
          )
        `)
        .order("test_date", { ascending: false });

      if (error) throw error;

      // Filter by designation
      const filtered = (data as any[]).filter(
        (mark) => mark.doctors?.designation === selectedDesignation
      );

      return filtered as TestMark[];
    },
  });

  // Add test mark mutation
  const addTestMarkMutation = useMutation({
    mutationFn: async (data: Omit<TestMark, "id" | "doctors">) => {
      const { error } = await supabase.from("test_marks").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test_marks"] });
      toast({
        title: "Success",
        description: "Test marks added successfully",
      });
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update test mark mutation
  const updateTestMarkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<TestMark> }) => {
      const { error } = await supabase
        .from("test_marks")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test_marks"] });
      toast({
        title: "Success",
        description: "Test marks updated successfully",
      });
      setEditingMark(null);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete test mark mutation
  const deleteTestMarkMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("test_marks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["test_marks"] });
      toast({
        title: "Success",
        description: "Test marks deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      doctor_id: "",
      test_name: "",
      test_date: "",
      marks_obtained: "",
      total_marks: "",
      month: "",
      year: currentYear.toString(),
      remarks: "",
    });
  };

  const handleSubmit = () => {
    if (
      !formData.doctor_id ||
      !formData.test_name ||
      !formData.test_date ||
      !formData.marks_obtained ||
      !formData.total_marks ||
      !formData.month ||
      !formData.year
    ) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const marks_obtained = parseFloat(formData.marks_obtained);
    const total_marks = parseFloat(formData.total_marks);

    if (marks_obtained > total_marks) {
      toast({
        title: "Validation Error",
        description: "Marks obtained cannot exceed total marks",
        variant: "destructive",
      });
      return;
    }

    const testMarkData = {
      doctor_id: formData.doctor_id,
      test_name: formData.test_name,
      test_date: formData.test_date,
      marks_obtained,
      total_marks,
      month: parseInt(formData.month),
      year: parseInt(formData.year),
      remarks: formData.remarks || null,
    };

    if (editingMark) {
      updateTestMarkMutation.mutate({ id: editingMark.id, data: testMarkData });
    } else {
      addTestMarkMutation.mutate(testMarkData as any);
    }
  };

  const handleEdit = (mark: TestMark) => {
    setEditingMark(mark);
    setFormData({
      doctor_id: mark.doctor_id,
      test_name: mark.test_name,
      test_date: mark.test_date,
      marks_obtained: mark.marks_obtained.toString(),
      total_marks: mark.total_marks.toString(),
      month: mark.month.toString(),
      year: mark.year.toString(),
      remarks: mark.remarks || "",
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this test mark?")) {
      deleteTestMarkMutation.mutate(id);
    }
  };

  const calculatePercentile = (obtained: number, total: number) => {
    return ((obtained / total) * 100).toFixed(2);
  };

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return "text-green-600";
    if (percentile >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Test Marks Management</h1>
          <p className="text-muted-foreground">
            Manage test marks for Fellows and PG doctors
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingMark(null); resetForm(); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Test Marks
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMark ? "Edit Test Marks" : "Add Test Marks"}
              </DialogTitle>
              <DialogDescription>
                Enter the test details and marks for the selected doctor
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="doctor">Doctor *</Label>
                <Select
                  value={formData.doctor_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, doctor_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((doctor) => (
                      <SelectItem key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="test_name">Test Name *</Label>
                <Input
                  id="test_name"
                  placeholder="e.g., Monthly Assessment - Ophthalmology"
                  value={formData.test_name}
                  onChange={(e) =>
                    setFormData({ ...formData, test_name: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="month">Month *</Label>
                  <Select
                    value={formData.month}
                    onValueChange={(value) =>
                      setFormData({ ...formData, month: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="year">Year *</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(value) =>
                      setFormData({ ...formData, year: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="test_date">Test Date *</Label>
                <Input
                  id="test_date"
                  type="date"
                  value={formData.test_date}
                  onChange={(e) =>
                    setFormData({ ...formData, test_date: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="marks_obtained">Marks Obtained *</Label>
                  <Input
                    id="marks_obtained"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 75"
                    value={formData.marks_obtained}
                    onChange={(e) =>
                      setFormData({ ...formData, marks_obtained: e.target.value })
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="total_marks">Total Marks *</Label>
                  <Input
                    id="total_marks"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="e.g., 100"
                    value={formData.total_marks}
                    onChange={(e) =>
                      setFormData({ ...formData, total_marks: e.target.value })
                    }
                  />
                </div>
              </div>

              {formData.marks_obtained && formData.total_marks && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">
                    Percentile:{" "}
                    <span
                      className={`text-lg font-bold ${getPercentileColor(
                        parseFloat(
                          calculatePercentile(
                            parseFloat(formData.marks_obtained),
                            parseFloat(formData.total_marks)
                          )
                        )
                      )}`}
                    >
                      {calculatePercentile(
                        parseFloat(formData.marks_obtained),
                        parseFloat(formData.total_marks)
                      )}
                      %
                    </span>
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="remarks">Remarks</Label>
                <Textarea
                  id="remarks"
                  placeholder="Any additional notes or comments"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingMark(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingMark ? "Update" : "Add"} Test Marks
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter by Designation */}
      <Card>
        <CardHeader>
          <CardTitle>Filter by Designation</CardTitle>
          <CardDescription>
            View and manage test marks for Fellows or PG doctors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedDesignation}
            onValueChange={setSelectedDesignation}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fellow">Fellow</SelectItem>
              <SelectItem value="pg">PG</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Test Marks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Test Marks Records</CardTitle>
          <CardDescription>
            {testMarks.length} records found for {selectedDesignation.toUpperCase()}s
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : testMarks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No test marks found</p>
              <p className="text-sm">
                Add test marks using the "Add Test Marks" button above
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Month/Year</TableHead>
                    <TableHead>Test Date</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Percentile</TableHead>
                    <TableHead>Remarks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testMarks.map((mark) => {
                    const percentile = calculatePercentile(
                      mark.marks_obtained,
                      mark.total_marks
                    );
                    return (
                      <TableRow key={mark.id}>
                        <TableCell className="font-medium">
                          {mark.doctors?.name}
                        </TableCell>
                        <TableCell>{mark.doctors?.department}</TableCell>
                        <TableCell>{mark.test_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {MONTHS.find((m) => m.value === mark.month.toString())
                              ?.label || mark.month}{" "}
                            {mark.year}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(mark.test_date), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>
                          {mark.marks_obtained} / {mark.total_marks}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`font-bold ${getPercentileColor(
                              parseFloat(percentile)
                            )}`}
                          >
                            {percentile}%
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {mark.remarks || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(mark)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(mark.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
