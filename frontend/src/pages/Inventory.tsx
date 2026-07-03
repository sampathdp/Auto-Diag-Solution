import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import {
  Package, Search, Plus, ArrowUpRight, ArrowDownLeft,
  History, AlertTriangle, MoreVertical, Edit2, Trash2,
  Box, TrendingUp, TrendingDown, Layers
} from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient from "@/api/client";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const InventoryPage = () => {
  const activeBranchId = useAuthStore((state) => state.activeBranchId);
  const { list, create, update, remove, recordTransaction, listLogs } = useInventory();

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await apiClient.get("/branches");
      return res.data.data || [];
    },
  });
  
  const [activeTab, setActiveTab] = useState<"products" | "history">("products");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [adjustmentType, setAdjustmentType] = useState<"purchase" | "usage" | "adjustment">("purchase");
  
  const { data: products, isLoading } = list(activeBranchId);
  const { data: logs, isLoading: isLoadingLogs } = listLogs(selectedProduct?.id, activeBranchId);
  
  const { mutate: doCreate, isPending: isCreating } = create();
  const { mutate: doUpdate, isPending: isUpdating } = update(selectedProduct?.id);
  const { mutate: doDelete } = remove();
  const { mutate: doTransaction, isPending: isRecording } = recordTransaction();

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    cost_price: "",
    selling_price: "",
    stock_quantity: "0",
    low_stock_alert: "5",
    branch_id: activeBranchId ? String(activeBranchId) : ""
  });

  const [editData, setEditData] = useState({
    name: "",
    sku: "",
    cost_price: "",
    selling_price: "",
    low_stock_alert: "5",
    branch_id: ""
  });

  const [adjustData, setAdjustData] = useState({
    quantity: "1",
    notes: ""
  });

  const filteredProducts = useMemo(() => {
    if (!Array.isArray(products)) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [products, searchQuery]);

  const stats = useMemo(() => {
    if (!Array.isArray(products)) return { total: 0, low: 0, out: 0 };
    return {
      total: products.length,
      low: products.filter(p => p.stock_quantity > 0 && p.stock_quantity <= p.low_stock_alert).length,
      out: products.filter(p => p.stock_quantity <= 0).length
    };
  }, [products]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doCreate(formData, {
      onSuccess: () => {
        setIsAddModalOpen(false);
        setFormData({ name: "", sku: "", cost_price: "", selling_price: "", stock_quantity: "0", low_stock_alert: "5", branch_id: activeBranchId ? String(activeBranchId) : "" });
      }
    });
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    doTransaction({
      product_id: selectedProduct.id,
      type: adjustmentType,
      quantity: adjustData.quantity,
      notes: adjustData.notes
    }, {
      onSuccess: () => {
        setIsAdjustmentModalOpen(false);
        setAdjustData({ quantity: "1", notes: "" });
      }
    });
  };

  const columns = [
    {
      header: "Product Info",
      accessor: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
            <Package size={20} />
          </div>
          <div>
            <p className="font-bold text-slate-900">{item.name}</p>
            <p className="text-xs text-slate-500 font-medium">{item.sku || "No SKU"}</p>
          </div>
        </div>
      )
    },
    {
      header: "Stock Status",
      accessor: (item: any) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-black",
              item.stock_quantity <= 0 ? "text-rose-600" :
              item.stock_quantity <= item.low_stock_alert ? "text-amber-600" :
              "text-slate-900"
            )}>
              {item.stock_quantity} in stock
            </span>
            {item.stock_quantity <= item.low_stock_alert && (
              <Badge variant={item.stock_quantity <= 0 ? "danger" : "warning"} className="text-[8px] px-1 py-0 h-4">
                {item.stock_quantity <= 0 ? "OUT" : "LOW"}
              </Badge>
            )}
          </div>
          <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full transition-all duration-500",
                item.stock_quantity <= 0 ? "w-0" :
                item.stock_quantity <= item.low_stock_alert ? "bg-amber-500 w-1/3" :
                "bg-emerald-500 w-full"
              )}
            />
          </div>
        </div>
      )
    },
    {
      header: "Pricing",
      accessor: (item: any) => (
        <div className="space-y-1">
          <p className="text-xs font-bold text-slate-900">Sell: LKR {Number(item.selling_price).toLocaleString()}</p>
          <p className="text-[10px] font-medium text-slate-400 uppercase">Cost: LKR {Number(item.cost_price).toLocaleString()}</p>
        </div>
      )
    },
    {
      header: "Actions",
      accessor: (item: any) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 rounded-lg"
            onClick={() => {
              setSelectedProduct(item);
              setAdjustmentType("purchase");
              setIsAdjustmentModalOpen(true);
            }}
          >
            <Plus size={14} className="mr-1" /> Add Stock
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => {
              setSelectedProduct(item);
              setIsAdjustmentModalOpen(true);
              setAdjustmentType("usage");
            }}
          >
            <ArrowDownLeft size={16} className="text-slate-400" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => {
              setSelectedProduct(item);
              setEditData({
                name: item.name || "",
                sku: item.sku || "",
                cost_price: String(item.cost_price ?? ""),
                selling_price: String(item.selling_price ?? ""),
                low_stock_alert: String(item.low_stock_alert ?? "5"),
                branch_id: item.branch_id ? String(item.branch_id) : ""
              });
              setIsEditModalOpen(true);
            }}
          >
            <Edit2 size={16} className="text-slate-400" />
          </Button>
        </div>
      )
    }
  ];

  const logColumns = [
    {
      header: "Date & Time",
      accessor: (item: any) => (
        <div className="text-sm font-medium text-slate-600">
          {format(new Date(item.created_at), "MMM dd, yyyy HH:mm")}
        </div>
      )
    },
    {
      header: "Type",
      accessor: (item: any) => (
        <Badge variant={
          item.type === 'purchase' ? 'success' :
          item.type === 'sale' ? 'info' :
          item.type === 'usage' ? 'warning' : 'default'
        } className="uppercase text-[10px]">
          {item.type}
        </Badge>
      )
    },
    {
      header: "Quantity",
      accessor: (item: any) => (
        <div className={cn(
          "font-bold flex items-center gap-1",
          ['purchase', 'adjustment'].includes(item.type) ? "text-emerald-600" : "text-rose-600"
        )}>
          {['purchase', 'adjustment'].includes(item.type) ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {item.quantity}
        </div>
      )
    },
    {
      header: "Product",
      accessor: "product_name"
    },
    {
      header: "Notes",
      accessor: (item: any) => <span className="text-xs text-slate-500 italic">{item.notes || "-"}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Inventory" 
        description="Manage your professional products and retail stock."
        action={
          <Button onClick={() => setIsAddModalOpen(true)} className="rounded-2xl shadow-lg shadow-indigo-200">
            <Plus size={20} className="mr-2" /> Add Product
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Total Products</p>
            <p className="text-2xl font-black text-slate-900">{stats.total}</p>
          </div>
        </div>
        <div className={cn(
          "p-6 rounded-[2rem] border shadow-sm flex items-center gap-4",
          stats.low > 0 ? "bg-amber-50 border-amber-100" : "bg-white border-slate-200"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            stats.low > 0 ? "bg-amber-100 text-amber-600" : "bg-slate-50 text-slate-400"
          )}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Low Stock</p>
            <p className={cn("text-2xl font-black", stats.low > 0 ? "text-amber-700" : "text-slate-900")}>{stats.low}</p>
          </div>
        </div>
        <div className={cn(
          "p-6 rounded-[2rem] border shadow-sm flex items-center gap-4",
          stats.out > 0 ? "bg-rose-50 border-rose-100" : "bg-white border-slate-200"
        )}>
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            stats.out > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-50 text-slate-400"
          )}>
            <Box size={24} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-500">Out of Stock</p>
            <p className={cn("text-2xl font-black", stats.out > 0 ? "text-rose-700" : "text-slate-900")}>{stats.out}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-2xl w-fit border border-slate-200">
        <button 
          onClick={() => setActiveTab("products")}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2",
            activeTab === "products" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Package size={16} /> Products
        </button>
        <button 
          onClick={() => setActiveTab("history")}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all duration-200 flex items-center gap-2",
            activeTab === "history" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <History size={16} /> Stock History
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-2">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search products by name or SKU..." 
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <DataTable 
          columns={activeTab === "products" ? columns : logColumns} 
          data={activeTab === "products" ? filteredProducts : (Array.isArray(logs) ? logs : [])} 
          isLoading={activeTab === "products" ? isLoading : isLoadingLogs}
          emptyMessage={activeTab === "products" ? "No products found." : "No stock history found."}
        />
      </div>

      {/* Add/Edit Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Product"
        size="md"
      >
        <form onSubmit={handleAddSubmit} className="space-y-6">
          {Array.isArray(branches) && branches.length > 0 && (
            <Select
              label="Branch"
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              options={[
                { label: "All Branches", value: "" },
                ...branches.map((b: any) => ({ label: b.name, value: String(b.id) }))
              ]}
            />
          )}
          <Input
            label="Product Name"
            placeholder="e.g. Lavender Shampoo"
            required
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="SKU" 
              placeholder="SKU-1234"
              value={formData.sku}
              onChange={(e) => setFormData({...formData, sku: e.target.value})}
            />
            <Input 
              label="Low Stock Alert" 
              type="number"
              value={formData.low_stock_alert}
              onChange={(e) => setFormData({...formData, low_stock_alert: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Cost Price" 
              type="number"
              placeholder="0.00"
              value={formData.cost_price}
              onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
            />
            <Input 
              label="Selling Price" 
              type="number"
              placeholder="0.00"
              value={formData.selling_price}
              onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
            />
          </div>
          <Input 
            label="Initial Stock Quantity" 
            type="number"
            value={formData.stock_quantity}
            onChange={(e) => setFormData({...formData, stock_quantity: e.target.value})}
          />
          <Button type="submit" className="w-full h-12 rounded-2xl" loading={isCreating}>
            Save Product
          </Button>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Product"
        size="md"
      >
        <form onSubmit={(e) => {
          e.preventDefault();
          doUpdate(editData, {
            onSuccess: () => setIsEditModalOpen(false)
          });
        }} className="space-y-6">
          {Array.isArray(branches) && branches.length > 0 && (
            <Select
              label="Branch"
              value={editData.branch_id}
              onChange={(e) => setEditData({ ...editData, branch_id: e.target.value })}
              options={[
                { label: "All Branches", value: "" },
                ...branches.map((b: any) => ({ label: b.name, value: String(b.id) }))
              ]}
            />
          )}
          <Input
            label="Product Name"
            required
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU"
              value={editData.sku}
              onChange={(e) => setEditData({ ...editData, sku: e.target.value })}
            />
            <Input
              label="Low Stock Alert"
              type="number"
              value={editData.low_stock_alert}
              onChange={(e) => setEditData({ ...editData, low_stock_alert: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Cost Price"
              type="number"
              placeholder="0.00"
              value={editData.cost_price}
              onChange={(e) => setEditData({ ...editData, cost_price: e.target.value })}
            />
            <Input
              label="Selling Price"
              type="number"
              placeholder="0.00"
              value={editData.selling_price}
              onChange={(e) => setEditData({ ...editData, selling_price: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full h-12 rounded-2xl" loading={isUpdating}>
            Update Product
          </Button>
        </form>
      </Modal>

      {/* Stock Adjustment Modal */}
      <Modal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        title={adjustmentType === 'purchase' ? 'Add Stock' : 'Stock Usage'}
        size="sm"
      >
        <form onSubmit={handleAdjustSubmit} className="space-y-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
            <p className="text-xs font-black text-slate-400 uppercase mb-1">Product</p>
            <p className="font-bold text-slate-900">{selectedProduct?.name}</p>
            <p className="text-xs text-slate-500">Current Stock: {selectedProduct?.stock_quantity}</p>
          </div>

          <div className="space-y-4">
            <Input 
              label="Quantity" 
              type="number" 
              min="1"
              value={adjustData.quantity}
              onChange={(e) => setAdjustData({...adjustData, quantity: e.target.value})}
            />
            <Select 
              label="Adjustment Reason"
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as any)}
              options={[
                { label: "Purchase (Restock)", value: "purchase" },
                { label: "Usage (In-Salon)", value: "usage" },
                { label: "Sale (Retail)", value: "sale" },
                { label: "Adjustment (Manual)", value: "adjustment" },
              ]}
            />
            <Input 
              label="Notes" 
              placeholder="Optional notes..."
              value={adjustData.notes}
              onChange={(e) => setAdjustData({...adjustData, notes: e.target.value})}
            />
          </div>

          <Button type="submit" className="w-full h-12 rounded-2xl" loading={isRecording}>
            Update Stock
          </Button>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryPage;
