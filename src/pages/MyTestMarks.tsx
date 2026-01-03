import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { FileText, TrendingUp, Calendar } from "lucide-react";
import { format } from "date-fns";

interface TestMark {
  id: string;
  test_name: string;
  test_date: string;
  marks_obtained: number;
  total_marks: number;
  month: number;
  year: number;
  remarks: string | null;
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
const currentMonth = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export default function MyTestMarks() {
  const { user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState<string>(
    currentMonth.toString()
  );
  const [selectedYear, setSelectedYear] = useState<string>(
    currentYear.toString()
  );

  // Fetch doctor's own test marks
  const { data: testMarks = [], isLoading } = useQuery({
    queryKey: ["my_test_marks", user?.doctorId],
    queryFn: async () => {
      if (!user?.doctorId) return [];

      const { data, error } = await supabase
        .from("test_marks")
        .select("*")
        .eq("doctor_id", user.doctorId)
        .order("test_date", { ascending: false });

      if (error) throw error;
      return data as TestMark[];
    },
    enabled: !!user?.doctorId,
  });

  // Filter test marks by selected month and year
  const filteredMarks = testMarks.filter(
    (mark) =>
      mark.month === parseInt(selectedMonth) &&
      mark.year === parseInt(selectedYear)
  );

  // Calculate statistics
  const calculatePercentile = (obtained: number, total: number) => {
    return (obtained / total) * 100;
  };

  const averagePercentile =
    filteredMarks.length > 0
      ? filteredMarks.reduce(
          (sum, mark) =>
            sum + calculatePercentile(mark.marks_obtained, mark.total_marks),
          0
        ) / filteredMarks.length
      : 0;

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 75) return "text-green-600 bg-green-50";
    if (percentile >= 50) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const getProgressColor = (percentile: number) => {
    if (percentile >= 75) return "bg-green-600";
    if (percentile >= 50) return "bg-yellow-600";
    return "bg-red-600";
  };

  const getPerformanceLabel = (percentile: number) => {
    if (percentile >= 90) return "Excellent";
    if (percentile >= 75) return "Good";
    if (percentile >= 50) return "Average";
    return "Needs Improvement";
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Test Marks</h1>
        <p className="text-muted-foreground">
          View your monthly test performance and track your progress
        </p>
      </div>

      {/* Month and Year Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Period
          </CardTitle>
          <CardDescription>
            Choose month and year to view your test marks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Year</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
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
        </CardContent>
      </Card>

      {/* Average Performance Card */}
      {filteredMarks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Monthly Average
            </CardTitle>
            <CardDescription>
              {MONTHS.find((m) => m.value === selectedMonth)?.label}{" "}
              {selectedYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Average Percentile
                  </p>
                  <p className="text-4xl font-bold">
                    {averagePercentile.toFixed(1)}%
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={getPercentileColor(averagePercentile)}
                >
                  {getPerformanceLabel(averagePercentile)}
                </Badge>
              </div>
              <div className="space-y-2">
                <Progress
                  value={averagePercentile}
                  className="h-3"
                  indicatorClassName={getProgressColor(averagePercentile)}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Based on {filteredMarks.length} test
                  {filteredMarks.length > 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Marks List */}
      <Card>
        <CardHeader>
          <CardTitle>Test Records</CardTitle>
          <CardDescription>
            {filteredMarks.length} test
            {filteredMarks.length !== 1 ? "s" : ""} found for{" "}
            {MONTHS.find((m) => m.value === selectedMonth)?.label} {selectedYear}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : filteredMarks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg font-medium">No test marks found</p>
              <p className="text-sm">
                No tests recorded for{" "}
                {MONTHS.find((m) => m.value === selectedMonth)?.label}{" "}
                {selectedYear}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMarks.map((mark) => {
                const percentile = calculatePercentile(
                  mark.marks_obtained,
                  mark.total_marks
                );
                return (
                  <Card key={mark.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <h3 className="font-semibold text-lg">
                              {mark.test_name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(mark.test_date), "EEEE, dd MMMM yyyy")}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={getPercentileColor(percentile)}
                          >
                            {getPerformanceLabel(percentile)}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium">
                              Score: {mark.marks_obtained} / {mark.total_marks}
                            </span>
                            <span
                              className={`text-2xl font-bold ${
                                percentile >= 75
                                  ? "text-green-600"
                                  : percentile >= 50
                                  ? "text-yellow-600"
                                  : "text-red-600"
                              }`}
                            >
                              {percentile.toFixed(1)}%
                            </span>
                          </div>

                          {/* Circular Progress Bar */}
                          <div className="relative pt-1">
                            <Progress
                              value={percentile}
                              className="h-4"
                              indicatorClassName={getProgressColor(percentile)}
                            />
                          </div>
                        </div>

                        {mark.remarks && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">Remarks:</p>
                            <p className="text-sm text-muted-foreground">
                              {mark.remarks}
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All-time Summary */}
      {testMarks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>All-Time Performance</CardTitle>
            <CardDescription>Your overall test statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  Total Tests
                </p>
                <p className="text-3xl font-bold">{testMarks.length}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">
                  Overall Average
                </p>
                <p className="text-3xl font-bold">
                  {(
                    testMarks.reduce(
                      (sum, mark) =>
                        sum +
                        calculatePercentile(
                          mark.marks_obtained,
                          mark.total_marks
                        ),
                      0
                    ) / testMarks.length
                  ).toFixed(1)}
                  %
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm text-muted-foreground mb-1">Best Score</p>
                <p className="text-3xl font-bold">
                  {Math.max(
                    ...testMarks.map((mark) =>
                      calculatePercentile(mark.marks_obtained, mark.total_marks)
                    )
                  ).toFixed(1)}
                  %
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
