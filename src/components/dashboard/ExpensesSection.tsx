import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  parseISO,
} from "date-fns";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { 
  ArrowDown, ArrowUp, Calendar, Clock, MapPin, Tag, Trash2,
  ShoppingCart, CreditCard, Music, Utensils, Briefcase, Plane, 
  Home, Dumbbell, Activity, DollarSign, ArrowRightLeft, Fuel, 
  PiggyBank, RotateCcw, HelpCircle, Plus, ArrowLeft, ArrowRight
} from "lucide-react";
import { CategoryTabs, CategoryIcons } from "./CategoryTabs";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader } from "@/components/ui/loader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Define the expense interface based on your database schema
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

// Define category colors for consistent visualization
const CATEGORY_COLORS = {
  ENTERTAINMENT: "#FF8042",
  CREDIT: "#0088FE",
  OTHER: "#FFBB28",
  GROCERIES: "#00C49F",
  SALARY: "#8884D8",
  TRAVEL: "#82CA9D",
  SHOPPING: "#FF6B6B",
  BILLS: "#6A7FDB",
  HEALTH: "#D81159",
  INVESTMENT: "#8F2D56",
  TRANSFER: "#218380",
  FUEL: "#FBB13C",
  BANK_DEPOSIT: "#73D2DE",
  REFUND: "#4ECDC4",
  UNKNOWN: "#AAAAAA",
  GYM: "#7B68EE",
};

// Get all categories with their respective colors
const getAllCategories = () => {
  return Object.keys(CATEGORY_COLORS).map((category) => ({
    name: category,
    color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
  }));
};

export function ExpensesSection() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [categoryTotals, setCategoryTotals] = useState<
    { category: string; amount: number }[]
  >([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const { user } = useAuthStore();

  // New state for expense to delete
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState<'daily' | 'monthly' | 'quarterly'>('daily');

  // New state for tracking API loading states
  const [isChartLoading, setIsChartLoading] = useState(false);

  // Add this new state for the dialog
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  
  // Define form schema using Zod
  const formSchema = z.object({
    date: z.string().min(1, "Date is required"),
    time: z.string().optional(),
    place: z.string().optional(),
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
    category: z.string().min(1, "Category is required"),
    account: z.string().optional(),
    tags: z.string().optional(),
    note: z.string().optional(),
  });

  // Initialize the form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      time: "",
      place: "",
      amount: 0,
      category: "",
      account: "",
      tags: "",
      note: "",
    },
  });

  // Modified fetch expenses to handle different timeframes
  const fetchExpenses = async (timeframe = 'daily') => {
    if (!user) return;

    try {
      setIsLoading(true);
      let startDate, endDate;
      
      // Determine the appropriate date range based on timeframe
      if (timeframe === 'monthly') {
        // For monthly view, get data for the last 6 months
        startDate = startOfMonth(subMonths(selectedMonth, 5));
        endDate = endOfMonth(selectedMonth);
      } else if (timeframe === 'quarterly') {
        // For quarterly view, get data for the last 12 months (4 quarters)
        startDate = startOfMonth(subMonths(selectedMonth, 11));
        endDate = endOfMonth(selectedMonth);
      } else {
        // For daily view (default), get data for the selected month
        startDate = startOfMonth(selectedMonth);
        endDate = endOfMonth(selectedMonth);
      }

      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDate.toISOString().split("T")[0])
        .lte("date", endDate.toISOString().split("T")[0])
        .order("date", { ascending: false });

      if (error) throw error;

      setExpenses(data || []);

      // Calculate category totals
      const categories = {} as Record<string, number>;
      let spent = 0;
      let income = 0;

      data?.forEach((expense) => {
        // Determine if this is an expense or income
        const isExpense = expense.dr_cr === "DR" || !expense.income;
        
        // Check if the category is not CREDIT or SALARY (include INVESTMENT)
        const shouldCountForTotal = isExpense && 
          expense.category !== "CREDIT" && 
          expense.category !== "SALARY";

        if (isExpense) {
          // Add to category total
          if (!categories[expense.category]) {
            categories[expense.category] = 0;
          }
          categories[expense.category] += expense.amount;
          
          // Only add to total spent if it's not CREDIT or SALARY
          if (shouldCountForTotal) {
            spent += expense.amount;
          }
        }
      });

      // After processing expenses, fetch the salary for this month
      if (user) {
        const startDate = startOfMonth(selectedMonth);
        const endDate = endOfMonth(selectedMonth);
        
        const { data: salaryData } = await supabase
          .from("salaries")
          .select("amount")
          .eq("user_id", user.id)
          .lte("start_date", endDate.toISOString().split("T")[0])
          .or(`end_date.is.null,end_date.gte.${startDate.toISOString().split("T")[0]}`)
          .order("start_date", { ascending: false })
          .limit(1);
        
        if (salaryData && salaryData.length > 0) {
          income = salaryData[0].amount;
        }
      }

      // Convert to array for chart
      const categoryArray = Object.entries(categories).map(
        ([category, amount]) => ({
          category,
          amount,
        })
      );

      setCategoryTotals(categoryArray);
      setTotalSpent(spent);
      setTotalIncome(income);
    } catch (error) {
      console.error("Error fetching expenses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update useEffect to fetch data when timeframe changes
  useEffect(() => {
    fetchExpenses(activeTimeframe);
  }, [user, selectedMonth, activeTimeframe]);

  // Handle month change
  const handlePreviousMonth = () => {
    setSelectedMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹ ${amount.toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    return (
      CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || "#AAAAAA"
    );
  };

  // Function to delete an expense
  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", expenseId);

      if (error) throw error;

      // Refresh the expenses list after deletion
      fetchExpenses();
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  // Modified delete expense function to work with confirmation dialog
  const handleDeleteExpense = () => {
    if (!expenseToDelete) return;
    
    deleteExpense(expenseToDelete);
    setExpenseToDelete(null);
  };
  
  // Function to prepare data for different timeframes
  const prepareTimeframeData = () => {
    if (expenses.length === 0) return [];
    
    if (activeTimeframe === 'daily') {
      // Daily spending (existing implementation)
      return Object.entries(
        expenses.reduce((acc, expense) => {
          const date = expense.date;
          if (!acc[date]) acc[date] = 0;
          // Only count expenses, not income
          if (expense.dr_cr === "DR" || !expense.income) {
            acc[date] += expense.amount;
          }
          return acc;
        }, {} as Record<string, number>)
      )
        .map(([date, amount]) => ({
          date: format(parseISO(date), "dd MMM"),
          amount,
        }))
        .sort((a, b) => {
          return (
            new Date(a.date).getTime() -
            new Date(b.date).getTime()
          );
        });
    } else if (activeTimeframe === 'monthly') {
      // Monthly data for the last 6 months
      const monthlyData = [];
      for (let i = 0; i < 6; i++) {
        const monthDate = subMonths(selectedMonth, i);
        const start = startOfMonth(monthDate);
        const end = endOfMonth(monthDate);
        
        const monthExpenses = expenses.filter(expense => {
          const expenseDate = parseISO(expense.date);
          return expenseDate >= start && expenseDate <= end && 
                 (expense.dr_cr === "DR" || !expense.income);
        });
        
        const total = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        monthlyData.push({
          date: format(monthDate, "MMM yyyy"),
          amount: total
        });
      }
      return monthlyData.reverse();
    } else {
      // Quarterly data
      const quarterlyData = [];
      for (let i = 0; i < 4; i++) {
        const startMonth = subMonths(selectedMonth, i * 3);
        const start = startOfMonth(startMonth);
        const end = endOfMonth(subMonths(startMonth, 2));
        
        const quarterExpenses = expenses.filter(expense => {
          const expenseDate = parseISO(expense.date);
          return expenseDate >= start && expenseDate <= end && 
                 (expense.dr_cr === "DR" || !expense.income);
        });
        
        const total = quarterExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        
        quarterlyData.push({
          date: `Q${Math.floor((startMonth.getMonth() / 3) + 1)} ${startMonth.getFullYear()}`,
          amount: total
        });
      }
      return quarterlyData.reverse();
    }
  };

  // Function to handle timeframe change
  const handleTimeframeChange = (timeframe: 'daily' | 'monthly' | 'quarterly') => {
    setActiveTimeframe(timeframe);
    // Data will be fetched by the useEffect when activeTimeframe changes
  };

  // Form submission handler
  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) return;
    
    try {
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id,
        date: values.date,
        time: values.time || null,
        place: values.place || null,
        amount: values.amount,
        category: values.category,
        account: values.account || null,
        tags: values.tags || null,
        note: values.note || null,
        dr_cr: "DR", // Default to debit (expense)
      });
      
      if (error) throw error;
      
      // Close dialog and refresh data
      setIsAddExpenseOpen(false);
      fetchExpenses();
      form.reset();
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Month selector and summary */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <Card className="w-full md:w-auto">
          <CardContent className="p-4 flex items-center justify-between gap-2">
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousMonth}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-xl font-bold px-4">
                {format(selectedMonth, "MMMM yyyy")}
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
                disabled={selectedMonth >= new Date()}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Add expense button - placed next to month selector */}
            <Dialog open={isAddExpenseOpen} onOpenChange={setIsAddExpenseOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="ml-4">
                  <Plus className="h-4 w-4 mr-2" /> Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Add New Expense</DialogTitle>
                  <DialogDescription>
                    Enter the details of your expense below.
                  </DialogDescription>
                </DialogHeader>
                
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Time (Optional)</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.keys(CATEGORY_COLORS).map((category) => (
                                <SelectItem key={category} value={category}>
                                  <div className="flex items-center">
                                    <div className="mr-2">
                                      {CategoryIcons[category] || <HelpCircle size={18} />}
                                    </div>
                                    {category}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="place"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Place (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="account"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="tags"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tags (Optional)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Comma separated tags" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="note"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Note (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter>
                      <Button type="submit">Save Expense</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <Card className="w-full sm:w-1/2 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 dark:text-red-400">
                    Total Spent
                  </p>
                  <h3 className="text-xl font-bold mt-1">
                    {formatCurrency(totalSpent)}
                  </h3>
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full">
                  <ArrowDown className="h-6 w-6 text-red-600 dark:text-red-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="w-full sm:w-1/2 bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 dark:text-green-400">
                    Total Income
                  </p>
                  <h3 className="text-xl font-bold mt-1">
                    {formatCurrency(totalIncome)}
                  </h3>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-800 rounded-full">
                  <ArrowUp className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main content grid - UPDATED LAYOUT PROPORTIONS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Category Tabs (now takes 2/3 of width) */}
        <div className="md:col-span-2 space-y-6">
          <CategoryTabs 
            expenses={expenses} 
            categoryColors={CATEGORY_COLORS} 
            onDeleteExpense={(id) => setExpenseToDelete(id)}
            onRefresh={fetchExpenses}
          />
        </div>

        {/* Right column (now takes 1/3 of width) */}
        <div className="md:col-span-1 space-y-6">
          {/* Spending by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>
                {format(selectedMonth, "MMMM yyyy")} breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-80">
                  <Loader />
                </div>
              ) : categoryTotals.length > 0 ? (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryTotals}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        innerRadius={40}
                        fill="#8884d8"
                        dataKey="amount"
                        nameKey="category"
                        label={({ name, percent }) =>
                          `${name}: ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {categoryTotals.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={getCategoryColor(entry.category)}
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
                <div className="flex items-center justify-center h-80 text-gray-500">
                  No expense data for this month
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced spending trend with tabs */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <CardTitle>Spending Trends</CardTitle>
                  <CardDescription>
                    {format(selectedMonth, "MMMM yyyy")} spending patterns
                  </CardDescription>
                </div>
                <Tabs 
                  value={activeTimeframe}
                  onValueChange={(v) => handleTimeframeChange(v as 'daily' | 'monthly' | 'quarterly')}
                  className="w-full md:w-auto"
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                    <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader />
                </div>
              ) : expenses.length > 0 ? (
                <div className="h-64 relative">
                  {isChartLoading && (
                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-10">
                      <Loader />
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={prepareTimeframeData()}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [
                          formatCurrency(Number(value)),
                          "Amount",
                        ]}
                      />
                      <Bar
                        dataKey="amount"
                        fill="#3b82f6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No expense data for this period
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!expenseToDelete} onOpenChange={(open) => !open && setExpenseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteExpense} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
