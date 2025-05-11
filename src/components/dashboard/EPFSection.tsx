import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from "recharts";
import { format, parse, isAfter, startOfMonth, getDate, subMonths, parseISO, getMonth, getYear } from "date-fns";
import { Loader } from "@/components/ui/loader";
import { BadgePlus, TrendingUp, Wallet, Calendar, ArrowUp, Plus, Edit, Check } from "lucide-react";

interface EPFContribution {
  id: number;
  user_id: string;
  amount: number;
  date: string;
  created_at: string;
}

export function EPFSection() {
  const [contributions, setContributions] = useState<EPFContribution[]>([]);
  const [totalContribution, setTotalContribution] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [monthlyAmount, setMonthlyAmount] = useState(3600);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isPastMonthDialogOpen, setIsPastMonthDialogOpen] = useState(false);
  const [newAmount, setNewAmount] = useState(3600);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedAmount, setSelectedAmount] = useState(3600);
  const { user } = useAuthStore();

  // Function to fetch EPF contributions
  const fetchContributions = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("epf_contributions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (error) throw error;

      setContributions(data || []);

      // Calculate total
      const total = (data || []).reduce(
        (sum, item) => sum + (item.amount || 0),
        0
      );
      setTotalContribution(total);
    } catch (error) {
      console.error("Error fetching EPF contributions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContributions();
  }, [user]);

  // Function to update monthly contribution amount
  const updateMonthlyContribution = async () => {
    if (!user || newAmount <= 0) return;

    try {
      setIsLoading(true);

      // Update the monthly amount state
      setMonthlyAmount(newAmount);

      // Close the dialog
      setIsUpdateDialogOpen(false);

      // Future contributions will use this new amount
      // No need to update the database here as it will be used when new entries are created

    } catch (error) {
      console.error("Error updating monthly contribution:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update a past month's contribution
  const updatePastMonthContribution = async () => {
    if (!user || !selectedMonth || selectedAmount <= 0) return;

    try {
      setIsLoading(true);

      // Create the date for the selected month (5th day of the month)
      const year = parseInt(selectedYear);
      const month = parseInt(selectedMonth) - 1; // JavaScript months are 0-indexed
      const date = new Date(year, month, 5);
      const formattedDate = date.toISOString().split('T')[0];

      // Check if there's already a contribution for this month
      const existingContribution = contributions.find(contribution => {
        const contribDate = new Date(contribution.date);
        return getMonth(contribDate) === month && getYear(contribDate) === year;
      });

      if (existingContribution) {
        // Update the existing contribution
        const { error } = await supabase
          .from("epf_contributions")
          .update({ amount: selectedAmount })
          .eq("id", existingContribution.id);

        if (error) throw error;
      } else {
        // Create a new contribution for this month
        const newContribution = {
          user_id: user.id,
          amount: selectedAmount,
          date: formattedDate,
          notes: "Manually added contribution"
        };

        const { error } = await supabase
          .from("epf_contributions")
          .insert([newContribution]);

        if (error) throw error;
      }

      // Refresh contributions
      await fetchContributions();

      // Reset form and close dialog
      setSelectedMonth("");
      setSelectedAmount(3600);
      setIsPastMonthDialogOpen(false);

    } catch (error) {
      console.error("Error updating past month contribution:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get cumulative data for chart
  const getCumulativeChartData = () => {
    let runningTotal = 0;
    return [...contributions]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((contribution) => {
        runningTotal += contribution.amount;
        return {
          month: format(new Date(contribution.date), "MMM yyyy"),
          amount: contribution.amount,
          cumulative: runningTotal,
        };
      });
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total EPF Contribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
              {isLoading ? (
                <Loader />
              ) : (
                `₹ ${totalContribution.toLocaleString("en-MY", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-100 dark:border-emerald-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Monthly Contribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                {isLoading ? (
                  <Loader />
                ) : contributions.length > 0 ? (
                  `₹ ${monthlyAmount.toLocaleString("en-MY", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`
                ) : (
                  `₹ 0.00`
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setNewAmount(monthlyAmount);
                  setIsUpdateDialogOpen(true);
                }}
                className="text-emerald-700 dark:text-emerald-400"
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
            <div className="mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPastMonthDialogOpen(true)}
                className="text-xs w-full"
              >
                Update Past Month
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dialog for updating monthly contribution */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Update Monthly Contribution</DialogTitle>
              <DialogDescription>
                Set the new amount for future EPF contributions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="amount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="amount"
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateMonthlyContribution}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog for updating past month contribution */}
        <Dialog open={isPastMonthDialogOpen} onOpenChange={setIsPastMonthDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Update Past Month Contribution</DialogTitle>
              <DialogDescription>
                Modify or add a contribution for a specific month.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="year" className="text-right">
                  Year
                </Label>
                <Select
                  value={selectedYear}
                  onValueChange={setSelectedYear}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(5)].map((_, i) => {
                      const year = new Date().getFullYear() - i;
                      return (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="month" className="text-right">
                  Month
                </Label>
                <Select
                  value={selectedMonth}
                  onValueChange={setSelectedMonth}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="pastAmount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="pastAmount"
                  type="number"
                  value={selectedAmount}
                  onChange={(e) => setSelectedAmount(Number(e.target.value))}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPastMonthDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={updatePastMonthContribution}
                disabled={!selectedMonth || selectedAmount <= 0}
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-100 dark:border-purple-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-700 dark:text-purple-400 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
              {isLoading ? (
                <Loader />
              ) : contributions.length > 0 ? (
                `${contributions.length} Months`
              ) : (
                `0 Months`
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main visualization card */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <div>
              <CardTitle>EPF Contributions Over Time</CardTitle>
              <CardDescription>
                Track your monthly and cumulative contributions
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader />
              </div>
            ) : contributions.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={getCumulativeChartData()}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [
                      `₹ ${Number(value).toLocaleString("en-MY", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}`,
                      "Amount",
                    ]}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorCumulative)"
                    name="Cumulative"
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                    name="Monthly"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-center p-6 text-gray-500">
                <div>
                  <p className="mb-4">No contribution data available yet.</p>
                  <p className="text-sm">Data will be automatically added on the 5th of each month.</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row items-center justify-between text-sm text-gray-500 border-t pt-4">
          <div>EPF = Employee Provident Fund</div>
          <div>Contributions are made monthly on the 5th</div>
        </CardFooter>
      </Card>

      {/* Recent EPF Contributions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent EPF Contributions</CardTitle>
          <CardDescription>
            Your latest EPF transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array(5)
                .fill(0)
                .map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 animate-pulse"
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
                  </div>
                ))}
            </div>
          ) : contributions.length > 0 ? (
            <div className="space-y-4 max-h-96 overflow-auto pr-2">
              {[...contributions]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 10)
                .map((contribution) => (
                <div
                  key={contribution.id}
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/20">
                    <ArrowUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      EPF Contribution
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        {format(parseISO(contribution.date), "dd MMM yyyy")}
                      </span>
                      <span>Monthly</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-600 dark:text-blue-400">
                      ₹ {contribution.amount.toLocaleString("en-MY", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Deducted on 5th
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center p-6 text-gray-500">
              <p>No contribution data available yet.</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between text-sm text-gray-500 border-t pt-4">
          <div>EPF contributions are processed on the 5th of each month</div>
        </CardFooter>
      </Card>
    </div>
  );
}