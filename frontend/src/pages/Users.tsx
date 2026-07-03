import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { Plus, UserPlus, Shield, UserX, UserCheck } from "lucide-react";
import { useUsers } from "@/hooks/useUsers";

const UsersPage = () => {
  const { list } = useUsers();
  const { data: users, isLoading } = list();

  const columns = [
    { header: "User", accessor: (item: any) => (
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
          {item.name[0]}
        </div>
        <div>
          <p className="font-bold text-slate-900">{item.name}</p>
          <p className="text-xs text-slate-500">{item.email}</p>
        </div>
      </div>
    )},
    { header: "Role", accessor: (item: any) => (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
        <Shield size={12} className="mr-1" />
        {item.role}
      </span>
    )},
    { header: "Status", accessor: (item: any) => (
      <div className="flex items-center">
        {item.is_active ? (
          <span className="flex items-center text-emerald-600 text-xs font-medium">
            <UserCheck size={14} className="mr-1" /> Active
          </span>
        ) : (
          <span className="flex items-center text-slate-400 text-xs font-medium">
            <UserX size={14} className="mr-1" /> Deactivated
          </span>
        )}
      </div>
    )},
    { header: "Actions", accessor: (item: any) => (
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm">Edit</Button>
        <Button variant="ghost" size="sm" className="text-indigo-600">Permissions</Button>
      </div>
    )},
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="User Management" 
        description="Manage salon administrators, managers, and staff access levels."
        action={
          <Button>
            <UserPlus size={18} className="mr-2" />
            Add User
          </Button>
        }
      />

      <DataTable 
        columns={columns} 
        data={users || []} 
        isLoading={isLoading}
        emptyMessage="No users found for this salon."
      />
    </div>
  );
};

export default UsersPage;
