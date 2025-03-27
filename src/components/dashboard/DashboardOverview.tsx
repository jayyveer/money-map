import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { format, parseISO, startOfMonth, subMonths, addMonths, isAfter, isBefore, isSameMonth } from "date-fns";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  TrendingUp, TrendingDown, DollarSign, Wallet, CreditCard, 
  PiggyBank, ArrowUpRight, ArrowDownRight, Target, Calendar, Briefcase
} from "lucide-react";

// Define interfaces for different data types
interface EPFContribution {
  id: number;
  user_id: string;
  amount: number;
  date: string;
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

interface Expense {
  id: string;
  user_id: string;
  date: string;
  time: string | null;
  place: string | null;
  amount: number;
  dr_cr: string | null;
  account: string | null;
  expense: string | null;
  income: string | null;
  category: string;
  tags: string | null;
  note: string | null;
  description: string | null;
  created_at: string;
}

interface Salary {
  id: string;
  user_id: string;
  amount: number;
  start_date: string;
  end_date: string | null;
  created_at: string;
}

// Define category colors for visualization
const CATEGORY_COLORS = {
  "EPF": "#8884d8",
  "Investments": "#82ca9d",
  "Savings": "#ffc658",
  "Expenses": "#ff8042",
  "Salary": "#0088FE"
};

export function DashboardOverview() {
  const [isLoading, setIsLoading] = useState(true);
  const [epfContributions, setEpfContributions] = useState<EPFContribution[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [monthlyChange, setMonthlyChange] = useState(0);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [monthlyExpenses, setMonthlyExpenses] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [currentSalary, setCurrentSalary] = useState(0);
  const [savingsRate, setSavingsRate] = useState(0);
  const [netWorthHistory, setNetWorthHistory] = useState<{month: string, amount: number}[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<{date: string, amount: number}[]>([]);
  const [assetDistribution, setAssetDistribution] = useState<{name: string, value: number}[]>([]);
  const [expenseDistribution, setExpenseDistribution] = useState<{name: string, value: number}[]>([]);
  const { user } = useAuthStore();

  // Fetch all financial data
  useEffect(() => {
    if (user) {
      Promise.all([
        fetchEPFContributions(),
        fetchInvestments(),
        fetchExpenses(),
        fetchSalaries()
      ]).then(() => {
        setIsLoading(false);
      });
    }
  }, [user]);

  // Calculate derived metrics when data changes
  useEffect(() => {
    if (!isLoading) {
      calculateTotalAssets();
      calculateMonthlySavings();
      calculateNetWorthHistory();
      calculateAssetDistribution();
    }
  }, [epfContributions, investments, expenses, salaries, isLoading]);

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
      // Get expenses for the last 12 months
      const startDate = subMonths(new Date(), 12);
      
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString().split("T")[0])
        .order("date", { ascending: true });

      if (error) throw error;
      setExpenses(data || []);
      
      // Calculate monthly metrics
      const currentMonth = startOfMonth(new Date());
      const currentMonthExpenses = data?.filter(expense => {
        const expenseDate = parseISO(expense.date);
        return isSameMonth(expenseDate, currentMonth) && (expense.dr_cr === "DR" || !expense.income);
      }) || [];
      
      const totalExpenses = currentMonthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      setMonthlyExpenses(totalExpenses);
      
      // Calculate expense distribution by category
      const categoryTotals: Record<string, number> = {};
      currentMonthExpenses.forEach(expense => {
        if (!categoryTotals[expense.category]) {
          categoryTotals[expense.category] = 0;
        }
        categoryTotals[expense.category] += expense.amount;
      });
      
      const distribution = Object.entries(categoryTotals).map(([name, value]) => ({
        name,
        value,
      }));
      
      setExpenseDistribution(distribution);
    } catch (error) {
      console.error("Error fetching expenses:", error);
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
      
      // Find current salary (most recent active salary)
      const currentDate = new Date();
      const activeSalary = data?.find(salary => {
        const startDate = parseISO(salary.start_date);
        const endDate = salary.end_date ? parseISO(salary.end_date) : null;
        return isAfter(currentDate, startDate) && (!endDate || isBefore(currentDate, endDate));
      });
      
      if (activeSalary) {
        setCurrentSalary(activeSalary.amount);
        setMonthlyIncome(activeSalary.amount);
      }
      
      // Create salary history for chart
      const history = data?.map(salary => ({
        date: format(parseISO(salary.start_date), "MMM yyyy"),
        amount: salary.amount
      })) || [];
      
      setSalaryHistory(history);
    } catch (error) {
      console.error("Error fetching salaries:", error);
    }
  };

  // Calculate total assets (EPF + Investments only)
  const calculateTotalAssets = () => {
    // Sum all EPF contributions
    const epfTotal = epfContributions.reduce((sum, contribution) => sum + contribution.amount, 0);
    
    // Sum all investments
    const investmentTotal = investments.reduce((sum, investment) => sum + investment.amount, 0);
    
    // Total assets is the sum of EPF and investments
    const total = epfTotal + investmentTotal;
    setTotalAssets(total);
    
    // Calculate monthly change
    const currentMonth = startOfMonth(new Date());
    
    // EPF contributions this month
    const currentMonthEPF = epfContributions
      .filter(contribution => isSameMonth(parseISO(contribution.date), currentMonth))
      .reduce((sum, contribution) => sum + contribution.amount, 0);
    
    // Investments this month
    const currentMonthInvestments = investments
      .filter(investment => isSameMonth(parseISO(investment.date), currentMonth))
      .reduce((sum, investment) => sum + investment.amount, 0);
    
    // Monthly change is the sum of this month's contributions
    const change = currentMonthEPF + currentMonthInvestments;
    setMonthlyChange(change);
  };

  // Calculate monthly savings
  const calculateMonthlySavings = () => {
    const savings = monthlyIncome - monthlyExpenses;
    setMonthlySavings(savings);
    
    // Calculate savings rate
    if (monthlyIncome > 0) {
      setSavingsRate((savings / monthlyIncome) * 100);
    }
  };

  // Calculate net worth history
  const calculateNetWorthHistory = () => {
    // Get the last 12 months
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(new Date(), 11 - i);
      return {
        date,
        month: format(date, "MMM yyyy"),
        amount: 0
      };
    });
    
    // For each month, calculate the cumulative assets up to that month
    const history = months.map(month => {
      const monthDate = month.date;
      
      // EPF contributions up to this month
      const epfTotal = epfContributions
        .filter(contribution => isBefore(parseISO(contribution.date), addMonths(monthDate, 1)))
        .reduce((sum, contribution) => sum + contribution.amount, 0);
      
      // Investments up to this month
      const investmentTotal = investments
        .filter(investment => isBefore(parseISO(investment.date), addMonths(monthDate, 1)))
        .reduce((sum, investment) => sum + investment.amount, 0);
      
      return {
        month: month.month,
        amount: epfTotal + investmentTotal
      };
    });
    
    setNetWorthHistory(history);
  };

  // Calculate asset distribution
  const calculateAssetDistribution = () => {
    // EPF total
    const epfTotal = epfContributions.reduce((sum, contribution) => sum + contribution.amount, 0);
    
    // Group investments by fund name
    const fundTotals: Record<string, number> = {};
    investments.forEach(investment => {
      if (!fundTotals[investment.name]) {
        fundTotals[investment.name] = 0;
      }
      fundTotals[investment.name] += investment.amount;
    });
    
    // Create distribution array
    const distribution = [
      { name: "EPF", value: epfTotal },
      ...Object.entries(fundTotals).map(([name, value]) => ({
        name,
        value,
      }))
    ];
    
    setAssetDistribution(distribution);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹ ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="space-y-6">
      {/* Top row - Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Assets */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-1.5">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Assets
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {isLoading ? "Loading..." : formatCurrency(totalAssets)}
                </span>
              </div>
              <span className="text-sm text-green-600 dark:text-green-400">
                +{formatCurrency(monthlyChange)} this month
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Income */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-1.5">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Monthly Income
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {isLoading ? "Loading..." : formatCurrency(monthlyIncome)}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Current month
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Expenses */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-1.5">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Monthly Expenses
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {isLoading ? "Loading..." : formatCurrency(monthlyExpenses)}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {monthlyExpenses <= monthlyIncome * 0.7 ? "Under control" : "Above target"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Savings Rate */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-1.5">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Savings Rate
              </span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold">
                  {isLoading ? "Loading..." : `${savingsRate.toFixed(1)}%`}
                </span>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {savingsRate >= 20 ? "On target" : "Below target"}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle row - Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Worth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Net Worth Growth</CardTitle>
            <CardDescription>Your asset growth over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-80">Loading...</div>
            ) : netWorthHistory.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={netWorthHistory}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorAssets" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Net Worth"]} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#8884d8"
                      fillOpacity={1}
                      fill="url(#colorAssets)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                No data available for net worth history
              </div>
            )}
          </CardContent>
        </Card>

        {/* Salary Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Salary Growth</CardTitle>
            <CardDescription>Your income progression over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-80">Loading...</div>
            ) : salaryHistory.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={salaryHistory}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Monthly Salary"]} />
                    <Bar 
                      dataKey="amount" 
                      fill="#0088FE" 
                      radius={[4, 4, 0, 0]}
                      label={{ 
                        position: 'top', 
                        formatter: (value: number) => formatCurrency(value).replace('₹ ', ''),
                        fontSize: 12
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                No data available for salary history
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Distribution</CardTitle>
            <CardDescription>Breakdown of your total assets</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-80">Loading...</div>
            ) : assetDistribution.length > 0 ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={assetDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {assetDistribution.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || "#8884d8"} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Amount"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 text-gray-500">
                No data available for asset distribution
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Health Indicators */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Health</CardTitle>
            <CardDescription>Key metrics and recommendations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Savings Rate Indicator */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Savings Rate</span>
                  <span className="text-sm font-medium">{savingsRate.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div 
                    className={`h-2.5 rounded-full ${
                      savingsRate >= 20 ? 'bg-green-600' : 
                      savingsRate >= 10 ? 'bg-yellow-400' : 'bg-red-600'
                    }`} 
                    style={{ width: `${Math.min(savingsRate, 50) * 2}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {savingsRate >= 20 
                    ? "Great! You're saving more than 20% of your income."
                    : savingsRate >= 10
                    ? "You're on the right track, but try to save at least 20% of your income."
                    : "Your savings rate is low. Try to reduce expenses or increase income."
                  }
                </p>
              </div>

              {/* Expense to Income Ratio */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Expense to Income Ratio</span>
                  <span className="text-sm font-medium">
                    {monthlyIncome > 0 ? ((monthlyExpenses / monthlyIncome) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                  <div 
                    className={`h-2.5 rounded-full ${
                      monthlyExpenses <= monthlyIncome * 0.6 ? 'bg-green-600' : 
                      monthlyExpenses <= monthlyIncome * 0.8 ? 'bg-yellow-400' : 'bg-red-600'
                    }`} 
                    style={{ width: `${Math.min((monthlyExpenses / monthlyIncome) * 100, 100)}%` }}
                  ></div>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {monthlyExpenses <= monthlyIncome * 0.6 
                    ? "Excellent! Your expenses are well below your income."
                    : monthlyExpenses <= monthlyIncome * 0.8
                    ? "Your expense ratio is reasonable, but there's room for improvement."
                    : "Your expenses are too high relative to your income. Consider budgeting."
                  }
                </p>
              </div>

              {/* Salary Growth */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium">Salary Growth</span>
                  <span className="text-sm font-medium">
                    {salaryHistory.length > 1 
                      ? `${(((salaryHistory[salaryHistory.length-1].amount / salaryHistory[0].amount) - 1) * 100).toFixed(0)}%`
                      : "N/A"}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {salaryHistory.length > 1 
                    ? `Your salary has grown from ${formatCurrency(salaryHistory[0].amount)} to ${formatCurrency(salaryHistory[salaryHistory.length-1].amount)}`
                    : "Not enough salary history to calculate growth"}
                </p>
              </div>

              {/* Recommendations */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">Recommendations</h4>
                <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
                  {savingsRate < 20 && (
                    <li>• Increase your savings rate to at least 20% of your income</li>
                  )}
                  {monthlyExpenses > monthlyIncome * 0.7 && (
                    <li>• Reduce your monthly expenses to improve financial health</li>
                  )}
                  {investments.length < 3 && (
                    <li>• Diversify your investments across different asset classes</li>
                  )}
                  <li>• Review your expense categories to identify areas for saving</li>
                  <li>• Set up an emergency fund if you haven't already</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 