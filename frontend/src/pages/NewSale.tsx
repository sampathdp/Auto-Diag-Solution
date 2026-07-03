import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, Trash2, ShoppingCart, Box, ArrowLeft,
  Search, Minus, CreditCard, Banknote,
  Smartphone, X, PackageOpen, CheckCircle2, ChevronRight,
} from "lucide-react";
import { useBilling }   from "@/hooks/useBilling";
import { useCustomers } from "@/hooks/useCustomers";
import { useInventory } from "@/hooks/useInventory";
import { useAuthStore } from "@/store/useAuthStore";
import apiClient        from "@/api/client";
import { cn }           from "@/lib/utils";

const PAY_METHODS = [
  { value: "cash",   label: "Cash",     Icon: Banknote   },
  { value: "card",   label: "Card",     Icon: CreditCard },
  { value: "online", label: "Transfer", Icon: Smartphone },
];
const ICON_COLORS = [
  "bg-violet-50 text-violet-500",
  "bg-sky-50 text-sky-500",
  "bg-rose-50 text-rose-500",
  "bg-amber-50 text-amber-500",
  "bg-teal-50 text-teal-500",
  "bg-fuchsia-50 text-fuchsia-500",
];

export default function NewSalePage() {
  const navigate       = useNavigate();
  const activeBranchId = useAuthStore(s => s.activeBranchId);
  const user           = useAuthStore(s => s.user);
  const { create }     = useBilling();
  const { list: lC }   = useCustomers();
  const { list: lP }   = useInventory();

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await apiClient.get("/branches");
      return res.data.data || [];
    },
  });

  // Auto-assign user's branch; only allow manual select when user has no fixed branch
  const userBranchId = user?.branch_id ? String(user.branch_id) : null;
  const [selectedBranchId, setSelectedBranchId] = useState(
    userBranchId ?? (activeBranchId ? String(activeBranchId) : "")
  );
  const showBranchSelector = !userBranchId && Array.isArray(branches) && branches.length > 0;

  const [customerId,   setCustomerId]   = useState("");
  const [customerName, setCustomerName] = useState("");
  const [cSearch,      setCSearch]      = useState("");
  const [showDrop,     setShowDrop]     = useState(false);
  const [cart,         setCart]         = useState<any[]>([]);
  const [pSearch,      setPSearch]      = useState("");
  const [method,       setMethod]       = useState("cash");
  const [saleType,     setSaleType]     = useState("cash");
  const [mobileTab,    setMobileTab]    = useState<"products" | "order">("products");

  const dropRef = useRef<HTMLDivElement>(null);
  const { data: customers } = lC();
  const { data: products  } = lP();
  const { mutate: save, isPending } = create();

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const filteredC = useMemo(() =>
    (customers as any[] ?? []).filter(c =>
      c.name.toLowerCase().includes(cSearch.toLowerCase()) || c.phone?.includes(cSearch)
    ), [customers, cSearch]);

  const filteredP = useMemo(() =>
    (products as any[] ?? []).filter(p =>
      p.name.toLowerCase().includes(pSearch.toLowerCase()) && p.stock_quantity > 0
    ), [products, pSearch]);

  const addToCart = (p: any) => {
    setCart(prev => {
      const ex = prev.find(c => c.product_id === p.id);
      if (ex) return prev.map(c => c.product_id === p.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { product_id: p.id, service_id: null, name: p.name, quantity: 1, price: p.selling_price }];
    });
  };

  const remove = (i: number) => setCart(prev => prev.filter((_, j) => j !== i));
  const bump   = (i: number, d: number) =>
    setCart(prev => prev.map((c, j) => j === i ? { ...c, quantity: Math.max(1, c.quantity + d) } : c));

  const total     = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const canSubmit = !!customerId && cart.length > 0;
  const initials  = (n: string) => n.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  const iconColor = (id: number) => ICON_COLORS[id % ICON_COLORS.length];

  const onSubmit = () => {
    if (!canSubmit) return;
    save({
      customer_id:    customerId,
      items:          cart,
      payment_method: saleType === "cash" ? method : null,
      is_paid:        saleType === "cash",
      branch_id:      selectedBranchId || null,
    }, { onSuccess: () => navigate("/billing") });
  };

  /* ─────────────────────────────────────────────────────
     Shared panel components (used in both desktop + mobile)
  ───────────────────────────────────────────────────── */

  const ProductsPanel = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="shrink-0 px-4 md:px-8 py-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products…"
            className="w-full pl-10 pr-9 py-3 bg-gray-100 rounded-2xl text-sm text-gray-800 font-medium placeholder:text-gray-400 border-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            value={pSearch}
            onChange={e => setPSearch(e.target.value)}
          />
          {pSearch && (
            <button onClick={() => setPSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 pb-4">
        {filteredP.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center gap-3 py-16">
            <div className="w-14 h-14 rounded-3xl bg-gray-100 flex items-center justify-center">
              <PackageOpen size={24} className="text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-gray-400">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3">
            {filteredP.map((p: any) => {
              const inCart = cart.find(c => c.product_id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={cn(
                    "group relative text-left rounded-2xl border p-3.5 transition-all duration-150 hover:shadow-md active:scale-[0.97] bg-white",
                    inCart ? "border-indigo-200 shadow-sm" : "border-gray-100 hover:border-gray-200 shadow-sm"
                  )}
                >
                  {inCart && (
                    <span className="absolute top-2.5 right-2.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {inCart.quantity}
                    </span>
                  )}
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-2.5", iconColor(p.id))}>
                    <Box size={18} />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 leading-snug mb-2 pr-4 line-clamp-2">{p.name}</p>
                  <div className="flex items-end justify-between">
                    <p className="text-sm font-bold text-gray-900 tabular-nums">
                      <span className="text-[10px] text-gray-400 font-normal mr-0.5">LKR</span>
                      {Number(p.selling_price).toLocaleString()}
                    </p>
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-lg",
                      p.stock_quantity <= 5 ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                    )}>
                      {p.stock_quantity}
                    </span>
                  </div>
                  <div className={cn(
                    "absolute bottom-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-150",
                    inCart ? "opacity-100 bg-indigo-600 text-white" : "opacity-0 group-hover:opacity-100 bg-gray-900 text-white"
                  )}>
                    <Plus size={13} strokeWidth={2.5} />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const OrderPanel = (
    <div className="flex flex-col h-full overflow-hidden bg-white md:bg-gray-50/80">

      {/* Branch */}
      {showBranchSelector && (
        <div className="shrink-0 px-4 md:px-6 pt-4 pb-3 border-b border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-2">Branch</p>
          <select
            value={selectedBranchId}
            onChange={e => setSelectedBranchId(e.target.value)}
            className="w-full pl-3 pr-8 py-2.5 bg-gray-100 border-none rounded-2xl text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
          >
            <option value="">All Branches</option>
            {branches.map((b: any) => (
              <option key={b.id} value={String(b.id)}>{b.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Customer */}
      <div className="shrink-0 px-4 md:px-6 pt-4 md:pt-6 pb-4 border-b border-gray-100" ref={dropRef}>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">Customer</p>
        {customerId ? (
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl px-3.5 py-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials(customerName)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{customerName}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <CheckCircle2 size={10} className="text-green-500" />
                <p className="text-[11px] text-green-600 font-medium">Selected</p>
              </div>
            </div>
            <button onClick={() => { setCustomerId(""); setCustomerName(""); }} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-all">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search name or phone…"
              className="w-full pl-10 pr-4 py-3 bg-gray-100 border-none rounded-2xl text-sm text-gray-800 font-medium placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              value={cSearch}
              onChange={e => { setCSearch(e.target.value); setShowDrop(true); }}
              onFocus={() => setShowDrop(true)}
            />
            {showDrop && filteredC.length > 0 && (
              <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
                {filteredC.map((c: any) => (
                  <button
                    key={c.id}
                    onMouseDown={() => { setCustomerId(c.id.toString()); setCustomerName(c.name); setCSearch(""); setShowDrop(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-bold shrink-0">
                      {initials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{c.name}</p>
                      {c.phone && <p className="text-[11px] text-gray-400">{c.phone}</p>}
                    </div>
                    <ChevronRight size={14} className="text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment */}
      <div className="shrink-0 px-4 md:px-6 py-4 border-b border-gray-100 space-y-3">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">Payment</p>
        <div className="flex bg-gray-100 rounded-xl p-0.5">
          {[{ v: "cash", l: "Paid Now" }, { v: "credit", l: "Pay Later" }].map(o => (
            <button
              key={o.v}
              onClick={() => setSaleType(o.v)}
              className={cn(
                "flex-1 py-2.5 text-xs font-semibold rounded-[10px] transition-all",
                saleType === o.v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              {o.l}
            </button>
          ))}
        </div>
        {saleType === "cash" && (
          <div className="flex bg-gray-100 rounded-xl p-0.5">
            {PAY_METHODS.map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setMethod(value)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 py-2.5 rounded-[10px] text-[11px] font-semibold transition-all",
                  method === value ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cart items */}
      <div className="flex-1 flex flex-col overflow-hidden px-4 md:px-6 pt-4">
        <div className="flex items-center justify-between mb-3 shrink-0">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
            Items {cart.length > 0 && <span className="text-indigo-500">({cart.length})</span>}
          </p>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="text-[11px] font-semibold text-gray-400 hover:text-red-500 transition-colors">
              Clear all
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 py-12 text-gray-300">
              <ShoppingCart size={32} strokeWidth={1} />
              <p className="text-sm font-medium text-gray-400">No items yet</p>
              <p className="text-xs text-gray-300">Go to Products tab to add</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="group flex items-center gap-3 bg-gray-50 rounded-2xl px-3.5 py-3 border border-gray-100 hover:border-gray-200 transition-all">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", iconColor(item.product_id))}>
                  <Box size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate mb-1.5">{item.name}</p>
                  <div className="flex items-center gap-2">
                    {/* qty */}
                    <div className="flex items-center bg-white rounded-lg border border-gray-200 overflow-hidden">
                      <button onClick={() => bump(idx, -1)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors active:bg-gray-200">
                        <Minus size={11} />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                      <button onClick={() => bump(idx, 1)} className="w-7 h-7 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors active:bg-gray-200">
                        <Plus size={11} />
                      </button>
                    </div>
                    {/* price */}
                    <div className="flex items-center gap-0.5 bg-white border border-gray-200 rounded-lg px-2 py-1">
                      <span className="text-[10px] text-gray-400">LKR</span>
                      <input
                        type="number"
                        className="w-14 text-right bg-transparent border-none text-xs font-bold text-gray-800 focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={item.price}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0;
                          setCart(prev => prev.map((c, i) => i === idx ? { ...c, price: v } : c));
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <button onClick={() => remove(idx)} className="p-1 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 size={13} />
                  </button>
                  <span className="text-xs font-bold text-gray-900 tabular-nums">
                    {(item.price * item.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Summary + CTA */}
      <div className="shrink-0 px-4 md:px-6 pb-5 pt-4 border-t border-gray-100 space-y-3 bg-white">
        {!canSubmit && (
          <div className="flex flex-wrap gap-3">
            {!customerId && (
              <span className="text-[11px] text-orange-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                Select a customer
              </span>
            )}
            {cart.length === 0 && (
              <span className="text-[11px] text-orange-500 font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />
                Add items
              </span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-500">Total</span>
          <span className="text-xl font-bold text-gray-900 tabular-nums">
            <span className="text-xs text-gray-400 font-normal mr-1">LKR</span>
            {total.toLocaleString()}
          </span>
        </div>
        <button
          onClick={onSubmit}
          disabled={!canSubmit || isPending}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold transition-all duration-150",
            canSubmit
              ? "bg-gray-900 text-white hover:bg-black shadow-lg shadow-gray-900/20 active:scale-[0.98]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          )}
        >
          {isPending ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <CheckCircle2 size={16} />
          )}
          {canSubmit ? `Complete Sale · LKR ${total.toLocaleString()}` : "Complete Sale"}
        </button>
      </div>
    </div>
  );

  /* ─────────────────────────────────────────────────────
     Render
  ───────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-screen -m-6 overflow-hidden bg-white" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif" }}>

      {/* ══ Top bar (shared) ══ */}
      <header className="shrink-0 flex items-center justify-between px-4 md:px-8 py-3.5 bg-white border-b border-gray-100 shadow-sm z-20">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => navigate("/billing")}
            className="flex items-center gap-1.5 text-indigo-600 text-sm font-semibold hover:text-indigo-700 transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={2.5} />
            <span className="hidden sm:inline">Billing</span>
          </button>
          <div className="hidden sm:block w-px h-4 bg-gray-200" />
          <h1 className="text-base md:text-xl font-bold text-gray-900 tracking-tight">New Sale</h1>
        </div>

        {/* desktop: show total chip */}
        {cart.length > 0 && (
          <div className="hidden md:flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-semibold px-3.5 py-2 rounded-full">
            <ShoppingCart size={13} />
            {cart.length} item{cart.length !== 1 ? "s" : ""} · LKR {total.toLocaleString()}
          </div>
        )}

        {/* mobile: cart badge */}
        {cart.length > 0 && (
          <button
            onClick={() => setMobileTab("order")}
            className="flex md:hidden items-center gap-2 bg-gray-900 text-white text-xs font-bold px-3.5 py-2 rounded-full active:scale-95 transition-all"
          >
            <ShoppingCart size={13} />
            {cart.length} · LKR {total.toLocaleString()}
          </button>
        )}
      </header>

      {/* ══ DESKTOP: side-by-side ══ */}
      <div className="hidden md:flex flex-1 overflow-hidden">
        {/* Left */}
        <div className="flex-1 overflow-hidden border-r border-gray-100 bg-white">
          {ProductsPanel}
        </div>
        {/* Right */}
        <div className="w-[360px] shrink-0 overflow-hidden">
          {OrderPanel}
        </div>
      </div>

      {/* ══ MOBILE: tab switcher ══ */}
      <div className="flex md:hidden flex-1 overflow-hidden flex-col">

        {/* Tab pills */}
        <div className="shrink-0 flex bg-white border-b border-gray-100 px-4 pt-3 pb-0 gap-1">
          {[
            { key: "products", label: "Products" },
            { key: "order",    label: `Order${cart.length > 0 ? ` (${cart.length})` : ""}` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setMobileTab(t.key as "products" | "order")}
              className={cn(
                "flex-1 py-2.5 text-sm font-semibold rounded-t-xl border-b-2 transition-all",
                mobileTab === t.key
                  ? "text-indigo-600 border-indigo-600"
                  : "text-gray-400 border-transparent hover:text-gray-600"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden bg-white">
          {mobileTab === "products" ? ProductsPanel : OrderPanel}
        </div>

        {/* Floating cart FAB (only on products tab, only when cart has items) */}
        {mobileTab === "products" && cart.length > 0 && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 md:hidden">
            <button
              onClick={() => setMobileTab("order")}
              className="flex items-center gap-3 bg-gray-900 text-white px-6 py-3.5 rounded-full shadow-2xl shadow-gray-900/30 font-semibold text-sm active:scale-95 transition-all"
            >
              <div className="relative">
                <ShoppingCart size={18} />
                <span className="absolute -top-2 -right-2 bg-indigo-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {cart.length}
                </span>
              </div>
              View Order · LKR {total.toLocaleString()}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
