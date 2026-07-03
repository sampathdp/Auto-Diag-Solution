import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Plus, Scissors, Clock, Tag, Settings2, Trash2, Edit2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useServices } from "@/hooks/useServices";
import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ServiceSchema, ServiceFormValues, CategorySchema, CategoryFormValues } from "@/schemas/ServiceSchema";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

const ServicesPage = () => {
  const { list, categories: getCategories, create, update, remove, createCategory, updateCategory, removeCategory } = useServices();
  const { data: services, isLoading } = list();
  const { data: categories } = getCategories();

  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<number | null>(null);
  const [categorySearch, setCategorySearch] = useState('');

  const { mutate: doCreate, isPending: isCreating } = create();
  const { mutate: doUpdate, isPending: isUpdating } = update(editingService?.id);
  const { mutate: doRemove } = remove();
  
  const { mutate: doCreateCat, isPending: isCreatingCat } = createCategory();
  const { mutate: doUpdateCat, isPending: isUpdatingCat } = updateCategory(editingCategory?.id);
  const { mutate: doRemoveCat } = removeCategory();

  const serviceForm = useForm<ServiceFormValues>({
    resolver: zodResolver(ServiceSchema),
    defaultValues: { is_active: true }
  });

  const categoryForm = useForm<CategoryFormValues>({
    resolver: zodResolver(CategorySchema)
  });

  const onServiceSubmit = (values: ServiceFormValues) => {
    if (editingService) {
      doUpdate(values, { onSuccess: () => { setIsServiceModalOpen(false); setEditingService(null); } });
    } else {
      doCreate(values, { onSuccess: () => { setIsServiceModalOpen(false); serviceForm.reset(); } });
    }
  };

  const onCategorySubmit = (values: CategoryFormValues) => {
    if (editingCategory) {
      doUpdateCat(values, { onSuccess: () => setEditingCategory(null) });
    } else {
      doCreateCat(values, { onSuccess: () => categoryForm.reset() });
    }
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    serviceForm.reset({
      name: service.name,
      category_id: service.category_id,
      duration_minutes: service.duration_minutes,
      price: service.price,
      description: service.description || "",
      is_active: Number(service.is_active) === 1
    });
    setIsServiceModalOpen(true);
  };

  const columns = [
    { header: "Service Name", accessor: (item: any) => (
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <Scissors size={18} />
        </div>
        <div>
          <p className="font-bold text-slate-900">{item.name}</p>
          <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{item.category_name || "Uncategorized"}</p>
        </div>
      </div>
    )},
    { header: "Price", accessor: (item: any) => (
      <div className="font-bold text-slate-700">
        {Number(item.price) === 0
          ? <span className="text-emerald-600 text-xs font-black uppercase tracking-wider">Free</span>
          : `LKR ${Number(item.price).toLocaleString()}`}
      </div>
    )},
    { header: "Duration", accessor: (item: any) => (
      <div className="flex items-center text-slate-500 text-sm">
        <Clock size={14} className="mr-1.5 text-slate-400" />
        {item.duration_minutes} mins
      </div>
    )},
    { header: "Status", accessor: (item: any) => (
      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
        Number(item.is_active) === 1 ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
      }`}>
        {Number(item.is_active) === 1 ? "Active" : "Inactive"}
      </span>
    )},
    { header: "Actions", accessor: (item: any) => (
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" className="h-8" onClick={() => handleEditService(item)}>Edit</Button>
        <Button variant="ghost" size="sm" className="h-8 text-rose-500" onClick={() => { setServiceToDelete(item.id); setIsDeleteConfirmOpen(true); }}>
          <Trash2 size={14} />
        </Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Service Menu" 
        description="Configure your salon's service catalog, pricing, and appointment durations."
        action={
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={() => setIsCategoryModalOpen(true)}>
              <Tag size={18} className="mr-2" />
              Categories
            </Button>
            <Button onClick={() => { setEditingService(null); serviceForm.reset({ is_active: true }); setIsServiceModalOpen(true); }}>
              <Plus size={18} className="mr-2" />
              Add Service
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Scissors size={24} /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Services</p>
            <p className="text-2xl font-black text-slate-900">{services?.length || 0}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Tag size={24} /></div>
          <div>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Categories</p>
            <p className="text-2xl font-black text-slate-900">{categories?.length || 0}</p>
          </div>
        </div>
      </div>

      <DataTable 
        columns={columns} 
        data={services || []} 
        isLoading={isLoading}
        emptyMessage="Your service menu is currently empty."
      />

      {/* Service Modal */}
      <Modal 
        isOpen={isServiceModalOpen} 
        onClose={() => setIsServiceModalOpen(false)} 
        title={editingService ? "Edit Service" : "Add New Service"}
      >
        <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-4">
          <Input 
            label="Service Name" 
            {...serviceForm.register("name")} 
            error={serviceForm.formState.errors.name?.message} 
            placeholder="e.g. Haircut & Styling"
          />
          
          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Category" 
              {...serviceForm.register("category_id")} 
              error={serviceForm.formState.errors.category_id?.message}
            >
              <option value="">Uncategorized</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </Select>

            <Input 
              label="Price (LKR)" 
              type="number" 
              {...serviceForm.register("price")} 
              error={serviceForm.formState.errors.price?.message} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Duration (Minutes)" 
              type="number" 
              {...serviceForm.register("duration_minutes")} 
              error={serviceForm.formState.errors.duration_minutes?.message} 
            />
            
            <div className="flex flex-col">
              <label className="text-sm font-bold text-slate-700 mb-2">Status</label>
              <div className="flex items-center space-x-2 mt-2">
                <input type="checkbox" {...serviceForm.register("is_active")} className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                <span className="text-sm font-medium text-slate-600">Active and visible to customers</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <Button variant="ghost" type="button" onClick={() => setIsServiceModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={isCreating || isUpdating}>
              {editingService ? "Update Service" : "Add Service"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Management Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => { setIsCategoryModalOpen(false); setCategorySearch(''); setEditingCategory(null); categoryForm.reset(); }}
        title="Manage Categories"
      >
        {(() => {
          const filtered = (categories || []).filter((c: any) =>
            c.name.toLowerCase().includes(categorySearch.toLowerCase())
          );
          return (
            <div className="space-y-4">
              {/* Add / Edit form */}
              <form onSubmit={categoryForm.handleSubmit(onCategorySubmit)} className={cn(
                "flex items-end gap-3 p-4 rounded-2xl border transition-colors",
                editingCategory ? "bg-indigo-50 border-indigo-200" : "bg-slate-50 border-slate-100"
              )}>
                <div className="flex-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
                    {editingCategory ? `Editing — ${editingCategory.name}` : "New Category"}
                  </label>
                  <input
                    {...categoryForm.register("name")}
                    placeholder="e.g. Hair Care"
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all"
                  />
                  {categoryForm.formState.errors.name && (
                    <p className="text-xs text-rose-500 mt-1">{categoryForm.formState.errors.name.message}</p>
                  )}
                </div>
                <Button type="submit" loading={isCreatingCat || isUpdatingCat} className="h-10 px-5">
                  {editingCategory ? "Update" : "Add"}
                </Button>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => { setEditingCategory(null); categoryForm.reset(); }}
                    className="h-10 px-3 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors text-sm font-bold"
                  >
                    Cancel
                  </button>
                )}
              </form>

              {/* Search + count */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search categories..."
                    value={categorySearch}
                    onChange={e => setCategorySearch(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/10 focus:bg-white transition-all"
                  />
                  {categorySearch && (
                    <button onClick={() => setCategorySearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X size={13} />
                    </button>
                  )}
                </div>
                <span className="text-xs font-bold text-slate-400 whitespace-nowrap flex-shrink-0">
                  {filtered.length} / {categories?.length || 0}
                </span>
              </div>

              {/* List */}
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-sm">
                    {categorySearch
                      ? <>No categories match "<span className="font-semibold">{categorySearch}</span>"</>
                      : "No categories yet. Add one above."}
                  </div>
                ) : filtered.map((cat: any) => (
                  <div
                    key={cat.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
                      editingCategory?.id === cat.id
                        ? "border-indigo-200 bg-indigo-50"
                        : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full flex-shrink-0",
                        editingCategory?.id === cat.id ? "bg-indigo-400" : "bg-slate-300"
                      )} />
                      <span className="font-bold text-slate-800 text-sm">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => { setEditingCategory(cat); categoryForm.reset({ name: cat.name }); }}
                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => doRemoveCat(cat.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>

      <ConfirmModal 
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={() => { if (serviceToDelete) { doRemove(serviceToDelete, { onSuccess: () => setIsDeleteConfirmOpen(false) }); } }}
        title="Remove Service"
        description="Are you sure you want to remove this service? This action cannot be undone."
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
};

export default ServicesPage;
