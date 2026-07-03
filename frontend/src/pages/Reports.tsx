import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { useApiQuery } from "@/hooks/useApi";
import { 
    TrendingUp, DollarSign, Users, Scissors, 
    Calendar as CalendarIcon, Download, Printer,
    BarChart3, PieChart as PieChartIcon, LineChart as LineChartIcon
} from "lucide-react";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    PieChart, Pie, Cell, LineChart, Line, Legend 
} from 'recharts';
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

const Reports = () => {
    const [dateRange, setDateRange] = useState({
        start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
        end: format(new Date(), "yyyy-MM-dd")
    });
    const [activeTab, setActiveTab] = useState<'sales' | 'profit' | 'staff' | 'services'>('sales');

    const activeBranchId = useAuthStore((state) => state.activeBranchId);
    const activeBranchName = useAuthStore((state) => state.activeBranchName);

    const branchParam = activeBranchId ? `&branch_id=${activeBranchId}` : '';

    const { data: salesReport, isLoading: isSalesLoading } = useApiQuery<any>(
        ['report-sales', dateRange, activeBranchId], 
        `/reports/sales?start_date=${dateRange.start}&end_date=${dateRange.end}${branchParam}`
    );

    const { data: plReport, isLoading: isPLLoading } = useApiQuery<any>(
        ['report-pl', dateRange, activeBranchId], 
        `/reports/profit-loss?start_date=${dateRange.start}&end_date=${dateRange.end}${branchParam}`
    );

    const { data: staffReport, isLoading: isStaffLoading } = useApiQuery<any>(
        ['report-staff', dateRange, activeBranchId], 
        `/reports/staff-performance?start_date=${dateRange.start}&end_date=${dateRange.end}${branchParam}`
    );

    const { data: serviceReport, isLoading: isServiceLoading } = useApiQuery<any>(
        ['report-services', dateRange, activeBranchId], 
        `/reports/service-analytics?start_date=${dateRange.start}&end_date=${dateRange.end}${branchParam}`
    );

    const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    const handlePrint = () => {
        window.print();
    };

    const tabs = [
        { id: 'sales', label: 'Sales & Revenue', icon: BarChart3 },
        { id: 'profit', label: 'Profit & Loss', icon: TrendingUp },
        { id: 'staff', label: 'Staff Performance', icon: Users },
        { id: 'services', label: 'Service Analytics', icon: Scissors },
    ];

    return (
        <div className="space-y-8 print:p-0">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
                <PageHeader 
                    title="Business Reports" 
                    description={`Deep insights into your salon's financial & operational performance. Focus: ${activeBranchName || "Consolidated (All Branches)"}`}
                />
                <div className="flex items-center gap-3">
                    <div className="flex bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-xs font-bold p-2 focus:ring-0"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({...prev, start: e.target.value}))}
                        />
                        <span className="self-center text-slate-300 px-1">-</span>
                        <input 
                            type="date" 
                            className="bg-transparent border-none text-xs font-bold p-2 focus:ring-0"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({...prev, end: e.target.value}))}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex overflow-x-auto gap-2 bg-slate-100 p-1 rounded-2xl print:hidden">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={cn(
                            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                            activeTab === tab.id 
                                ? "bg-white text-indigo-600 shadow-sm" 
                                : "text-slate-500 hover:bg-white/50"
                        )}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Sales Report Tab */}
            {activeTab === 'sales' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <SummaryCard title="Total Revenue" value={salesReport?.data?.total_revenue} icon={DollarSign} color="indigo" />
                        <SummaryCard title="Total Appointments" value={salesReport?.data?.by_method?.reduce((s: number, m: any) => s + m.count, 0)} icon={CalendarIcon} color="blue" />
                        <SummaryCard title="Average per Sale" value={salesReport?.data?.total_revenue / salesReport?.data?.by_method?.reduce((s: number, m: any) => s + m.count, 0)} icon={TrendingUp} color="emerald" />
                        <SummaryCard title="Payment Methods" value={salesReport?.data?.by_method?.length} icon={CreditCard} color="amber" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <ChartContainer title="Revenue Trend">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={salesReport?.data?.daily_sales}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tickFormatter={(val) => format(new Date(val), "MMM d")} tick={{fontSize: 10}} />
                                    <YAxis tick={{fontSize: 10}} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                        labelFormatter={(val) => format(new Date(val), "MMMM d, yyyy")}
                                    />
                                    <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartContainer>

                        <ChartContainer title="Revenue by Category">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={salesReport?.data?.by_category}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="total"
                                        nameKey="category"
                                    >
                                        {salesReport?.data?.by_category?.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Payment Method Breakdown</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {salesReport?.data?.by_method?.map((method: any) => (
                                <div key={method.payment_method} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{method.payment_method?.replace('_', ' ')}</p>
                                        <p className="text-lg font-black text-slate-900">LKR {Number(method.total).toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-bold text-slate-500">{method.count} Trans.</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Profit & Loss Tab */}
            {activeTab === 'profit' && (
                <div className="space-y-8 animate-in slide-in-from-bottom duration-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Income</p>
                            <p className="text-3xl font-black text-emerald-600">LKR {plReport?.data?.revenue?.toLocaleString()}</p>
                        </div>
                        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-2">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Expenses</p>
                            <p className="text-3xl font-black text-rose-600">LKR {plReport?.data?.expenses?.toLocaleString()}</p>
                        </div>
                        <div className="p-6 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-200 space-y-2">
                            <p className="text-xs font-black text-indigo-200 uppercase tracking-widest">Net Profit</p>
                            <p className="text-3xl font-black">LKR {plReport?.data?.net_profit?.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <ChartContainer title="P&L Overview">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={[
                                    { name: 'Revenue', amount: plReport?.data?.revenue, fill: '#10b981' },
                                    { name: 'Expenses', amount: plReport?.data?.expenses, fill: '#ef4444' },
                                    { name: 'Profit', amount: plReport?.data?.net_profit, fill: '#6366f1' }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip cursor={{fill: '#f8fafc'}} />
                                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                                        {[0, 1, 2].map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#ef4444' : '#6366f1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>

                        <ChartContainer title="Expense Distribution">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={plReport?.data?.expense_breakdown}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="total"
                                        nameKey="category_name"
                                    >
                                        {plReport?.data?.expense_breakdown?.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>
                </div>
            )}

            {/* Staff Performance Tab */}
            {activeTab === 'staff' && (
                <div className="space-y-6 animate-in slide-in-from-right duration-500">
                    <ChartContainer title="Revenue by Staff">
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={staffReport?.data} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" />
                                <YAxis dataKey="staff_name" type="category" width={100} />
                                <Tooltip />
                                <Bar dataKey="total_revenue" fill="#6366f1" radius={[0, 8, 8, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </ChartContainer>

                    <DataTable 
                        columns={[
                            { header: "Staff Member", accessor: "staff_name" },
                            { header: "Appointments", accessor: (item: any) => <span className="font-bold">{item.appointment_count}</span> },
                            { header: "Total Revenue", accessor: (item: any) => <span className="font-bold text-indigo-600">LKR {Number(item.total_revenue).toLocaleString()}</span> },
                            { header: "Avg. Sale", accessor: (item: any) => `LKR ${(item.total_revenue / (item.appointment_count || 1)).toLocaleString()}` },
                            { header: "Avg. Duration", accessor: (item: any) => item.avg_duration ? `${Math.round(item.avg_duration)} min` : '-' },
                        ]}
                        data={staffReport?.data || []}
                        isLoading={isStaffLoading}
                    />
                </div>
            )}

            {/* Service Analytics Tab */}
            {activeTab === 'services' && (
                <div className="space-y-6 animate-in zoom-in duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <ChartContainer title="Top Booked Services">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={serviceReport?.data?.slice(0, 10)}>
                                    <XAxis dataKey="service_name" tick={{fontSize: 8}} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="booking_count" fill="#10b981" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                        <ChartContainer title="Service Revenue">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={serviceReport?.data?.slice(0, 10)}>
                                    <XAxis dataKey="service_name" tick={{fontSize: 8}} />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="total_revenue" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartContainer>
                    </div>

                    <DataTable 
                        columns={[
                            { header: "Service Name", accessor: "service_name" },
                            { header: "Bookings", accessor: "booking_count" },
                            { header: "Total Revenue", accessor: (item: any) => <span className="font-bold text-emerald-600">LKR {Number(item.total_revenue).toLocaleString()}</span> },
                            { header: "Popularity", accessor: (item: any) => (
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className="bg-indigo-500 h-full" 
                                        style={{width: `${(item.booking_count / serviceReport?.data[0]?.booking_count) * 100}%`}}
                                    />
                                </div>
                            )},
                            { header: "Avg. Duration", accessor: (item: any) => item.avg_duration ? `${Math.round(item.avg_duration)} min` : '-' },
                        ]}
                        data={serviceReport?.data || []}
                        isLoading={isServiceLoading}
                    />
                </div>
            )}
        </div>
    );
};

// Helper Components
const SummaryCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${color}-50 text-${color}-600`}>
            <Icon size={24} />
        </div>
        <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
            <p className="text-2xl font-black text-slate-900">
                {typeof value === 'number' ? (title.includes('Revenue') || title.includes('Sale') ? `LKR ${value.toLocaleString()}` : value.toLocaleString()) : '0'}
            </p>
        </div>
    </div>
);

const ChartContainer = ({ title, children }: any) => (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{title}</h4>
        {children}
    </div>
);

const CreditCard = ({ size, className }: any) => <LineChartIcon size={size} className={className} />;

export default Reports;
