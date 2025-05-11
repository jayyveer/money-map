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
import { format, parseISO } from "date-fns";
import { Loader } from "@/components/ui/loader";
import { 
  Landmark, 
  Plus, 
  Edit, 
  Trash2, 
  CreditCard, 
  RefreshCw,
  DollarSign
} from "lucide-react";

// Define the bank account interface based on your database schema
interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  account_type: string;
  balance: number;
  last_updated: string;
}

export function BankSection() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [newBankDetails, setNewBankDetails] = useState({
    bank_name: "",
    account_type: "",
    balance: 0
  });
  const { user } = useAuthStore();

  // Function to fetch bank accounts
  const fetchBankAccounts = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("bank_name", { ascending: true });

      if (error) throw error;

      setBankAccounts(data || []);

      // Calculate total balance
      const total = (data || []).reduce(
        (sum, account) => sum + account.balance,
        0
      );
      setTotalBalance(total);
    } catch (error) {
      console.error("Error fetching bank accounts:", error);
    } finally {
      setIsLoading(false);
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
      await fetchBankAccounts();

      // Reset form and close dialog
      setNewBankDetails({
        bank_name: "",
        account_type: "",
        balance: 0
      });
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding bank account:", error);
    }
  };

  // Function to update a bank account
  const updateBankAccount = async () => {
    if (!user || !editingAccount) return;

    try {
      const { error } = await supabase
        .from("bank_accounts")
        .update({
          bank_name: editingAccount.bank_name,
          account_type: editingAccount.account_type,
          balance: editingAccount.balance,
          last_updated: new Date().toISOString()
        })
        .eq("id", editingAccount.id);

      if (error) throw error;

      // Refresh bank accounts
      await fetchBankAccounts();

      // Reset form and close dialog
      setEditingAccount(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating bank account:", error);
    }
  };

  // Function to delete a bank account
  const deleteBankAccount = async (accountId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("bank_accounts")
        .delete()
        .eq("id", accountId);

      if (error) throw error;

      // Refresh bank accounts
      await fetchBankAccounts();
    } catch (error) {
      console.error("Error deleting bank account:", error);
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return `₹ ${amount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // Initial data loading
  useEffect(() => {
    fetchBankAccounts();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Bank Accounts</h2>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Bank Account
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Total Bank Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
            {isLoading ? (
              <Loader />
            ) : (
              formatCurrency(totalBalance)
            )}
          </div>
          <p className="text-sm text-blue-600/80 dark:text-blue-400/80 mt-1">
            Across {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Bank Accounts List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Your Bank Accounts</CardTitle>
              <CardDescription>
                Manage all your bank accounts in one place
              </CardDescription>
            </div>
            <Button variant="outline" size="icon" onClick={fetchBankAccounts}>
              <RefreshCw className="h-4 w-4" />
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
          ) : bankAccounts.length > 0 ? (
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div key={account.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900/20">
                        <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-medium">{account.bank_name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {account.account_type}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingAccount(account);
                          setIsEditDialogOpen(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteBankAccount(account.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <p className="text-xl font-bold">
                      {formatCurrency(account.balance)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Last updated: {format(parseISO(account.last_updated), "dd MMM yyyy")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Landmark className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No bank accounts found</p>
              <p className="text-sm">Add your first bank account to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Bank Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>
              Add a new bank account to track your balance.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bank_name" className="text-right">
                Bank Name
              </Label>
              <Input
                id="bank_name"
                value={newBankDetails.bank_name}
                onChange={(e) => setNewBankDetails({...newBankDetails, bank_name: e.target.value})}
                className="col-span-3"
                placeholder="e.g., HDFC, SBI, ICICI"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="account_type" className="text-right">
                Account Type
              </Label>
              <Input
                id="account_type"
                value={newBankDetails.account_type}
                onChange={(e) => setNewBankDetails({...newBankDetails, account_type: e.target.value})}
                className="col-span-3"
                placeholder="e.g., Savings, Current, FD"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="balance" className="text-right">
                Balance
              </Label>
              <Input
                id="balance"
                type="number"
                value={newBankDetails.balance}
                onChange={(e) => setNewBankDetails({...newBankDetails, balance: Number(e.target.value)})}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={addBankAccount}>Add Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bank Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Bank Account</DialogTitle>
            <DialogDescription>
              Update your bank account details.
            </DialogDescription>
          </DialogHeader>
          {editingAccount && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_bank_name" className="text-right">
                  Bank Name
                </Label>
                <Input
                  id="edit_bank_name"
                  value={editingAccount.bank_name}
                  onChange={(e) => setEditingAccount({...editingAccount, bank_name: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_account_type" className="text-right">
                  Account Type
                </Label>
                <Input
                  id="edit_account_type"
                  value={editingAccount.account_type}
                  onChange={(e) => setEditingAccount({...editingAccount, account_type: e.target.value})}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_balance" className="text-right">
                  Balance
                </Label>
                <Input
                  id="edit_balance"
                  type="number"
                  value={editingAccount.balance}
                  onChange={(e) => setEditingAccount({...editingAccount, balance: Number(e.target.value)})}
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={updateBankAccount}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
