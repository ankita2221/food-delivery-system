import { useState, useEffect } from "react";
import { Order, Restaurant, User } from "../types";
import { 
  TrendingUp, HelpCircle, Activity, Play, Star, Plus, 
  MapPin, DollarSign, Store, ClipboardList, Check 
} from "lucide-react";

export default function AdminPortal() {
  const [stats, setStats] = useState({
    revenue: 0,
    totalOrders: 0,
    activeRestaurantsCount: 0,
    driversCount: 0,
  });

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchAdminDetails = async () => {
    try {
      // 1. Fetch Stats
      const statsRes = await fetch("/api/admin/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats({
          revenue: statsData.revenue,
          totalOrders: statsData.totalOrders,
          activeRestaurantsCount: statsData.activeRestaurantsCount,
          driversCount: statsData.driversCount
        });
        setOrders(statsData.ordersHistoryList || []);
      }

      // 2. Fetch Restaurants
      const restRes = await fetch("/api/restaurants");
      if (restRes.ok) {
        setRestaurants(await restRes.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAdminDetails();
    const interval = setInterval(fetchAdminDetails, 6000); // Poll administrative metrics
    return () => clearInterval(interval);
  }, []);

  const toggleRestaurantActive = async (restaurantId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      if (res.ok) {
        setSuccessMessage("Restaurant activation state toggled!");
        setTimeout(() => setSuccessMessage(""), 3000);
        fetchAdminDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Custom visual simulation vectors for the SVG revenue trends chart
  // Draw a smooth line chart across 6 sample days
  const chartDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const revenueTrendValues = [120, 240, 180, 410, 320, stats.revenue > 0 ? Math.round(stats.revenue) : 480, stats.revenue + 150];
  
  // Calculate SVG line path string safely
  const maxVal = Math.max(...revenueTrendValues, 500);
  const points = chartDays.map((day, idx) => {
    const x = 30 + (idx * 60);
    const y = 140 - ((revenueTrendValues[idx] / maxVal) * 110);
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Widget */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">Total Revenue Placed</p>
            <p className="font-display font-extrabold text-2xl text-gray-800 mt-1">
              ${stats.revenue.toFixed(2)}
            </p>
            <p className="text-xxs text-amber-500 font-medium font-mono mt-1">
              Includes processing/delivery
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-500 border border-amber-100/50 flex items-center justify-center">
            <DollarSign className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Total Orders Placed */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">Total System Tickets</p>
            <p className="font-display font-extrabold text-2xl text-gray-800 mt-1">
              {stats.totalOrders}
            </p>
            <p className="text-xxs text-emerald-600 font-medium font-mono mt-1">
              +15.4% week over week
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-100/50 flex items-center justify-center">
            <ClipboardList className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Approved Restaurants count */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">Kitchen partners list</p>
            <p className="font-display font-extrabold text-2xl text-gray-800 mt-1">
              {restaurants.length}
            </p>
            <p className="text-xxs text-gray-400 font-mono mt-1">
              {restaurants.filter(r => r.isActive).length} currently active
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-500 border border-blue-100/50 flex items-center justify-center">
            <Store className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* Courier dispatch count */}
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">Registered Ryders</p>
            <p className="font-display font-extrabold text-2xl text-gray-800 mt-1">
              {stats.driversCount}
            </p>
            <p className="text-xxs text-gray-400 font-mono mt-1">
              Active couriers on duty
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-500 border border-purple-100/50 flex items-center justify-center">
            <Activity className="w-5.5 h-5.5" />
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-2.5 rounded-xl text-xxs font-sans flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Analytics Chart & Activity Panel row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Line Chart Visual */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div>
            <h3 className="font-display font-semibold text-gray-800 text-xs">Platform Earnings Volume Trends</h3>
            <p className="text-xxs text-gray-400 mt-0.5">Custom localized vector timeline metrics visualization</p>
          </div>

          <div className="relative bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-center">
            <svg viewBox="0 0 420 160" className="w-full h-44 drop-shadow-sm">
              {/* Grid Lines */}
              <line x1="30" y1="30" x2="400" y2="30" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="85" x2="400" y2="85" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="140" x2="400" y2="140" stroke="#e2e8f0" strokeWidth="1" />

              {/* Gradient def */}
              <defs>
                <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area under the line */}
              <path
                d={`M 30,140 L ${points} L 390,140 Z`}
                fill="url(#chartGrad)"
              />

              {/* Smooth trend curve line */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Nodes and Dots labels */}
              {revenueTrendValues.map((val, idx) => {
                const cx = 30 + (idx * 60);
                const cy = 140 - ((val / maxVal) * 110);
                return (
                  <g key={idx}>
                    <circle cx={cx} cy={cy} r="3.5" fill="#ffffff" stroke="#f59e0b" strokeWidth="2" />
                    <text x={cx} y={cy - 8} textAnchor="middle" fontSize="7" fontFamily="monospace" fill="#78350f" fontWeight="bold">
                      ${val}
                    </text>
                    <text x={cx} y="152" textAnchor="middle" fontSize="8" fontFamily="sans-serif" fill="#94a3b8">
                      {chartDays[idx]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Platform Status sidebar feed of Active orders */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-display font-semibold text-gray-800 text-xs">Live System Traffic Monitor</h3>

          <div className="divide-y divide-gray-50 overflow-y-auto max-h-72 pr-1">
            {orders.map((o) => (
              <div key={o.id} className="py-3 first:pt-0 last:pb-0 font-sans space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xxs font-semibold text-gray-800">
                    Order #{o.id.toUpperCase().slice(0, 5)}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                    o.status === "delivered" ? "bg-emerald-50 text-emerald-700 font-bold" :
                    o.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800 animate-pulse"
                  }`}>
                    {o.status.replace("_", " ")}
                  </span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono">
                  <span>Merchant: {o.restaurantName}</span>
                  <span className="font-bold text-gray-800">${o.totalAmount.toFixed(2)}</span>
                </div>

                {o.deliveryPartnerName && (
                  <p className="text-xxxxs font-mono text-gray-400 uppercase tracking-widest">
                    Courier assigned: {o.deliveryPartnerName}
                  </p>
                )}
              </div>
            ))}

            {orders.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-xxs">
                No orders registered in platform memory history yet. Place some checkout orders!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Directory management of Partners */}
      <div className="space-y-4">
        <h3 className="font-display font-semibold text-gray-800 text-sm tracking-tight border-l-4 border-amber-500 pl-2">
          Partner Restaurants Supervision Directory ({restaurants.length})
        </h3>

        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xxs text-gray-400 font-mono uppercase tracking-wider">
                  <th className="p-4">Restaurant Detail</th>
                  <th className="p-4">Physical Address</th>
                  <th className="p-4">Standard Delivery Specs</th>
                  <th className="p-4">Reputation Score</th>
                  <th className="p-4 text-right">Approval Switch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {restaurants.map((rest) => (
                  <tr key={rest.id} className="hover:bg-slate-50/20">
                    <td className="p-4 font-semibold text-gray-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded overflow-hidden shrink-0 bg-gray-50 border">
                          <img src={rest.image} alt={rest.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{rest.name}</div>
                          <div className="text-xxxxs uppercase tracking-wider font-mono text-amber-500 mt-0.5">{rest.cuisine}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xxs font-mono text-gray-500">{rest.address}</td>
                    <td className="p-4">
                      <span className="font-mono text-xxs text-gray-600 bg-slate-100 px-2 py-0.5 rounded mr-1">
                        ${rest.deliveryFee} fee
                      </span>
                      <span className="font-sans text-xxs text-gray-400">{rest.deliveryTime}</span>
                    </td>
                    <td className="p-4 font-mono font-bold text-xxs flex items-center gap-1.5 mt-2 text-amber-600">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      {rest.rating.toFixed(1)} <span className="text-gray-400 font-normal">({rest.reviewsCount})</span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => toggleRestaurantActive(rest.id, rest.isActive)}
                        className={`text-xxxxs font-bold uppercase tracking-wider border rounded px-2.5 py-1 cursor-pointer transition-colors ${
                          rest.isActive
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                            : "bg-red-50 border-red-200 text-red-800 hover:bg-red-100"
                        }`}
                      >
                        {rest.isActive ? "Approved / Active" : "Suspended / Off"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
