import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
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
import { format, parse, isAfter, startOfMonth, getDate, subMonths, parseISO } from "date-fns";
import { Loader } from "@/components/ui/loader";
import { BadgePlus, TrendingUp, Wallet, Calendar } from "lucide-react";

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
  const { user } = useAuthStore();
  
  // Add a ref to track if we've already checked for automatic contributions
  const hasCheckedThisMonth = useRef(false);

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

  // Function to check and add automatic contribution if needed
  const addAutomaticContribution = async () => {
    if (!user) return;

    // If we've already checked for this month in this session, don't check again
    if (hasCheckedThisMonth.current) return;
    
    const today = new Date();
    const currentMonth = startOfMonth(today);
    const isAfterFifth = getDate(today) >= 5;

    // Check if we should add an automatic contribution (on or after the 5th)
    if (!isAfterFifth) return;

    // Mark that we've checked for this month
    hasCheckedThisMonth.current = true;

    // Check if there's already a contribution for this month
    const hasContributionThisMonth = contributions.some((contribution) => {
      const contributionDate = new Date(contribution.date);
      return (
        contributionDate.getMonth() === currentMonth.getMonth() &&
        contributionDate.getFullYear() === currentMonth.getFullYear()
      );
    });

    if (!hasContributionThisMonth) {
      try {
        const newContribution = {
          user_id: user.id,
          amount: 3600,
          date: currentMonth.toISOString().split("T")[0], // Format as YYYY-MM-DD
        };

        const { error } = await supabase
          .from("epf_contributions")
          .insert([newContribution]);

        if (error) throw error;

        // Refresh contributions after adding
        await fetchContributions();
      } catch (error) {
        console.error("Error adding automatic contribution:", error);
      }
    }
  };

  useEffect(() => {
    fetchContributions();
    // Reset the check flag when the user changes
    hasCheckedThisMonth.current = false;
  }, [user]);

  useEffect(() => {
    if (contributions.length > 0) {
      addAutomaticContribution();
    }
  }, [contributions, user]);

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
            <div className="text-3xl font-bold text-emerald-700 dark:text-emerald-400">
              {isLoading ? (
                <Loader />
              ) : contributions.length > 0 ? (
                `₹ 3,600.00`
              ) : (
                `₹ 0.00`
              )}
            </div>
          </CardContent>
        </Card>

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
    </div>
  );
}
