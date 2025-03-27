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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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

interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_type: string;
  balance: number;
  last_updated: string;
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
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [totalBankBalance, setTotalBankBalance] = useState(0);
  const [totalSalaryEarned, setTotalSalaryEarned] = useState(0);
  const [totalExpensesPaid, setTotalExpensesPaid] = useState(0);
  const [salaryAllocation, setSalaryAllocation] = useState<{category: string, percentage: number, amount: number}[]>([]);
  const [isAddBankDialogOpen, setIsAddBankDialogOpen] = useState(false);
  const [newBankDetails, setNewBankDetails] = useState({
    bank_name: "",
    account_type: "",
    balance: 0
  });
  const { user } = useAuthStore();

  // Fetch all financial data
  useEffect(() => {
    if (user) {
      Promise.all([
        fetchEPFContributions(),
        fetchInvestments(),
        fetchExpenses(),
        fetchSalaries(),
        fetchBankAccounts()
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
      calculateTotalLifetimeMetrics();
      analyzeMonthlyExpenses();
    }
  }, [epfContributions, investments, expenses, salaries, bankAccounts, isLoading]);

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
      
      // Calculate total bank balance
      const totalBalance = (data || []).reduce((sum, account) => sum + account.balance, 0);
      setTotalBankBalance(totalBalance);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    }
  };

  // Function to add a new bank account
  const addBankAccount = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .insert([
          {
            user_id: user.id,
            bank_name: newBankDetails.bank_name,
            account_type: newBankDetails.account_type,
            balance: newBankDetails.balance,
            last_updated: new Date().toISOString()
          }
        ]);
        
      if (error) throw error;
      
      // Refresh bank accounts
      fetchBankAccounts();
      
      // Reset form and close dialog
      setNewBankDetails({
        bank_name: "",
        account_type: "",
        balance: 0
      });
      setIsAddBankDialogOpen(false);
    } catch (error) {
      console.error("Error adding bank account:", error);
    }
  };

  // Calculate total assets including bank balance
  const calculateTotalAssets = () => {
    // Sum all EPF contributions
    const epfTotal = epfContributions.reduce((sum, contribution) => sum + contribution.amount, 0);
    
    // Sum all investments
    const investmentTotal = investments.reduce((sum, investment) => sum + investment.amount, 0);
    
    // Total assets now includes bank balance
    const total = epfTotal + investmentTotal + totalBankBalance;
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

  // Calculate total lifetime metrics
  const calculateTotalLifetimeMetrics = () => {
    // Calculate total salary earned
    let totalSalary = 0;
    
    if (salaries.length > 0) {
      const sortedSalaries = [...salaries].sort((a, b) => 
        new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );
      
      for (let i = 0; i < sortedSalaries.length; i++) {
        const salary = sortedSalaries[i];
        const startDate = parseISO(salary.start_date);
        const endDate = salary.end_date ? parseISO(salary.end_date) : new Date();
        const nextStartDate = i < sortedSalaries.length - 1 ? parseISO(sortedSalaries[i + 1].start_date) : null;
        
        // Calculate months between start and end/next start dates
        const endDateToUse = nextStartDate && isBefore(nextStartDate, endDate) ? nextStartDate : endDate;
        const monthDiff = (endDateToUse.getFullYear() - startDate.getFullYear()) * 12 + 
                          endDateToUse.getMonth() - startDate.getMonth();
        
        totalSalary += salary.amount * Math.max(1, monthDiff);
      }
    }
    
    setTotalSalaryEarned(totalSalary);
    
    // Calculate total expenses paid
    const totalExpenses = expenses.reduce((sum, expense) => 
      sum + (expense.dr_cr === "DR" || !expense.income ? expense.amount : 0), 0);
    
    setTotalExpensesPaid(totalExpenses);
  };
  
  // Analyze monthly expenses by category
  const analyzeMonthlyExpenses = () => {
    if (currentSalary <= 0) return;
    
    const currentMonth = startOfMonth(new Date());
    const currentMonthExpenses = expenses.filter(expense => {
      const expenseDate = parseISO(expense.date);
      return isSameMonth(expenseDate, currentMonth) && (expense.dr_cr === "DR" || !expense.income);
    });
    
    // Group expenses by category
    const categoryTotals: Record<string, number> = {};
    currentMonthExpenses.forEach(expense => {
      if (!categoryTotals[expense.category]) {
        categoryTotals[expense.category] = 0;
      }
      categoryTotals[expense.category] += expense.amount;
    });
    
    // Calculate savings category
    const expensesTotal = Object.values(categoryTotals).reduce((sum, amount) => sum + amount, 0);
    const savingsAmount = Math.max(0, currentSalary - expensesTotal);
    
    // Prepare allocation data with percentages
    const allocation = [
      ...Object.entries(categoryTotals).map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / currentSalary) * 100
      })),
      {
        category: "Savings",
        amount: savingsAmount,
        percentage: (savingsAmount / currentSalary) * 100
      }
    ].sort((a, b) => b.amount - a.amount);
    
    setSalaryAllocation(allocation);
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
    
    // Create distribution array including bank accounts
    const distribution = [
      { name: "EPF", value: epfTotal },
      ...Object.entries(fundTotals).map(([name, value]) => ({
        name,
        value,
      })),
      // Add bank accounts to asset distribution
      ...bankAccounts.map(account => ({
        name: `${account.bank_name} (${account.account_type})`,
        value: account.balance
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
        {/* Total Assets - Enhanced with bank balance */}
        <Card className="sm:col-span-2 lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Total Assets</CardTitle>
            <CardDescription>Complete breakdown of your wealth</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">
                  {isLoading ? "Loading..." : formatCurrency(totalAssets)}
                </span>
                <span className="text-sm text-green-600 dark:text-green-400">
                  +{formatCurrency(monthlyChange)} this month
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex flex-col p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                  <span className="text-gray-600 dark:text-gray-400">EPF</span>
                  <span className="font-semibold">
                    {formatCurrency(epfContributions.reduce((sum, c) => sum + c.amount, 0))}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                  <span className="text-gray-600 dark:text-gray-400">Investments</span>
                  <span className="font-semibold">
                    {formatCurrency(investments.reduce((sum, i) => sum + i.amount, 0))}
                  </span>
                </div>
                <div className="flex flex-col p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                  <span className="text-gray-600 dark:text-gray-400">Bank Balance</span>
                  <span className="font-semibold">
                    {formatCurrency(totalBankBalance)}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Dialog open={isAddBankDialogOpen} onOpenChange={setIsAddBankDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Add Bank Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Bank Account</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="bank_name">Bank Name</label>
                        <Input 
                          id="bank_name"
                          value={newBankDetails.bank_name}
                          onChange={(e) => setNewBankDetails({...newBankDetails, bank_name: e.target.value})}
                          placeholder="e.g., HDFC, SBI, ICICI"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="account_type">Account Type</label>
                        <Input 
                          id="account_type"
                          value={newBankDetails.account_type}
                          onChange={(e) => setNewBankDetails({...newBankDetails, account_type: e.target.value})}
                          placeholder="e.g., Savings, Current, FD"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium" htmlFor="balance">Current Balance</label>
                        <Input 
                          id="balance"
                          type="number"
                          value={newBankDetails.balance.toString()}
                          onChange={(e) => setNewBankDetails({...newBankDetails, balance: parseFloat(e.target.value) || 0})}
                          placeholder="0.00"
                        />
                      </div>
                      <Button onClick={addBankAccount} className="w-full">Add Account</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
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

      {/* New row - Lifetime Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Salary Earned */}
        <Card>
          <CardHeader>
            <CardTitle>Total Salary Earned</CardTitle>
            <CardDescription>Lifetime earnings from employment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <span className="text-3xl font-bold">
                {isLoading ? "Loading..." : formatCurrency(totalSalaryEarned)}
              </span>
              <div className="text-sm text-gray-500">
                <p>Based on your salary history from {salaries.length > 0 ? format(parseISO(salaries[0].start_date), "MMM yyyy") : "N/A"} to present</p>
                <p className="mt-2">Average monthly income: {formatCurrency(totalSalaryEarned / (salaries.length > 0 ? 
                  (new Date().getTime() - parseISO(salaries[0].start_date).getTime()) / (30 * 24 * 60 * 60 * 1000) : 1))}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses Paid */}
        <Card>
          <CardHeader>
            <CardTitle>Total Expenses Paid</CardTitle>
            <CardDescription>Lifetime spending from all categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <span className="text-3xl font-bold">
                {isLoading ? "Loading..." : formatCurrency(totalExpensesPaid)}
              </span>
              <div className="text-sm text-gray-500">
                <p>Total spending since {expenses.length > 0 ? format(parseISO(expenses[0].date), "MMM yyyy") : "N/A"}</p>
                <p className="mt-2">Your lifetime savings rate: {totalSalaryEarned > 0 ? 
                  ((totalSalaryEarned - totalExpensesPaid) / totalSalaryEarned * 100).toFixed(1) : 0}%</p>
              </div>
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

      {/* New Salary Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle>Salary Allocation Analysis</CardTitle>
          <CardDescription>Where your monthly income goes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-80">Loading...</div>
          ) : salaryAllocation.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salaryAllocation}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="amount"
                      nameKey="category"
                      label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {salaryAllocation.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.category === "Savings" ? "#4ade80" : `hsl(${index * 25}, 70%, 50%)`} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Amount"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex flex-col justify-center">
                <h3 className="text-lg font-semibold mb-4">Monthly Salary: {formatCurrency(currentSalary)}</h3>
                <div className="space-y-4">
                  {salaryAllocation.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{item.category}</span>
                        <span className="text-sm font-medium">
                          {formatCurrency(item.amount)} ({item.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                        <div 
                          className={`h-2.5 rounded-full ${
                            item.category === "Savings" ? 'bg-green-500' : `hsl(${index * 25}, 70%, 50%)`
                          }`} 
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-80 text-gray-500">
              Not enough data to analyze salary allocation
            </div>
          )}
        </CardContent>
      </Card>

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