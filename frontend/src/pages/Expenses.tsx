import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { useApiQuery, useApiMutation } from "@/hooks/useApi";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/api/client";
import { Receipt, Plus, Filter, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";

const Expenses = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    const activeBranchId = useAuthStore((state) => state.activeBranchId);
    const user           = useAuthStore((state) => state.user);

    const { data: branches = [] } = useQuery<any[]>({
        queryKey: ["branches"],
        queryFn: async () => {
            const res = await apiClient.get("/branches");
            return res.data.data || [];
        },
    });

    const userBranchId      = user?.branch_id ? String(user.branch_id) : null;
    const [selectedBranchId, setSelectedBranchId] = useState(
        userBranchId ?? (activeBranchId ? String(activeBranchId) : "")
    );
    const showBranchSelector = !userBranchId && Array.isArray(branches) && branches.length > 0;

    const { data: expenses, isLoading, refetch } = useApiQuery<any>(
        ['expenses', selectedBranchId],
        `/expenses${selectedBranchId ? `?branch_id=${selectedBranchId}` : ''}`
    );
    const { data: categories } = useApiQuery<any>(['expense-categories'], '/expenses/categories');

    const { mutate: addExpense, isPending: isAdding } = useApiMutation(
        (data: any) => import('@/api/client').then(m => m.default.post('/expenses', data)),
        "Expense recorded successfully!",
        [['expenses']]
    );

    const { mutate: addCategory, isPending: isAddingCategory } = useApiMutation(
        (data: any) => import('@/api/client').then(m => m.default.post('/expenses/categories', data)),
        "Category added!",
        [['expense-categories']]
    );

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());
        if (selectedBranchId) {
            data.branch_id = selectedBranchId;
        }
        addExpense(data, {
            onSuccess: () => {
                setIsModalOpen(false);
                refetch();
            }
        });
    };

    const handleCategorySubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        addCategory({ name: formData.get('name') }, {
            onSuccess: () => setIsCategoryModalOpen(false)
        });
    };

    const columns = [
        { header: "Date", accessor: (item: any) => format(new Date(item.expense_date), "MMM d, yyyy") },
        { header: "Category", accessor: (item: any) => (
            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold uppercase">
                {item.category_name}
            </span>
        )},
        { header: "Description", accessor: "description" },
        { header: "Amount", accessor: (item: any) => <span className="font-bold text-rose-600">LKR {Number(item.amount).toLocaleString()}</span> },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <PageHeader 
                    title="Expense Management" 
                    description="Track your salon costs and overheads for accurate P&L reporting."
                />
                <div className="flex items-center gap-2">
                    <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)}>Manage Categories</Button>
                    <Button onClick={() => setIsModalOpen(true)}>
                        <Plus size={18} className="mr-2" /> Record Expense
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-xl"><Receipt size={24} /></div>
                    <div>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Expenses (Month)</p>
                        <p className="text-2xl font-black text-slate-900">
                            LKR {expenses?.data?.reduce((sum: number, e: any) => sum + Number(e.amount), 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            <DataTable 
                columns={columns}
                data={expenses?.data || []}
                isLoading={isLoading}
                emptyMessage="No expenses recorded yet."
            />

            {/* Add Expense Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Expense">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {showBranchSelector && (
                        <Select
                            label="Branch"
                            value={selectedBranchId}
                            onChange={(e) => setSelectedBranchId(e.target.value)}
                            options={[
                                { label: "All Branches", value: "" },
                                ...(branches as any[]).map((b: any) => ({ label: b.name, value: String(b.id) }))
                            ]}
                        />
                    )}
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Date" name="expense_date" type="date" defaultValue={new Date().toISOString().split('T')[0]} required />
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 uppercase">Category</label>
                            <Select 
                                name="category_id" 
                                required
                                options={categories?.data?.map((c: any) => ({ label: c.name, value: c.id })) || []}
                            />
                        </div>
                    </div>
                    <Input label="Amount (LKR)" name="amount" type="number" step="0.01" required placeholder="0.00" />
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Description</label>
                        <textarea 
                            name="description" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="What was this expense for?"
                            rows={3}
                        />
                    </div>
                    <Button type="submit" loading={isAdding} className="w-full h-12 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
                        Save Expense
                    </Button>
                </form>
            </Modal>

            {/* Category Modal */}
            <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Manage Categories">
                <div className="space-y-6">
                    <form onSubmit={handleCategorySubmit} className="flex gap-2">
                        <Input name="name" placeholder="New category name" required className="flex-1" />
                        <Button type="submit" loading={isAddingCategory}>Add</Button>
                    </form>
                    <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-500 uppercase">Existing Categories</p>
                        <div className="flex flex-wrap gap-2">
                            {categories?.data?.map((c: any) => (
                                <span key={c.id} className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
                                    {c.name}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default Expenses;
