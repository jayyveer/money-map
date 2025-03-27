import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ShoppingCart, CreditCard, Music, Utensils, Briefcase, Plane, 
  Home, Dumbbell, Activity, DollarSign, ArrowRightLeft, Fuel, 
  PiggyBank, RotateCcw, HelpCircle, Trash2, Check
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Loader } from "@/components/ui/loader";

// Import the Expense type from ExpensesSection
export interface Expense {
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

interface CategoryTabsProps {
  expenses: Expense[];
  categoryColors: Record<string, string>;
  onDeleteExpense: (id: string) => void;
  onRefresh: () => void;
}

// Map categories to appropriate icons
const CategoryIcons: Record<string, React.ReactNode> = {
  "SHOPPING": <ShoppingCart size={18} />,
  "CREDIT": <CreditCard size={18} />,
  "ENTERTAINMENT": <Music size={18} />,
  "GROCERIES": <Utensils size={18} />,
  "SALARY": <Briefcase size={18} />,
  "TRAVEL": <Plane size={18} />,
  "BILLS": <Home size={18} />,
  "GYM": <Dumbbell size={18} />,
  "HEALTH": <Activity size={18} />,
  "INVESTMENT": <DollarSign size={18} />,
  "TRANSFER": <ArrowRightLeft size={18} />,
  "FUEL": <Fuel size={18} />,
  "BANK_DEPOSIT": <PiggyBank size={18} />,
  "REFUND": <RotateCcw size={18} />,
  "UNKNOWN": <HelpCircle size={18} />,
  "OTHER": <HelpCircle size={18} />
};

export function CategoryTabs({ expenses, categoryColors, onDeleteExpense, onRefresh }: CategoryTabsProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});

  // Calculate total per category
  const categoryTotals = expenses.reduce((totals, expense) => {
    if (expense.dr_cr === "DR" || !expense.income) {
      if (!totals[expense.category]) {
        totals[expense.category] = 0;
      }
      totals[expense.category] += expense.amount;
    }
    return totals;
  }, {} as Record<string, number>);

  // Sort categories by amount spent (descending)
  const categories = Object.keys(categoryTotals).sort(
    (a, b) => categoryTotals[b] - categoryTotals[a]
  );

  const filteredExpenses = selectedCategory
    ? expenses.filter((expense) => expense.category === selectedCategory)
    : expenses.filter((expense) => 
        // Only show expenses (not income) in the category tabs by default
        (expense.dr_cr === "DR" || !expense.income)
      );

  // Define formatCurrency locally
  const formatCurrency = (amount: number) => {
    return `₹ ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // When calculating totals for display
  const categoryTotal = filteredExpenses.reduce((total, expense) => {
    // Skip CREDIT and SALARY for grand total calculations
    if (expense.category !== "CREDIT" && expense.category !== "SALARY") {
      return total + expense.amount;
    }
    return total;
  }, 0);

  // Update category for an expense
  const updateCategory = async (expenseId: string, newCategory: string) => {
    setIsUpdating(prev => ({ ...prev, [expenseId]: true }));
    
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ category: newCategory })
        .eq("id", expenseId);
        
      if (error) throw error;
      onRefresh(); // Refresh data after update
    } catch (error) {
      console.error("Error updating category:", error);
    } finally {
      setIsUpdating(prev => ({ ...prev, [expenseId]: false }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Category-wise Spends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {categories.map((category) => (
            <div 
              key={category} 
              className={`p-4 rounded-lg cursor-pointer transition-all ${
                selectedCategory === category 
                  ? 'ring-2 ring-offset-2' 
                  : 'hover:opacity-90'
              }`}
              style={{ backgroundColor: categoryColors[category] || "#AAAAAA" }}
              onClick={() => setSelectedCategory(category === selectedCategory ? null : category)}
            >
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-white/20 rounded-full">
                    {CategoryIcons[category] || <HelpCircle size={18} />}
                  </div>
                  <span className="font-medium">{category}</span>
                </div>
                <span className="font-bold">{formatCurrency(categoryTotals[category])}</span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-lg font-medium mb-2">
          {selectedCategory 
            ? `${selectedCategory} Expenses (${filteredExpenses.length})` 
            : `All Expenses (${filteredExpenses.length})`}
        </h3>
        <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
          {filteredExpenses.map((expense) => {
            const isExpense = expense.dr_cr === "DR" || !expense.income;
            return (
              <div
                key={expense.id}
                className="flex justify-between items-center p-2 border-b"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ 
                      backgroundColor: categoryColors[expense.category] + '33' 
                    }}
                  >
                    {CategoryIcons[expense.category] || <HelpCircle size={18} />}
                  </div>
                  <div>
                    <span className="font-medium">{expense.description || expense.note || expense.category}</span>
                    <div className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={isExpense ? "text-red-600" : "text-green-600"}>
                    {isExpense ? "-" : "+"}{formatCurrency(expense.amount)}
                  </span>
                  
                  {/* Category dropdown for UNKNOWN */}
                  {expense.category === "UNKNOWN" && (
                    <select
                      onChange={(e) => updateCategory(expense.id, e.target.value)}
                      disabled={isUpdating[expense.id]}
                      className="border rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
                    >
                      <option value="">Select category</option>
                      {Object.keys(categoryColors)
                        .filter(cat => cat !== "UNKNOWN")
                        .map(category => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))
                      }
                    </select>
                  )}
                  
                  {/* Delete button */}
                  <button
                    onClick={() => onDeleteExpense(expense.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export { CategoryIcons }; 