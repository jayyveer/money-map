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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  addMonths,
  getYear,
  getMonth,
  isSameMonth,
  isSameYear,
  differenceInMonths,
} from "date-fns";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Loader } from "@/components/ui/loader";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
} from "lucide-react";

// Define interfaces based on your database schema
interface EPFContribution {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  notes?: string;
}

interface Investment {
  id: string;
  user_id: string;
  type: "SIP" | "MANUAL";
  name: string;
  amount: number;
  date: string;
  sip_investment_id?: string;
  notes?: string;
}

interface Expense {
  id: string;
  user_id: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
  time?: string;
  place?: string;
  dr_cr?: string;
  account?: string;
  expense?: string;
  income?: string;
  tags?: string;
  note?: string;
}

interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_type: string;
  balance: number;
  last_updated: string;
}

interface Salary {
  id: string;
  user_id: string;
  amount: number;
  start_date: string;
  end_date?: string;
}

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  investments: number;
  epf: number;
}

interface YearlyData {
  year: string;
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
  investments: number;
  epf: number;
}

export function ReportsSection() {
  const [activeTab, setActiveTab] = useState("monthly");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [comparisonYear, setComparisonYear] = useState((new Date().getFullYear() - 1).toString());
  const [dateRange, setDateRange] = useState("12months");

  const [epfContributions, setEpfContributions] = useState<EPFContribution[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);

  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [savingsRate, setSavingsRate] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuthStore();

  // Fetch all financial data
  useEffect(() => {
    if (user) {
      setIsLoading(true);
      Promise.all([
        fetchEPFContributions(),
        fetchInvestments(),
        fetchExpenses(),
        fetchBankAccounts(),
        fetchSalaries(),
      ]).then(() => {
        setIsLoading(false);
      });
    }
  }, [user]);

  // Calculate derived metrics when data changes
  useEffect(() => {
    if (!isLoading) {
      calculateMonthlyData();
      calculateYearlyData();
      calculateSavingsRate();
    }
  }, [epfContributions, investments, expenses, salaries, isLoading, dateRange]);

  // Function to fetch EPF contributions
  const fetchEPFContributions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("epf_contributions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (error) throw error;
      setEpfContributions(data || []);
    } catch (error) {
      console.error("Error fetching EPF contributions:", error);
    }
  };

  // Function to fetch investments
  const fetchInvestments = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (error) throw error;
      setInvestments(data || []);
    } catch (error) {
      console.error("Error fetching investments:", error);
    }
  };

  // Function to fetch expenses
  const fetchExpenses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: true });

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    }
  };

  // Function to fetch bank accounts
  const fetchBankAccounts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  };

  // Function to fetch salaries
  const fetchSalaries = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("salaries")
        .select("*")
        .eq("user_id", user.id)
        .order("start_date", { ascending: true });

      if (error) throw error;
      setSalaries(data || []);
    } catch (error) {
      console.error("Error fetching salaries:", error);
    }
  };

  // Calculate monthly data for reports
  const calculateMonthlyData = () => {
    // Determine date range
    const today = new Date();
    let startDate: Date;

    switch (dateRange) {
      case "3months":
        startDate = subMonths(today, 3);
        break;
      case "6months":
        startDate = subMonths(today, 6);
        break;
      case "ytd":
        startDate = new Date(today.getFullYear(), 0, 1); // Jan 1 of current year
        break;
      case "1year":
        startDate = subMonths(today, 12);
        break;
      case "2years":
        startDate = subMonths(today, 24);
        break;
      default:
        startDate = subMonths(today, 12);
    }

    // Generate months array
    const months: Date[] = [];
    let currentDate = startDate;

    while (currentDate <= today) {
      months.push(startOfMonth(currentDate));
      currentDate = addMonths(currentDate, 1);
    }

    // Calculate data for each month
    const data = months.map(month => {
      // Get salary for the month
      const monthlySalary = getSalaryForMonth(month);

      // Get expenses for the month (only debit transactions or those without income)
      const monthlyExpenses = expenses.filter(expense => {
        const expenseDate = parseISO(expense.date);
        return isSameMonth(expenseDate, month) &&
               isSameYear(expenseDate, month) &&
               (expense.dr_cr === "DR" || (!expense.income && !expense.dr_cr));
      }).reduce((sum, expense) => sum + expense.amount, 0);

      // Get investments for the month
      const monthlyInvestments = investments.filter(investment => {
        const investmentDate = parseISO(investment.date);
        return isSameMonth(investmentDate, month) && isSameYear(investmentDate, month);
      }).reduce((sum, investment) => sum + investment.amount, 0);

      // Get EPF contributions for the month
      const monthlyEPF = epfContributions.filter(contribution => {
        const contributionDate = parseISO(contribution.date);
        return isSameMonth(contributionDate, month) && isSameYear(contributionDate, month);
      }).reduce((sum, contribution) => sum + contribution.amount, 0);

      // Calculate savings
      const savings = monthlySalary - monthlyExpenses;

      // Calculate savings rate
      const savingsRate = monthlySalary > 0 ? (savings / monthlySalary) * 100 : 0;

      return {
        month: format(month, "MMM yyyy"),
        income: monthlySalary,
        expenses: monthlyExpenses,
        savings: savings,
        savingsRate: savingsRate,
        investments: monthlyInvestments,
        epf: monthlyEPF
      };
    });

    setMonthlyData(data);
  };

  // Calculate yearly data for reports
  const calculateYearlyData = () => {
    // Get unique years from data
    const years = new Set<number>();

    // Add years from expenses
    expenses.forEach(expense => {
      const year = getYear(parseISO(expense.date));
      years.add(year);
    });

    // Add years from investments
    investments.forEach(investment => {
      const year = getYear(parseISO(investment.date));
      years.add(year);
    });

    // Add years from EPF contributions
    epfContributions.forEach(contribution => {
      const year = getYear(parseISO(contribution.date));
      years.add(year);
    });

    // Sort years
    const sortedYears = Array.from(years).sort();

    // Calculate data for each year
    const data = sortedYears.map(year => {
      // Get total salary for the year
      const yearSalary = getTotalSalaryForYear(year);

      // Get expenses for the year (only debit transactions or those without income)
      const yearExpenses = expenses.filter(expense => {
        return getYear(parseISO(expense.date)) === year &&
               (expense.dr_cr === "DR" || (!expense.income && !expense.dr_cr));
      }).reduce((sum, expense) => sum + expense.amount, 0);

      // Get investments for the year
      const yearInvestments = investments.filter(investment => {
        return getYear(parseISO(investment.date)) === year;
      }).reduce((sum, investment) => sum + investment.amount, 0);

      // Get EPF contributions for the year
      const yearEPF = epfContributions.filter(contribution => {
        return getYear(parseISO(contribution.date)) === year;
      }).reduce((sum, contribution) => sum + contribution.amount, 0);

      // Calculate savings
      const savings = yearSalary - yearExpenses;

      // Calculate savings rate
      const savingsRate = yearSalary > 0 ? (savings / yearSalary) * 100 : 0;

      return {
        year: year.toString(),
        income: yearSalary,
        expenses: yearExpenses,
        savings: savings,
        savingsRate: savingsRate,
        investments: yearInvestments,
        epf: yearEPF
      };
    });

    setYearlyData(data);
  };

  // Calculate current savings rate
  const calculateSavingsRate = () => {
    const today = new Date();
    const currentMonth = startOfMonth(today);

    // Get salary for current month
    const monthlySalary = getSalaryForMonth(currentMonth);

    // Get expenses for current month (only debit transactions or those without income)
    const monthlyExpenses = expenses.filter(expense => {
      const expenseDate = parseISO(expense.date);
      return isSameMonth(expenseDate, currentMonth) &&
             (expense.dr_cr === "DR" || (!expense.income && !expense.dr_cr));
    }).reduce((sum, expense) => sum + expense.amount, 0);

    // Calculate savings
    const savings = monthlySalary - monthlyExpenses;

    // Calculate savings rate
    const rate = monthlySalary > 0 ? (savings / monthlySalary) * 100 : 0;

    setSavingsRate(rate);
  };

  // Helper function to get salary for a specific month
  const getSalaryForMonth = (month: Date): number => {
    // Find the active salary for this month
    const activeSalary = salaries.find(salary => {
      const startDate = parseISO(salary.start_date);
      const endDate = salary.end_date ? parseISO(salary.end_date) : new Date();

      return (
        (isSameMonth(startDate, month) && isSameYear(startDate, month)) ||
        (differenceInMonths(month, startDate) > 0 && differenceInMonths(endDate, month) >= 0)
      );
    });

    return activeSalary ? activeSalary.amount : 0;
  };

  // Helper function to get total salary for a year
  const getTotalSalaryForYear = (year: number): number => {
    // For simplicity, we'll assume 12 months of salary
    // In a real app, you'd need to account for salary changes during the year
    const relevantSalaries = salaries.filter(salary => {
      const startYear = getYear(parseISO(salary.start_date));
      const endYear = salary.end_date ? getYear(parseISO(salary.end_date)) : new Date().getFullYear();

      return startYear <= year && endYear >= year;
    });

    if (relevantSalaries.length === 0) return 0;

    // Calculate weighted average based on months active in the year
    let totalSalary = 0;

    relevantSalaries.forEach(salary => {
      const startDate = parseISO(salary.start_date);
      const endDate = salary.end_date ? parseISO(salary.end_date) : new Date();

      const startYear = getYear(startDate);
      const startMonth = startYear === year ? getMonth(startDate) : 0;

      const endYear = getYear(endDate);
      const endMonth = endYear === year ? getMonth(endDate) : 11;

      const monthsActive = endMonth - startMonth + 1;

      totalSalary += salary.amount * monthsActive;
    });

    return totalSalary;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹ ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Handle previous month
  const handlePreviousMonth = () => {
    setSelectedMonth(prevMonth => subMonths(prevMonth, 1));
  };

  // Handle next month
  const handleNextMonth = () => {
    const nextMonth = addMonths(selectedMonth, 1);
    if (nextMonth <= new Date()) {
      setSelectedMonth(nextMonth);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Financial Reports</h2>
        <div className="flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select date range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Last 3 Months</SelectItem>
              <SelectItem value="6months">Last 6 Months</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
              <SelectItem value="1year">Last 12 Months</SelectItem>
              <SelectItem value="2years">Last 2 Years</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tabs for different report views */}
      <Tabs defaultValue="monthly" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monthly">Monthly Analysis</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Comparison</TabsTrigger>
          <TabsTrigger value="savings">Savings Analysis</TabsTrigger>
        </TabsList>

        {/* Monthly Analysis Tab */}
        <TabsContent value="monthly" className="space-y-6">
          {/* Monthly Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Income vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatCurrency(Number(value))]} />
                        <Legend />
                        <Bar dataKey="income" name="Income" fill="#4ade80" />
                        <Bar dataKey="expenses" name="Expenses" fill="#f87171" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Savings Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis unit="%" domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, "Savings Rate"]} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="savingsRate"
                          name="Savings Rate"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Investments & EPF
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={monthlyData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatCurrency(Number(value))]} />
                        <Legend />
                        <Bar dataKey="investments" name="Investments" fill="#a78bfa" />
                        <Bar dataKey="epf" name="EPF" fill="#60a5fa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Detailed Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Financial Summary</CardTitle>
              <CardDescription>
                Detailed breakdown of your monthly finances
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Month</th>
                        <th className="text-right py-3 px-4">Income</th>
                        <th className="text-right py-3 px-4">Expenses</th>
                        <th className="text-right py-3 px-4">Savings</th>
                        <th className="text-right py-3 px-4">Savings Rate</th>
                        <th className="text-right py-3 px-4">Investments</th>
                        <th className="text-right py-3 px-4">EPF</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((month, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="py-3 px-4">{month.month}</td>
                          <td className="text-right py-3 px-4">{formatCurrency(month.income)}</td>
                          <td className="text-right py-3 px-4">{formatCurrency(month.expenses)}</td>
                          <td className="text-right py-3 px-4">{formatCurrency(month.savings)}</td>
                          <td className="text-right py-3 px-4">{month.savingsRate.toFixed(1)}%</td>
                          <td className="text-right py-3 px-4">{formatCurrency(month.investments)}</td>
                          <td className="text-right py-3 px-4">{formatCurrency(month.epf)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Yearly Comparison Tab */}
        <TabsContent value="yearly" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Yearly Income vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={yearlyData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatCurrency(Number(value))]} />
                        <Legend />
                        <Bar dataKey="income" name="Income" fill="#4ade80" />
                        <Bar dataKey="expenses" name="Expenses" fill="#f87171" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Yearly Investments & EPF
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader />
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={yearlyData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip formatter={(value) => [formatCurrency(Number(value))]} />
                        <Legend />
                        <Bar dataKey="investments" name="Investments" fill="#a78bfa" />
                        <Bar dataKey="epf" name="EPF" fill="#60a5fa" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Year-over-Year Comparison */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Year-over-Year Comparison</CardTitle>
                  <CardDescription>
                    Compare financial metrics between years
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Current Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearlyData.map(year => (
                        <SelectItem key={year.year} value={year.year}>
                          {year.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>vs</span>
                  <Select value={comparisonYear} onValueChange={setComparisonYear}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Previous Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearlyData.map(year => (
                        <SelectItem key={year.year} value={year.year}>
                          {year.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader />
              ) : (
                <div className="space-y-6">
                  {selectedYear && comparisonYear ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Income Comparison */}
                        <div className="border rounded-lg p-4">
                          <h3 className="text-lg font-medium mb-2">Income</h3>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-500">Year {selectedYear}</p>
                              <p className="text-xl font-bold">
                                {formatCurrency(yearlyData.find(y => y.year === selectedYear)?.income || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Year {comparisonYear}</p>
                              <p className="text-xl font-bold">
                                {formatCurrency(yearlyData.find(y => y.year === comparisonYear)?.income || 0)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Expenses Comparison */}
                        <div className="border rounded-lg p-4">
                          <h3 className="text-lg font-medium mb-2">Expenses</h3>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-500">Year {selectedYear}</p>
                              <p className="text-xl font-bold">
                                {formatCurrency(yearlyData.find(y => y.year === selectedYear)?.expenses || 0)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Year {comparisonYear}</p>
                              <p className="text-xl font-bold">
                                {formatCurrency(yearlyData.find(y => y.year === comparisonYear)?.expenses || 0)}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Savings Rate Comparison */}
                        <div className="border rounded-lg p-4">
                          <h3 className="text-lg font-medium mb-2">Savings Rate</h3>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm text-gray-500">Year {selectedYear}</p>
                              <p className="text-xl font-bold">
                                {(yearlyData.find(y => y.year === selectedYear)?.savingsRate || 0).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-500">Year {comparisonYear}</p>
                              <p className="text-xl font-bold">
                                {(yearlyData.find(y => y.year === comparisonYear)?.savingsRate || 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-6 text-gray-500">
                      Select years to compare
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Savings Analysis Tab */}
        <TabsContent value="savings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Savings Rate Trend</CardTitle>
                <CardDescription>
                  Your savings rate over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Loader />
                ) : (
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={monthlyData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis unit="%" domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, "Savings Rate"]} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="savingsRate"
                          name="Savings Rate"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                        />
                        {/* Add a reference line at 20% - minimum recommended savings rate */}
                        <ReferenceLine y={20} stroke="red" strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Savings Rate</CardTitle>
                <CardDescription>
                  This month's savings performance
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center">
                {isLoading ? (
                  <Loader />
                ) : (
                  <>
                    <div className="relative w-40 h-40">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="10"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke={savingsRate >= 20 ? "#4ade80" : "#f87171"}
                          strokeWidth="10"
                          strokeDasharray={`${Math.min(savingsRate, 100) * 2.83} 283`}
                          strokeDashoffset="0"
                          transform="rotate(-90 50 50)"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold">{savingsRate.toFixed(1)}%</span>
                        <span className="text-sm text-gray-500">Savings Rate</span>
                      </div>
                    </div>
                    <div className="mt-6 text-center">
                      <p className="text-sm text-gray-500">
                        {savingsRate >= 20
                          ? "Great job! You're saving more than the recommended 20%."
                          : "Try to save at least 20% of your income."}
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Savings Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Savings Breakdown</CardTitle>
              <CardDescription>
                Where your savings are going
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Loader />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">Current Month</h3>
                    {monthlyData.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span>Income</span>
                          <span className="font-medium">{formatCurrency(monthlyData[monthlyData.length - 1].income)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Expenses</span>
                          <span className="font-medium">{formatCurrency(monthlyData[monthlyData.length - 1].expenses)}</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between items-center">
                          <span className="font-medium">Net Savings</span>
                          <span className="font-medium">{formatCurrency(monthlyData[monthlyData.length - 1].savings)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Investments</span>
                          <span className="font-medium">{formatCurrency(monthlyData[monthlyData.length - 1].investments)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>EPF</span>
                          <span className="font-medium">{formatCurrency(monthlyData[monthlyData.length - 1].epf)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4">Savings Tips</h3>
                    <ul className="space-y-2 list-disc pl-5">
                      <li>Aim to save at least 20% of your income</li>
                      <li>Increase your EPF contributions for tax benefits</li>
                      <li>Set up automatic transfers to investment accounts</li>
                      <li>Review and cut unnecessary expenses</li>
                      <li>Build an emergency fund of 3-6 months of expenses</li>
                    </ul>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
