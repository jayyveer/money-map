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
import { ArrowDown, ArrowUp, Calendar, Clock, MapPin, Tag } from "lucide-react";

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

  // Function to fetch expenses for the selected month
  const fetchExpenses = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const startDate = startOfMonth(selectedMonth);
      const endDate = endOfMonth(selectedMonth);

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

        if (isExpense) {
          // Add to category total
          if (!categories[expense.category]) {
            categories[expense.category] = 0;
          }
          categories[expense.category] += expense.amount;
          spent += expense.amount;
        } else {
          income += expense.amount;
        }
      });

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

  useEffect(() => {
    fetchExpenses();
  }, [user, selectedMonth]);

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

  return (
    <div className="space-y-6">
      {/* Month selector and summary */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <Card className="w-full md:w-auto">
          <CardContent className="p-4 flex items-center justify-between">
            <button
              onClick={handlePreviousMonth}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              &lt;
            </button>
            <h2 className="text-xl font-bold px-4">
              {format(selectedMonth, "MMMM yyyy")}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
              disabled={selectedMonth >= new Date()}
            >
              &gt;
            </button>
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
                  <h3 className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {isLoading ? "Loading..." : formatCurrency(totalSpent)}
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
                  <h3 className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {isLoading ? "Loading..." : formatCurrency(totalIncome)}
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

      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column - Spending by category */}
        <div className="md:col-span-1 space-y-6">
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
                  Loading...
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
                      <Legend />
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
        </div>

        {/* Middle and right columns */}
        <div className="md:col-span-2 space-y-6">
          {/* Category cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading ? (
              Array(6)
                .fill(0)
                .map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </CardContent>
                  </Card>
                ))
            ) : categoryTotals.length > 0 ? (
              categoryTotals
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 6)
                .map((category) => (
                  <Card key={category.category} className="overflow-hidden">
                    <div
                      className="h-1"
                      style={{
                        backgroundColor: getCategoryColor(category.category),
                      }}
                    ></div>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">
                            {category.category}
                          </p>
                          <p className="text-xl font-bold">
                            {formatCurrency(category.amount)}
                          </p>
                        </div>
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor:
                              getCategoryColor(category.category) + "33",
                          }}
                        >
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: getCategoryColor(
                                category.category
                              ),
                            }}
                          ></span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No expense data for this month
              </div>
            )}
          </div>

          {/* Monthly spending trend */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Spending</CardTitle>
              <CardDescription>
                {format(selectedMonth, "MMMM yyyy")} spending pattern
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  Loading...
                </div>
              ) : expenses.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={
                        // Group by date and sum amounts
                        Object.entries(
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
                          })
                      }
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
                  No expense data for this month
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest expenses and income</CardDescription>
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
              ) : expenses.length > 0 ? (
                <div className="space-y-4 max-h-96 overflow-auto pr-2">
                  {expenses.slice(0, 10).map((expense) => {
                    const isExpense = expense.dr_cr === "DR" || !expense.income;
                    return (
                      <div
                        key={expense.id}
                        className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isExpense
                              ? "bg-red-100 dark:bg-red-900/20"
                              : "bg-green-100 dark:bg-green-900/20"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full ${
                              isExpense
                                ? "bg-red-500 dark:bg-red-400"
                                : "bg-green-500 dark:bg-green-400"
                            }`}
                          ></span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {expense.description ||
                              expense.note ||
                              expense.category}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>
                                {format(parseISO(expense.date), "dd MMM yyyy")}
                              </span>
                            </div>
                            {expense.time && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{expense.time.substring(0, 5)}</span>
                              </div>
                            )}
                            {expense.place && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{expense.place}</span>
                              </div>
                            )}
                            {expense.tags && (
                              <div className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                <span>{expense.tags}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <p
                          className={`font-medium whitespace-nowrap ${
                            isExpense
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {isExpense ? "-" : "+"}
                          {formatCurrency(expense.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  No transactions found for this month
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
