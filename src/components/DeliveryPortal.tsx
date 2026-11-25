import { useState, useEffect } from "react";
import { Order, User } from "../types";
import { 
  Truck, Navigation, DollarSign, ClipboardCheck, Check, 
  MapPin, Phone, ShoppingBag, Award, Eye 
} from "lucide-react";

interface DeliveryPortalProps {
  user: User;
}

export default function DeliveryPortal({ user }: DeliveryPortalProps) {
  const [availableJobs, setAvailableJobs] = useState<Order[]>([]);
  const [activeJob, setActiveJob] = useState<Order | null>(null);
  const [deliveryLogs, setDeliveryLogs] = useState<Order[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  const fetchJobs = async () => {
    try {
      const res = await fetch(`/api/orders?userId=${user.id}`);
      if (res.ok) {
        const data: Order[] = await res.json();
        
        // 1. Available jobs (Ready state but unassigned)
        const openJobs = data.filter((o) => o.status === "ready" && !o.deliveryPartnerId);
        setAvailableJobs(openJobs);

        // 2. My Active Job (Assigned to me and not delivered/cancelled)
        const active = data.find((o) => o.deliveryPartnerId === user.id && o.status !== "delivered" && o.status !== "cancelled");
        setActiveJob(active || null);

        // 3. Completed logs
        const history = data.filter((o) => o.deliveryPartnerId === user.id && o.status === "delivered");
        setDeliveryLogs(history);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchJobs();
    const interval = setInterval(fetchJobs, 5000); // Poll for new live ready jobs
    return () => clearInterval(interval);
  }, []);

  const acceptJob = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "out_for_delivery",
          deliveryPartnerId: user.id,
          deliveryPartnerName: user.name
        })
      });

      if (res.ok) {
        setStatusMessage("Delivery job accepted! Navigate to the restaurant.");
        setTimeout(() => setStatusMessage(""), 4000);
        fetchJobs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markAsDelivered = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" })
      });
      if (res.ok) {
        setStatusMessage("Order marked as Delivered! Earnings added.");
        setTimeout(() => setStatusMessage(""), 4000);
        fetchJobs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Courier Stats calculations
  const totalEarnings = deliveryLogs.reduce((sum, order) => sum + order.deliveryFee, 0) + (deliveryLogs.length * 2.00); // $2 base incentive

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Earnings and Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Earnings KPI */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">Rider Shift Earnings</p>
            <p className="font-display font-extrabold text-2xl text-gray-800 mt-1">
              ${totalEarnings.toFixed(2)}
            </p>
            <p className="text-xxs text-gray-400 font-mono mt-1">
              Includes deliveries and incentives
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 border border-amber-100/50 flex items-center justify-center">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Trips Completed KPI */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">Completed Deliveries</p>
            <p className="font-display font-extrabold text-2xl text-gray-800 mt-1">
              {deliveryLogs.length}
            </p>
            <p className="text-xxs text-emerald-600 font-medium font-mono mt-1">
              100% On-Time rate
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-500 border border-emerald-100/50 flex items-center justify-center">
            <ClipboardCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Level Tracker KPI */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">Courier Grade</p>
            <p className="font-display font-extrabold text-2xl text-gray-800 mt-1 flex items-center gap-1.5">
              Gold Partner <Award className="w-5 h-5 text-amber-500" />
            </p>
            <p className="text-xxs text-gray-400 font-mono mt-1">
              Highly reviewed Courier status
            </p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-xl text-xxs font-sans flex items-center gap-2">
          <Truck className="w-4 h-4 text-emerald-600 animate-bounce" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Current Active Trip Card (Priority) */}
      {activeJob && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-gray-800 text-sm tracking-tight border-l-4 border-amber-500 pl-2">
            Active Shipment Route
          </h3>

          <div id={`active-trip-card-${activeJob.id}`} className="bg-white border-2 border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-50 pb-4">
              <div>
                <span className="bg-amber-100 text-amber-900 border border-amber-200 text-xxs font-mono font-bold px-2 py-0.5 rounded uppercase">
                  ACTIVE ON ROUTE
                </span>
                <p className="text-xxs font-mono text-gray-400 mt-1.5">
                  Order Hash: #{activeJob.id.toUpperCase().slice(0, 8)} ● Paid Value: ${activeJob.totalAmount.toFixed(2)}
                </p>
              </div>

              <button
                onClick={() => markAsDelivered(activeJob.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-display font-bold px-5 py-2.5 rounded-xl text-xs transition-shadow shadow-md shadow-emerald-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" /> Finalize Delivery (Handover)
              </button>
            </div>

            {/* Checkpoints map path details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pickup location info */}
              <div className="bg-slate-50 p-4 border rounded-xl space-y-3">
                <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pickup (Restaurant Spot)
                </p>
                <div>
                  <h4 className="font-bold text-xs text-slate-800">{activeJob.restaurantName}</h4>
                  <p className="text-xxs text-gray-400 mt-1 flex items-center gap-1 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {activeJob.restaurantName || "Wall St Terminal"}
                  </p>
                </div>
              </div>

              {/* Delivery destination info */}
              <div className="bg-rose-50/40 p-4 border border-rose-100/50 rounded-xl space-y-3">
                <p className="text-xxxxs uppercase tracking-wider font-mono text-rose-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Dropdown Destination
                </p>
                <div>
                  <h4 className="font-bold text-xs text-gray-800">{activeJob.customerName}</h4>
                  <p className="text-xxs text-gray-400 mt-1 flex items-center gap-1 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" /> {activeJob.deliveryAddress}
                  </p>
                  <p className="text-xxs text-gray-500 mt-2 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-gray-400" />
                    <span>Contact: {activeJob.customerPhone || "(555) 789-1011"}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Basket Items inside order */}
            <div>
              <p className="text-xxs font-mono text-gray-400 uppercase tracking-widest block mb-2">Checklist of items</p>
              <div className="border border-gray-50 rounded-xl p-4 divide-y divide-gray-50 bg-gray-50/20">
                {activeJob.items.map((i) => (
                  <div key={i.id} className="py-2 first:pt-0 last:pb-0 flex items-center gap-2 text-xs">
                    <ShoppingBag className="w-4 h-4 text-gray-300" />
                    <span className="font-semibold text-gray-700 min-w-[20px]">{i.quantity}x</span>
                    <span className="text-gray-600">{i.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Jobs Hub */}
      {!activeJob && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-gray-800 text-sm tracking-tight border-l-4 border-amber-500 pl-2">
            Available Deliveries Hub ({availableJobs.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableJobs.map((job) => (
              <div key={job.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="bg-slate-50 text-gray-600 font-mono text-[9px] px-2 py-0.5 rounded uppercase">
                      READY FOR COURIER
                    </span>
                    <span className="font-mono text-xs font-extrabold text-emerald-600">
                      ${job.deliveryFee.toFixed(2)} Fee
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">From</p>
                        <p className="font-bold text-xs text-gray-700 leading-tight mt-0.5">{job.restaurantName}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">To (Deliver Area)</p>
                        <p className="font-bold text-xs text-gray-700 leading-tight mt-0.5 truncate max-w-[280px]">
                          {job.deliveryAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xxs text-gray-400 border-t border-gray-50 pt-3 mt-3 leading-tight">
                    Contains: {job.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </p>
                </div>

                <button
                  onClick={() => acceptJob(job.id)}
                  className="w-full bg-slate-900 font-display font-bold hover:bg-slate-800 text-white py-2 rounded-xl text-xxs transition-colors cursor-pointer"
                >
                  Accept Delivery & Ride
                </button>
              </div>
            ))}

            {availableJobs.length === 0 && (
              <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400 text-xs">
                No tickets ready for pickup at this moment. New culinary creations show up instantly!
              </div>
            )}
          </div>
        </div>
      )}

      {/* COMPLETED JOBS LOGS */}
      {deliveryLogs.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-gray-800 text-sm tracking-tight border-l-4 border-slate-500 pl-2">
            Rider Delivery Logs ({deliveryLogs.length})
          </h3>

          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-100">
            {deliveryLogs.map((order) => (
              <div key={order.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">{order.restaurantName}</span>
                    <span className="bg-emerald-50 text-emerald-700 font-mono text-[9px] px-2 py-0.5 rounded">
                      COMPLETED
                    </span>
                  </div>
                  <p className="text-xxs text-gray-400 font-mono mt-1">
                    Order Ref: #{order.id.slice(0, 8).toUpperCase()} ● Drop Spot: {order.deliveryAddress}
                  </p>
                </div>

                <div className="text-left sm:text-right font-mono">
                  <p className="font-bold text-xs text-gray-800">+${order.deliveryFee.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">Earnings Cleared</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
