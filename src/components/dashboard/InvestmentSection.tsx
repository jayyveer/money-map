import { useEffect, useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import {
  format,
  parseISO,
  isAfter,
  isBefore,
  startOfMonth,
  getDate,
  addMonths,
  isSameMonth,
  getMonth,
  getYear,
} from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Edit, Plus, Check, X, ArrowUp, Ban } from "lucide-react";
import { Loader } from "@/components/ui/loader";

// Define interfaces based on your database schema
interface SIPInvestment {
  id: string;
  user_id: string;
  fund_name: string;
  amount: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

interface Investment {
  id: string;
  user_id: string;
  sip_investment_id: string | null;
  type: "SIP" | "MANUAL";
  name: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Define fund colors for consistent visualization
const FUND_COLORS = {
  "Tata Small Cap Fund Direct Growth": "#FF8042",
  "SBI Magnum Mid Cap Direct Plan": "#0088FE",
  "Nippon India Large Cap Fund Direct Growth": "#00C49F",
};

export function InvestmentSection() {
  const [sipInvestments, setSipInvestments] = useState<SIPInvestment[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingSip, setEditingSip] = useState<string | null>(null);
  const [newAmount, setNewAmount] = useState<number>(0);
  const [totalInvested, setTotalInvested] = useState(0);
  const [monthlyInvestment, setMonthlyInvestment] = useState(0);
  const [fundDistribution, setFundDistribution] = useState<
    { name: string; value: number }[]
  >([]);
  const [isSkipMonthDialogOpen, setIsSkipMonthDialogOpen] = useState(false);
  const { user } = useAuthStore();

  // Use ref to track initial mount
  const isInitialMount = useRef(true);

  // Function to fetch SIP investments
  const fetchSipInvestments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("sip_investments")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: false }); // Order by start_date descending to get latest first

      if (error) throw error;

      console.log("Raw SIP data:", data);

      // Group SIPs by fund_name and take only the latest one for each fund
      const latestSipsByFund: Record<string, SIPInvestment> = {};

      data?.forEach(sip => {
        // If we haven't seen this fund yet, or if this SIP is newer than what we have
        if (!latestSipsByFund[sip.fund_name] ||
            new Date(sip.start_date) > new Date(latestSipsByFund[sip.fund_name].start_date)) {
          latestSipsByFund[sip.fund_name] = sip;
        }
      });

      // Get the array of latest SIPs
      const latestSips = Object.values(latestSipsByFund);
      console.log("Latest SIPs by fund:", latestSips);

      // Set the SIP investments state to all SIPs for display purposes
      setSipInvestments(data || []);

      // Calculate monthly investment amount from latest SIPs only
      const totalMonthlyAmount = latestSips.reduce((sum, sip) => sum + sip.amount, 0);
      console.log("Total monthly SIP amount (latest only):", totalMonthlyAmount);

      setMonthlyInvestment(totalMonthlyAmount);
    } catch (error) {
      console.error("Error fetching SIP investments:", error);
    }
  };

  // Function to fetch investments
  const fetchInvestments = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (error) throw error;
      setInvestments(data || []);

      // Calculate total invested
      const total = (data || []).reduce(
        (sum, investment) => sum + investment.amount,
        0
      );
      setTotalInvested(total);

      // Calculate fund distribution
      const fundTotals: Record<string, number> = {};
      data?.forEach((investment) => {
        if (!fundTotals[investment.name]) {
          fundTotals[investment.name] = 0;
        }
        fundTotals[investment.name] += investment.amount;
      });

      const distribution = Object.entries(fundTotals).map(([name, value]) => ({
        name,
        value,
      }));

      setFundDistribution(distribution);
    } catch (error) {
      console.error("Error fetching investments:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to get active SIPs
  const getActiveSIPs = () => {
    return sipInvestments.filter(
      (sip) => !sip.end_date || isAfter(parseISO(sip.end_date), new Date())
    );
  };

  // Function to skip current month's investment
  const skipCurrentMonthInvestment = async () => {
    if (!user) return;

    try {
      setIsLoading(true);

      // Get current month and year
      const today = new Date();
      const currentMonth = getMonth(today);
      const currentYear = getYear(today);

      // Create a date for the 25th of current month
      const skipDate = new Date(currentYear, currentMonth, 25);
      const formattedDate = skipDate.toISOString().split('T')[0];

      // Get active SIPs
      const activeSIPs = getActiveSIPs();

      // Check if we already have entries for this month
      const hasCurrentMonthEntries = activeSIPs.some(sip => {
        return investments.some(inv =>
          inv.sip_investment_id === sip.id &&
          getMonth(parseISO(inv.date)) === currentMonth &&
          getYear(parseISO(inv.date)) === currentYear
        );
      });

      if (hasCurrentMonthEntries) {
        console.log("Already have entries for this month");
        setIsSkipMonthDialogOpen(false);
        return;
      }

      // Create zero-amount entries for all active SIPs
      const skippedEntries = activeSIPs.map(sip => ({
        user_id: user.id,
        sip_investment_id: sip.id,
        type: "SIP" as const,
        name: sip.fund_name,
        amount: 0, // Zero amount for skipped month
        date: formattedDate,
        notes: "Skipped month investment"
      }));

      if (skippedEntries.length > 0) {
        const { error } = await supabase
          .from("investments")
          .insert(skippedEntries);

        if (error) throw error;

        // Refresh investments
        await fetchInvestments();
      }

      setIsSkipMonthDialogOpen(false);

    } catch (error) {
      console.error("Error skipping month investment:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Function to update SIP amount
  const updateSipAmount = async (sipId: string) => {
    if (!user || !newAmount) return;

    try {
      const today = new Date();

      // End the current SIP
      const { error: updateError } = await supabase
        .from("sip_investments")
        .update({ end_date: today.toISOString().split("T")[0] })
        .eq("id", sipId);

      if (updateError) throw updateError;

      // Get the SIP details
      const sip = sipInvestments.find((s) => s.id === sipId);
      if (!sip) return;

      // Create a new SIP with updated amount
      const newSip = {
        user_id: user.id,
        fund_name: sip.fund_name,
        amount: newAmount,
        start_date: addMonths(today, 1).toISOString().split("T")[0], // Start from next month
        end_date: null,
      };

      const { error: insertError } = await supabase
        .from("sip_investments")
        .insert([newSip]);

      if (insertError) throw insertError;

      // Reset state and refresh data
      setEditingSip(null);
      setNewAmount(0);
      await fetchSipInvestments();
    } catch (error) {
      console.error("Error updating SIP amount:", error);
    }
  };

  // Initial data loading
  useEffect(() => {
    if (user) {
      const loadData = async () => {
        await fetchSipInvestments();
        await fetchInvestments();
        isInitialMount.current = false;
      };

      loadData();
    }
  }, [user]);

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹ ${amount.toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Get fund color
  const getFundColor = (fundName: string) => {
    return FUND_COLORS[fundName as keyof typeof FUND_COLORS] || "#AAAAAA";
  };

  // Group investments by month for chart
  const getMonthlyInvestmentData = () => {
    const monthlyData: Record<string, number> = {};

    investments.forEach((investment) => {
      const monthYear = format(parseISO(investment.date), "MMM yyyy");
      if (!monthlyData[monthYear]) {
        monthlyData[monthYear] = 0;
      }
      monthlyData[monthYear] += investment.amount;
    });

    return Object.entries(monthlyData)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateA.getTime() - dateB.getTime();
      });
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Invested
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "Loading..." : formatCurrency(totalInvested)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Monthly SIP
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "Loading..." : formatCurrency(monthlyInvestment)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Total Investments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "Loading..." : investments.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - SIP Management */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div>
                  <CardTitle>SIP Investments</CardTitle>
                  <CardDescription>
                    Your active systematic investment plans
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSkipMonthDialogOpen(true)}
                  className="flex items-center gap-1"
                >
                  <Ban className="h-4 w-4" />
                  Skip This Month
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                      </div>
                    ))}
                </div>
              ) : sipInvestments.length > 0 ? (
                <div className="space-y-4">
                  {sipInvestments
                    .filter(
                      (sip) =>
                        !sip.end_date ||
                        isAfter(parseISO(sip.end_date), new Date())
                    )
                    .map((sip) => (
                      <div key={sip.id} className="border rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{sip.fund_name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Started:{" "}
                              {format(parseISO(sip.start_date), "dd MMM yyyy")}
                            </p>
                          </div>
                          {editingSip === sip.id ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => updateSipAmount(sip.id)}
                                className="p-1 text-green-600 hover:text-green-800"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSip(null);
                                  setNewAmount(0);
                                }}
                                className="p-1 text-red-600 hover:text-red-800"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingSip(sip.id);
                                setNewAmount(sip.amount);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {editingSip === sip.id ? (
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              New Amount
                            </label>
                            <input
                              type="number"
                              value={newAmount}
                              onChange={(e) =>
                                setNewAmount(Number(e.target.value))
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600"
                            />
                          </div>
                        ) : (
                          <div className="mt-2">
                            <p className="text-xl font-bold">
                              {formatCurrency(sip.amount)}
                            </p>
                            <div className="flex flex-col space-y-1">
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Monthly investment
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Deducted on 25th of each month
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  No active SIP investments found
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fund Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Fund Distribution</CardTitle>
              <CardDescription>
                Allocation across different funds
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader />
                </div>
              ) : fundDistribution.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fundDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) =>
                          `${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {fundDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getFundColor(entry.name)}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(Number(value)),
                          "Amount",
                        ]}
                      />
                      <Legend layout="vertical" align="right" verticalAlign="middle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No investment data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right columns - Investment History and Chart */}
        <div className="md:col-span-2 space-y-6">
          {/* Investment Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Investment</CardTitle>
              <CardDescription>
                Your investment pattern over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-80">
                  Loading...
                </div>
              ) : investments.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={getMonthlyInvestmentData()}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(Number(value)),
                          "Amount",
                        ]}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#3b82f6"
                        activeDot={{ r: 8 }}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-80 text-gray-500">
                  No investment data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Investments */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Investments</CardTitle>
              <CardDescription>
                Your latest investment transactions
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
              ) : investments.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-auto pr-2">
                  {investments.slice(0, 10).map((investment) => (
                    <div
                      key={investment.id}
                      className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/20">
                        <ArrowUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {investment.name}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>
                            {format(parseISO(investment.date), "dd MMM yyyy")}
                          </span>
                          <span>{investment.type}</span>
                          {investment.notes && <span>{investment.notes}</span>}
                        </div>
                      </div>
                      <p className="font-medium whitespace-nowrap text-blue-600 dark:text-blue-400">
                        {formatCurrency(investment.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No investment transactions found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Skip Month Dialog */}
      <Dialog open={isSkipMonthDialogOpen} onOpenChange={setIsSkipMonthDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Skip This Month's Investment</DialogTitle>
            <DialogDescription>
              This will create zero-amount entries for all your active SIPs for the current month.
              Are you sure you want to skip this month's investment?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setIsSkipMonthDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={skipCurrentMonthInvestment}
              className="flex items-center gap-1"
            >
              <Ban className="h-4 w-4" />
              Skip This Month
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
