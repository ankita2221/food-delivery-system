import React from "react";
import { Order, OrderStatus } from "../types";
import { Clock, MapPin, Navigation, CheckCircle2, AlertCircle, ShoppingBag, ChefHat, Truck } from "lucide-react";

interface LiveTrackerProps {
  order: Order;
  key?: string;
}

export default function LiveTracker({ order }: LiveTrackerProps) {
  const steps: { status: OrderStatus; label: string; icon: any; color: string }[] = [
    { status: "pending", label: "Paid & Placed", icon: ShoppingBag, color: "bg-amber-500" },
    { status: "confirmed", label: "Confirmed", icon: CheckCircle2, color: "bg-blue-500" },
    { status: "preparing", label: "Kitchen Prep", icon: ChefHat, color: "bg-indigo-500" },
    { status: "ready", label: "Ready to Go", icon: AlertCircle, color: "bg-purple-500" },
    { status: "out_for_delivery", label: "In Transit", icon: Truck, color: "bg-amber-600" },
    { status: "delivered", label: "Arrived", icon: CheckCircle2, color: "bg-emerald-600" },
  ];

  const getStepIndex = (status: OrderStatus) => {
    const idx = steps.findIndex((s) => s.status === status);
    return idx === -1 ? 0 : idx;
  };

  const currentStepIndex = getStepIndex(order.status);

  // Simple formula to estimate minutes left based on state
  const getETA = (status: OrderStatus) => {
    switch (status) {
      case "pending": return "25-35 mins";
      case "confirmed": return "20-30 mins";
      case "preparing": return "15-20 mins";
      case "ready": return "10-15 mins";
      case "out_for_delivery": return "5-10 mins";
      case "delivered": return "Delivered";
      case "cancelled": return "Cancelled";
      default: return "30 mins";
    }
  };

  // Determine positions on visual map
  // Restaurant: left, Home: right.
  // We can calculate x percentage based on deliveryCoords or raw state
  const getScooterXPercent = () => {
    if (order.status === "delivered") return 100;
    if (order.status !== "out_for_delivery") return 0;
    if (!order.deliveryCoords) return 50;

    // Use a linear approximation of lat/lng shift for visual position
    // Rest is around { lat: 40.71, lng: -74.00 }
    // User is around { lat: 40.748, lng: -73.985 }
    // We can map coordinates between these ranges
    const minLat = 40.7085;
    const maxLat = 40.7484;
    const currentLat = order.deliveryCoords.lat;
    
    const pct = ((currentLat - minLat) / (maxLat - minLat)) * 100;
    return Math.min(Math.max(Math.round(pct), 10), 90); // constraint to road line
  };

  const scooterPos = getScooterXPercent();

  return (
    <div id={`live-tracker-${order.id}`} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="font-display font-semibold text-gray-800 text-base">
              Tracking Order #{order.id.slice(0, 8).toUpperCase()}
            </h3>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            From <span className="font-medium text-gray-600">{order.restaurantName}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-xl border border-amber-100/50">
            <Clock className="w-4 h-4" />
            <div>
              <p className="text-xxxxs uppercase tracking-wider font-mono text-amber-500">
                Estimated Delivery
              </p>
              <p className="font-semibold text-xs leading-none mt-0.5">
                {getETA(order.status)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {steps.map((step, idx) => {
          const isDone = idx <= currentStepIndex;
          const isCurrent = idx === currentStepIndex;
          const Icon = step.icon;

          return (
            <div
              key={step.status}
              className={`relative flex flex-col items-center text-center p-3 rounded-xl border transition-all ${
                isCurrent
                  ? "bg-amber-50/40 border-amber-500/40 ring-1 ring-amber-500/20"
                  : isDone
                  ? "bg-slate-50/50 border-gray-100"
                  : "bg-transparent border-gray-50 opacity-40"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white mb-2 shadow-sm ${
                  isDone ? step.color : "bg-gray-200"
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <p className="font-medium text-[11px] text-gray-800 leading-tight">
                {step.label}
              </p>
              {isCurrent && (
                <span className="absolute top-1 right-2 text-xxs font-mono text-amber-600 font-medium tracking-wide">
                  LIVE
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Simulated GPS Map visual */}
      <div className="relative bg-slate-900 border border-slate-950 rounded-2xl h-44 overflow-hidden mb-6 p-4">
        {/* Stylized background blueprints map grid */}
        <div className="absolute inset-0 bg-grid-slate-800 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] opacity-25" />
        
        {/* Compass card details */}
        <div className="absolute top-3 left-3 bg-slate-800/80 backdrop-blur-md px-2 py-1 rounded text-xxxxs text-slate-300 font-mono tracking-widest uppercase border border-slate-700/50">
          GPS TELEMETRY ACTIVE
        </div>

        {/* The Transit Delivery Path */}
        <div className="absolute inset-x-12 top-24 h-1.5 bg-slate-800 rounded-full">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-1000"
            style={{ width: `${order.status === "delivered" ? 100 : order.status === "out_for_delivery" ? scooterPos : 0}%` }}
          />
        </div>

        {/* Restaurant Point */}
        <div className="absolute left-6 top-20 flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-amber-500 flex items-center justify-center shadow-lg">
            <ChefHat className="w-5 h-5 text-amber-400" />
          </div>
          <span className="text-xxs font-display font-medium text-slate-300 mt-1.5">
            {order.restaurantName.split(" ")[0]}
          </span>
        </div>

        {/* Customer Location PIN */}
        <div className="absolute right-6 top-20 flex flex-col items-center">
          <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-rose-500 flex items-center justify-center shadow-lg">
            <MapPin className="w-5 h-5 text-rose-500" />
          </div>
          <span className="text-xxs font-display font-medium text-slate-300 mt-1.5">
            Your Home
          </span>
        </div>

        {/* The Moving Rider Scooter */}
        {(order.status === "out_for_delivery" || order.status === "delivered") && (
          <div
            className="absolute top-[72px] -ml-6 flex flex-col items-center transition-all duration-1000 ease-out"
            style={{ left: `calc(24px + (${scooterPos}% * 0.8))` }} // scaling within bounds
          >
            <div className="relative bg-amber-500 text-slate-900 w-11 h-11 rounded-full flex items-center justify-center shadow-lg animate-bounce border-2 border-slate-900">
              <Truck className="w-5 h-5" />
              {/* Ping sonar wave effect */}
              {order.status === "out_for_delivery" && (
                <span className="absolute -inset-1 rounded-full border-2 border-amber-500 animate-ping opacity-45" />
              )}
            </div>
            <span className="text-xxs font-mono font-bold text-amber-400 mt-1 whitespace-nowrap bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
              {order.deliveryPartnerName ? order.deliveryPartnerName.split(" ")[0] : "Driver"}
            </span>
          </div>
        )}

        {/* Waiting Indicator */}
        {order.status !== "out_for_delivery" && order.status !== "delivered" && (
          <div className="absolute inset-x-0 bottom-4 text-center">
            <p className="text-xxs text-amber-400/80 font-mono tracking-wide animate-pulse">
              ● Waiting for food preparation to complete...
            </p>
          </div>
        )}
      </div>

      <div className="bg-slate-50 border border-slate-100/50 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">
              Delivery Address
            </p>
            <p className="text-xs text-gray-700 mt-0.5 font-medium leading-tight">
              {order.deliveryAddress}
            </p>
          </div>
        </div>

        {order.deliveryPartnerName && (
          <div className="text-right">
            <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">
              Courier Partner
            </p>
            <p className="text-xs font-semibold text-gray-800 mt-0.5 leading-none">
              {order.deliveryPartnerName}
            </p>
            <p className="text-xxs text-slate-500">{order.customerPhone || "(555) 789-1011"}</p>
          </div>
        )}
      </div>
    </div>
  );
}
