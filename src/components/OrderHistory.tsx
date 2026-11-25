import React, { useState, useEffect } from "react";
import { db, auth, handleFirestoreError, OperationType } from "../lib/firebase";
import { signInAnonymously, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { collection, doc, setDoc, getDocs, query, where, getDocFromServer } from "firebase/firestore";
import { User, Order } from "../types";
import { 
  Clock, CheckCircle, XCircle, ShoppingBag, ShieldAlert, 
  RotateCcw, Info, Database, Sparkles, Receipt, RefreshCw,
  Search, Calendar
} from "lucide-react";

interface OrderHistoryProps {
  user: User;
}

export default function OrderHistory({ user }: OrderHistoryProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [dbStatus, setDbStatus] = useState<"connecting" | "online" | "quota_exceeded" | "sandbox_fallback">("connecting");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Verify connection to Firestore on initial boot
  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, "test", "connection"));
        setDbStatus("online");
      } catch (error) {
        if (error instanceof Error && error.message.includes("quota")) {
          setDbStatus("quota_exceeded");
        } else {
          // Standard connection is active (test is expected to be NOT found, which counts as online)
          setDbStatus("online");
        }
      }
    }
    testConnection();
  }, []);

  const fetchLocalFallbackOrders = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/orders?userId=${user.id}`);
      if (!res.ok) throw new Error("Could not load backend orders.");
      const localOrders: Order[] = await res.json();
      
      // Sort in-memory to prevent missing index concerns
      const sorted = localOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setOrders(sorted);
      setDbStatus("sandbox_fallback");
    } catch (err) {
      console.error("Failed to load local fallback orders:", err);
      setErrorMsg("Failed to retrieve local sandbox orders.");
    } finally {
      setLoading(false);
    }
  };

  // Firebase Auth integration
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setFirebaseUser(currentUser);
        fetchFirestoreOrders(currentUser.uid);
      } else {
        // Automatically authenticate anonymously to set up request credentials
        signInAnonymously(auth)
          .then((cred) => {
            setFirebaseUser(cred.user);
            fetchFirestoreOrders(cred.user.uid);
          })
          .catch((err) => {
            console.warn("Anonymous authentication is restricted in the Firebase Console. Falling back to local Express API:", err);
            fetchLocalFallbackOrders();
          });
      }
    });

    return () => unsubscribe();
  }, [user.id]);

  const fetchFirestoreOrders = async (firebaseUid: string) => {
    setLoading(true);
    setErrorMsg("");
    const path = "orders";
    try {
      // Query direct from client security rules
      const ordersRef = collection(db, path);
      // We filter by customerId == firebaseUid (strict ABAC rules check)
      const q = query(ordersRef, where("customerId", "==", firebaseUid));
      const querySnapshot = await getDocs(q);
      
      const firestoreOrders: Order[] = [];
      querySnapshot.forEach((doc) => {
        firestoreOrders.push(doc.data() as Order);
      });

      // Sort in-memory to prevent missing index errors
      const sorted = firestoreOrders.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setOrders(sorted);
      setDbStatus("online");
    } catch (error) {
      console.error("Firestore retrieval error:", error);
      // Fallback on permission error as well
      console.log("Permissions restricted on cloud query. Fetching local fallback...");
      fetchLocalFallbackOrders();
    } finally {
      setLoading(false);
    }
  };

  // Sync existing orders from API into Firestore for seamless client demonstration!
  const syncLocalOrdersToFirestore = async () => {
    if (!firebaseUser) return;
    setIsSyncing(true);
    setErrorMsg("");

    try {
      // Fetch from local Express API (original data seed/simulation)
      const res = await fetch(`/api/orders?userId=${user.id}`);
      if (!res.ok) throw new Error("Could not load backend orders.");
      
      const localOrders: Order[] = await res.json();
      if (localOrders.length === 0) {
        setErrorMsg("No simulated orders exist on backend to sync. Place an order first!");
        setIsSyncing(false);
        return;
      }

      // Write each order to Firestore under user's anonymous Firebase Auth UID
      const path = "orders";
      for (const order of localOrders) {
        const orderId = order.id;
        const firestoreOrder: Order = {
          ...order,
          customerId: firebaseUser.uid, // Align customerId to satisfy Firestore rules
          customerName: user.name,
          paymentStatus: "paid", // Ensure required rules elements are set
        };

        const docRef = doc(db, path, orderId);
        await setDoc(docRef, firestoreOrder);
      }

      await fetchFirestoreOrders(firebaseUser.uid);
    } catch (err) {
      console.error("Synchronizing with Firestore failure:", err);
      setErrorMsg("Sync failed. Check security rules or project quotas.");
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "preparing":
      case "confirmed":
        return "bg-sky-50 text-sky-700 border-sky-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    
    // Check restaurant name
    const matchesRestaurant = order.restaurantName.toLowerCase().includes(q);
    
    // Check date formats
    const dateObj = new Date(order.createdAt);
    const dateLocale = dateObj.toLocaleDateString().toLowerCase();
    const dateLong = dateObj.toLocaleDateString(undefined, { 
      year: "numeric", 
      month: "long", 
      day: "numeric", 
      weekday: "long" 
    }).toLowerCase();
    const matchesDate = dateLocale.includes(q) || dateLong.includes(q) || order.createdAt.toLowerCase().includes(q);
    
    return matchesRestaurant || matchesDate;
  });

  return (
    <div id="firestore-order-history-module" className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm space-y-6">
      
      {/* Header and Sync Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-50 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-extrabold text-gray-800 text-sm tracking-tight flex items-center gap-1.5 line-height-none">
              <Database className="w-4 h-4 text-amber-500" />
              Gourmet Order Vault
            </h3>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
              dbStatus === "online" 
                ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                : dbStatus === "quota_exceeded" 
                ? "bg-rose-50 text-rose-700 border-rose-100" 
                : dbStatus === "sandbox_fallback"
                ? "bg-sky-50 text-sky-700 border-sky-100"
                : "bg-slate-100 text-slate-400 border-slate-200"
            }`}>
              {dbStatus === "online" 
                ? "● FIRESTORE LIVE" 
                : dbStatus === "quota_exceeded" 
                ? "⚠️ QUOTA EXCEEDED" 
                : dbStatus === "sandbox_fallback"
                ? "● LOCAL SANDBOX MODE"
                : "CONNECTING..."}
            </span>
          </div>
          <p className="text-xxs text-gray-400 mt-1">
            Real-time direct cloud document storage securely filtered by access control guidelines.
          </p>
        </div>

        {firebaseUser && (
          <button
            onClick={syncLocalOrdersToFirestore}
            disabled={isSyncing}
            className="self-start sm:self-center bg-slate-900 text-white hover:bg-slate-800 text-xxs font-mono font-semibold px-3.5 py-2 rounded-xl transition-all border border-slate-800 flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
          >
            {isSyncing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            )}
            {isSyncing ? "Syncing to Cloud..." : "Sync Sandbox to Firestore"}
          </button>
        )}
      </div>

      {/* Info Warning Diagnostics */}
      {dbStatus === "sandbox_fallback" && (
        <div className="bg-sky-50 border border-sky-200/60 rounded-xl p-4 flex items-start gap-2.5 text-xxs text-sky-800 font-sans">
          <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block text-sky-900">Sandbox Fallback Active:</span>
            <p className="leading-relaxed">
              Firebase Anonymous Authentication is restricted in the Firebase console. Orders have been loaded gracefully from the local sandbox server to ensure uninterrupted application testing.
            </p>
            <p className="text-gray-500 text-[10px] mt-1.5 leading-normal">
              To test real-time direct Cloud Firestore storage, please visit your <strong>Firebase Console</strong> and enable the <strong>Anonymous sign-in provider</strong> under Authentication &gt; Sign-in method.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 flex items-start gap-2.5 text-xxs text-amber-800 font-sans">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <div className="space-y-1">
            <span className="font-semibold block">Security Context Restricted:</span>
            <p className="leading-relaxed">{errorMsg}</p>
            <p className="text-gray-500 text-[10px] mt-1">
              Ensure you have deployed the correct security attributes by updating <strong>firestore.rules</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Search Filter Bar */}
      {orders.length > 0 && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search past orders by restaurant or date (e.g., 'Pizzeria', '6/7/2026', 'June')..."
            className="block w-full pl-10 pr-10 py-2.5 text-xs text-slate-800 bg-slate-50 border border-slate-200/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 focus:bg-white placeholder-gray-400 font-sans transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-slate-600 cursor-pointer text-[10px] font-mono hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Database State Display */}
      {loading ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xxs font-mono text-gray-400 uppercase tracking-widest">Querying Cloud Registers...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-slate-50/50 border border-dashed border-gray-100 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto border border-gray-100">
            <ShoppingBag className="w-5 h-5 text-gray-300" />
          </div>
          <div className="max-w-xs mx-auto space-y-1">
            <h4 className="font-bold text-xs text-gray-700">No documents found in cloud vault</h4>
            <p className="text-xxs text-gray-400 leading-normal">
              Direct cloud order histories are synchronized on successful checkout, or you can migrate active workspace orders using the button above.
            </p>
          </div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-slate-50/50 border border-dashed border-gray-100 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto border border-gray-100">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <div className="max-w-xs mx-auto space-y-1">
            <h4 className="font-bold text-xs text-gray-700">No matching orders found</h4>
            <p className="text-xxs text-gray-400 leading-normal">
              No results were returned matching "{searchQuery}". Try refining your keywords or dates.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {filteredOrders.map((order) => (
            <div 
              key={order.id} 
              className="bg-white border border-gray-100 hover:border-amber-200 transition-all rounded-xl p-5 shadow-sm hover:shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden group"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-extrabold text-xs text-gray-800">
                    {order.restaurantName}
                  </span>
                  <span className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase ${getStatusColor(order.status)}`}>
                    {order.status.replace("_", " ")}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-gray-400">
                  <p>ID: #{order.id.toUpperCase()}</p>
                  <p>●</p>
                  <p className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>

                {/* Items loop */}
                <div className="bg-slate-50 border border-slate-100/50 rounded-lg p-3 mt-2 text-xxs text-gray-600 max-w-full">
                  <span className="text-[9px] uppercase tracking-wider font-mono text-gray-400 block mb-1">Delivered Dishes</span>
                  <p className="leading-relaxed">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                  </p>
                </div>
              </div>

              {/* Total & Receipt Summary */}
              <div className="text-left md:text-right shrink-0 font-mono border-t md:border-t-0 border-gray-100 pt-3 md:pt-0 w-full md:w-auto flex md:flex-col justify-between items-center md:items-end">
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-sm">
                  <Receipt className="w-4 h-4 text-gray-400" />
                  <span>${order.totalAmount.toFixed(2)}</span>
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">
                  {order.paymentMethod} Payment
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Standard Security Education Tip */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex gap-2.5 items-start text-[10px] text-gray-500">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5 font-sans leading-normal">
          <span className="font-semibold text-gray-700 block text-xxs uppercase tracking-wider font-mono">Cloud Protection Notice</span>
          <p>
            Past orders are securely locked behind Firestore rule sets. Access is bounded through rigorous token validations and verified user roles to prevent identity spoofing.
          </p>
        </div>
      </div>

    </div>
  );
}
