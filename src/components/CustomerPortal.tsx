import React, { useState, useEffect } from "react";
import { Restaurant, MenuItem, Order, Review, User } from "../types";
import LiveTracker from "./LiveTracker";
import OrderHistory from "./OrderHistory";
import { db, auth } from "../lib/firebase";
import { signInAnonymously } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { 
  Search, ShieldCheck, ShoppingCart, Star, Clock, AlertTriangle, 
  MapPin, X, Plus, Minus, CreditCard, RotateCcw, ThumbsUp, Send 
} from "lucide-react";

interface CustomerPortalProps {
  user: User;
}

export default function CustomerPortal({ user }: CustomerPortalProps) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRest, setSelectedRest] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState<string>("All");
  
  // Checkout & Tracking
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "payment">("cart");
  const [deliveryAddress, setDeliveryAddress] = useState(user.address || "");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [paymentDetails, setPaymentDetails] = useState({ cardNumber: "", cardName: "", expiry: "", cvv: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Orders and reviews
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);
  const [restReviews, setRestReviews] = useState<Review[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    fetchRestaurants();
    fetchOrders();
  }, [user.id]);

  useEffect(() => {
    if (selectedRest) {
      fetchMenuAndReviews(selectedRest.id);
    }
  }, [selectedRest]);

  const fetchRestaurants = async () => {
    try {
      const res = await fetch("/api/restaurants");
      if (res.ok) {
        const data = await res.json();
        setRestaurants(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?userId=${user.id}`);
      if (res.ok) {
        const data: Order[] = await res.json();
        // Separate active and completed
        setActiveOrders(data.filter((o) => o.status !== "delivered" && o.status !== "cancelled"));
        setOrderHistory(data.filter((o) => o.status === "delivered" || o.status === "cancelled"));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMenuAndReviews = async (restaurantId: string) => {
    try {
      const [menuRes, reviewsRes] = await Promise.all([
        fetch(`/api/restaurants/${restaurantId}/menu`),
        fetch(`/api/reviews/${restaurantId}`)
      ]);
      if (menuRes.ok) setMenuItems(await menuRes.json());
      if (reviewsRes.ok) setRestReviews(await reviewsRes.json());
    } catch (err) {
      console.error(err);
    }
  };

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const getCartTotals = () => {
    const subtotal = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);
    const deliveryFee = selectedRest ? selectedRest.deliveryFee : 0;
    return {
      subtotal,
      deliveryFee,
      total: subtotal + deliveryFee
    };
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRest) return;
    setErrorMessage("");

    if (paymentMethod === "card") {
      const { cardNumber, cardName, expiry, cvv } = paymentDetails;
      if (!cardNumber || !cardName || !expiry || !cvv) {
        setErrorMessage("Please complete all credit card information securely.");
        return;
      }
      if (cardNumber.replace(/\s+/g, "").length < 15) {
        setErrorMessage("Please input a valid debit or credit card number.");
        return;
      }
    }

    if (!deliveryAddress.trim()) {
      setErrorMessage("Please supply a valid delivery dispatch address.");
      return;
    }

    setIsProcessing(true);

    try {
      const totals = getCartTotals();
      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: user.id,
          restaurantId: selectedRest.id,
          deliveryAddress,
          paymentMethod,
          paymentDetails,
          deliveryFee: totals.deliveryFee,
          totalAmount: totals.total,
          items: cart.map((c) => ({
            id: c.item.id,
            name: c.item.name,
            price: c.item.price,
            quantity: c.quantity
          }))
        })
      });

      if (res.ok) {
        try {
          const checkedOutOrder = await res.json();
          const firebaseUid = auth.currentUser?.uid || user.id;
          const firestoreOrder = {
            ...checkedOutOrder,
            customerId: firebaseUid
          };
          await setDoc(doc(db, "orders", checkedOutOrder.id), firestoreOrder);
        } catch (fErr) {
          console.error("Direct Firestore checkout sync omitted or failed:", fErr);
        }

        setCart([]);
        setIsCartOpen(false);
        setCheckoutStep("cart");
        setSelectedRest(null);
        fetchOrders();
      } else {
        const errorData = await res.json();
        setErrorMessage(errorData.error || "A payment processing failure occurred.");
      }
    } catch (err) {
      setErrorMessage("Network error during checkout.");
    } finally {
      setIsProcessing(false);
    }
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRest) return;

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: selectedRest.id,
          customerId: user.id,
          customerName: user.name,
          rating: newReview.rating,
          comment: newReview.comment
        })
      });

      if (res.ok) {
        setNewReview({ rating: 5, comment: "" });
        setShowReviewForm(false);
        fetchMenuAndReviews(selectedRest.id);
        fetchRestaurants(); // Refresh main rating
      }
    } catch (err) {
      console.error(err);
    }
  };

  const cuisines = ["All", ...Array.from(new Set(restaurants.map((r) => r.cuisine.split(",")[0].trim())))];

  // Filtering Restaurants
  const filteredRestaurants = restaurants.filter((r) => {
    const matchesCuisine = selectedCuisine === "All" || r.cuisine.includes(selectedCuisine);
    const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.cuisine.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCuisine && matchesSearch && r.isActive;
  });

  return (
    <div className="space-y-8">
      {/* Search and Filters Strip */}
      {!selectedRest && (
        <div id="restaurant-search-strip" className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-gray-800 text-lg leading-tight">
                Satisfy Your Cravings
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Discover the best gourmet kitchens deliverable directly to your door.
              </p>
            </div>

            <div className="relative w-full md:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food, kitchens, cuisines..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-shadow outline-none"
              />
            </div>
          </div>

          {/* Cuisine Filters */}
          <div className="flex flex-wrap items-center gap-2 mt-6 overflow-x-auto pb-1">
            {cuisines.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCuisine(c)}
                className={`px-3 py-1.5 rounded-xl text-xxs font-medium transition-colors cursor-pointer ${
                  selectedCuisine === c
                    ? "bg-amber-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Trackers Area */}
      {activeOrders.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-display font-semibold text-gray-800 text-sm tracking-tight">
            Live Deliveries ({activeOrders.length})
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {activeOrders.map((order) => (
              <LiveTracker key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      {/* Main Browsing Content */}
      {!selectedRest ? (
        <div id="restaurants-catalog" className="space-y-6">
          <h3 className="font-display font-semibold text-gray-800 text-sm tracking-tight border-l-4 border-amber-500 pl-2">
            Available Restaurants ({filteredRestaurants.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRestaurants.map((rest) => (
              <div
                key={rest.id}
                onClick={() => {
                  setSelectedRest(rest);
                  // Auto empty cart if selecting another restaurant
                  setCart([]);
                }}
                className="group bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col h-full"
              >
                <div className="relative h-44 overflow-hidden bg-gray-50">
                  <img
                    src={rest.image}
                    alt={rest.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xxs font-bold text-gray-800 flex items-center gap-1 shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    {rest.rating.toFixed(1)}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-display font-bold text-gray-800 text-sm group-hover:text-amber-500 transition-colors">
                      {rest.name}
                    </h4>
                    <p className="text-xxs text-gray-400 mt-1 leading-relaxed">
                      {rest.cuisine}
                    </p>
                    <p className="text-xxs text-gray-400 flex items-center gap-1 mt-2 font-mono">
                      <MapPin className="w-3 h-3 text-gray-300 shrink-0" />
                      {rest.address}
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-4 text-xxs text-gray-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-500" />
                      {rest.deliveryTime}
                    </span>
                    <span className="bg-slate-100 text-gray-600 px-2 py-0.5 rounded">
                      ${rest.deliveryFee.toFixed(2)} delivery
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {filteredRestaurants.length === 0 && (
              <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400">
                No kitchens match your selection. Reset search filters.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Restaurant Details & Dishes Catalog Screen */
        <div id="restaurant-detail-screen" className="space-y-6 animate-fade-in">
          {/* Header Card */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <div className="relative h-64 bg-slate-900">
              <img
                src={selectedRest.image}
                alt={selectedRest.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-60"
              />
              <button
                onClick={() => {
                  setSelectedRest(null);
                  setCart([]);
                }}
                className="absolute top-4 left-4 bg-white hover:bg-gray-50 text-gray-700 p-2.5 rounded-full border border-gray-200 shadow-xl cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-end justify-between gap-6 relative -mt-10 mx-6 bg-white border border-gray-50 rounded-2xl shadow-lg mb-6">
              <div>
                <h2 className="font-display font-extrabold text-gray-800 text-2xl tracking-tight">
                  {selectedRest.name}
                </h2>
                <p className="text-xs text-amber-500 font-medium mt-1 uppercase tracking-wider">
                  {selectedRest.cuisine}
                </p>
                <p className="text-xxs text-gray-400 mt-2 flex items-center gap-1 font-mono">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  {selectedRest.address}
                </p>
              </div>

              <div className="flex items-center gap-4 border-t md:border-t-0 border-gray-50 pt-4 md:pt-0">
                <div className="text-center md:text-right">
                  <p className="text-xxxxs uppercase tracking-wider font-mono text-gray-400">Rating</p>
                  <p className="font-bold text-gray-800 text-lg flex items-center gap-1.5 justify-end mt-0.5 leading-none">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-500" />
                    {selectedRest.rating.toFixed(1)}
                  </p>
                  <p className="text-xxs font-mono text-gray-400 mt-1 uppercase">
                    {selectedRest.reviewsCount} reviews
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Menu Items (left 2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="font-display font-bold text-gray-800 text-sm border-l-4 border-amber-500 pl-2">
                Menu & Dishes Catalog
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {menuItems.map((item) => (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between ${
                      item.available ? "border-gray-100" : "border-gray-50 opacity-55"
                    }`}
                  >
                    <div className="flex gap-4 p-4">
                      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="bg-slate-100 text-gray-500 font-mono text-[9px] px-1.5 py-0.5 rounded uppercase">
                          {item.category}
                        </span>
                        <h4 className="font-bold text-xs text-gray-800 mt-1.5 truncate">
                          {item.name}
                        </h4>
                        <p className="text-[10px] text-gray-400 leading-normal mt-1 line-clamp-2">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="bg-gray-50/50 border-t border-gray-50 px-4 py-3 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-gray-900">
                        ${item.price.toFixed(2)}
                      </span>
                      {item.available ? (
                        <button
                          onClick={() => addToCart(item)}
                          className="bg-amber-500 text-white font-medium hover:bg-amber-600 px-3 py-1 rounded-lg text-xxs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> Add to Cart
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 uppercase font-mono">
                          Sold Out
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Side Reviews column */}
            <div className="space-y-6">
              <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-gray-800 text-xs">
                    Customer Ratings
                  </h3>
                  <button
                    onClick={() => setShowReviewForm(!showReviewForm)}
                    className="text-amber-500 hover:text-amber-600 font-medium text-xxs cursor-pointer"
                  >
                    {showReviewForm ? "Cancel" : "Add Review"}
                  </button>
                </div>

                {/* Add Review form */}
                {showReviewForm && (
                  <form onSubmit={submitReview} className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div>
                      <label className="text-[10px] font-medium text-gray-500 block">Rating</label>
                      <select
                        value={newReview.rating}
                        onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                        className="w-full mt-1 p-1 bg-white border border-gray-200 rounded text-xs outline-none"
                      >
                        <option value="5">★★★★★ Outstanding (5)</option>
                        <option value="4">★★★★ Very Good (4)</option>
                        <option value="3">★★★ Average (3)</option>
                        <option value="2">★★ Disappointing (2)</option>
                        <option value="1">★ Poor (1)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-medium text-gray-500 block">Comment</label>
                      <textarea
                        required
                        value={newReview.comment}
                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        placeholder="Share your culinary feedback..."
                        className="w-full mt-1 p-2 bg-white border border-gray-200 rounded text-xs h-20 outline-none resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-slate-900 text-white py-1.5 rounded text-xxs font-medium hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" /> Post Feedback
                    </button>
                  </form>
                )}

                <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
                  {restReviews.map((rev) => (
                    <div key={rev.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xxs font-semibold text-gray-700">{rev.customerName}</span>
                        <div className="flex items-center gap-0.5 text-amber-500 bg-amber-50 px-1 py-0.5 rounded text-[10px]">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {rev.rating}
                        </div>
                      </div>
                      <p className="text-xxs text-gray-500 mt-1 italic">"{rev.comment}"</p>
                      <span className="text-xxxxs font-mono text-gray-300 block mt-1.5 uppercase">
                        {new Date(rev.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}

                  {restReviews.length === 0 && (
                    <div className="text-center py-6 text-gray-400 text-xxs font-sans">
                      No ratings yet. Be the first to review!
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Float Button / Drawer */}
      {cart.length > 0 && selectedRest && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => {
              setIsCartOpen(true);
              setCheckoutStep("cart");
            }}
            className="bg-amber-500 text-white font-display font-semibold hover:bg-amber-600 px-5 py-3 rounded-full flex items-center gap-2 shadow-2xl transition-transform hover:scale-105 border-2 border-white cursor-pointer"
          >
            <ShoppingCart className="w-5 h-5 animate-pulse" />
            View Cart ({cart.reduce((sum, c) => sum + c.quantity, 0)})
          </button>
        </div>
      )}

      {/* Cart & Checkout Drawer Layer */}
      {isCartOpen && selectedRest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden">
            
            {/* Header */}
            <div className="p-6 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-gray-800 text-base">Your Gourmet Basket</h3>
                <p className="text-xxxxs font-mono uppercase tracking-wider text-gray-400 mt-1">
                  Ordered from: {selectedRest.name}
                </p>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Steps tabs */}
            <div className="px-6 border-b border-gray-100 flex gap-4 text-xxs font-medium font-display py-2.5">
              <span
                className={`pb-1 border-b-2 ${
                  checkoutStep === "cart" ? "border-amber-500 text-amber-500" : "border-transparent text-gray-400"
                }`}
              >
                1. Order Review
              </span>
              <span
                className={`pb-1 border-b-2 ${
                  checkoutStep === "payment" ? "border-amber-500 text-amber-500" : "border-transparent text-gray-400"
                }`}
              >
                2. Secure Payment
              </span>
            </div>

            {/* Scroll Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {errorMessage && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-start gap-2 text-xxs text-red-700 font-sans mb-4">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {checkoutStep === "cart" ? (
                /* Step 1: Cart Items detail review */
                <div className="space-y-4">
                  {cart.map(({ item, quantity }) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 border-b border-gray-50 pb-3">
                      <div>
                        <h4 className="font-semibold text-xs text-gray-800">{item.name}</h4>
                        <p className="font-mono text-xxs text-gray-400 mt-0.5">
                          ${item.price.toFixed(2)} each
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="hover:text-amber-500"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-xs font-bold text-gray-700 min-w-[12px] text-center">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="hover:text-amber-500"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* Step 2: Payment Parameters */
                <form id="payment-checkout-form" onSubmit={handleCheckout} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-medium text-gray-400 font-mono uppercase tracking-wider block">
                      Delivery Address
                    </label>
                    <textarea
                      required
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Input standard building/street coordinate..."
                      className="w-full mt-1.5 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs h-20 outline-none resize-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <label className="text-[10px] font-medium text-gray-400 font-mono uppercase tracking-wider block mb-2">
                      Payment Platform Selector
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("card")}
                        className={`p-3 border rounded-xl flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer ${
                          paymentMethod === "card"
                            ? "bg-amber-50 border-amber-500 text-amber-900"
                            : "bg-white border-gray-200 text-gray-600"
                        }`}
                      >
                        <CreditCard className="w-4 h-4" /> Credit Card
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("cash")}
                        className={`p-3 border rounded-xl flex items-center justify-center gap-1 text-xs font-semibold cursor-pointer ${
                          paymentMethod === "cash"
                            ? "bg-amber-50 border-amber-500 text-amber-900"
                            : "bg-white border-gray-200 text-gray-600"
                        }`}
                      >
                        💵 COD (Cash)
                      </button>
                    </div>
                  </div>

                  {paymentMethod === "card" && (
                    <div className="space-y-3 bg-slate-50 p-4 border border-slate-100 rounded-xl">
                      <div className="bg-slate-900 text-white rounded-xl p-4 shadow-lg mb-2 relative overflow-hidden">
                        <div className="absolute top-2 right-2 text-xxs font-mono text-slate-400 font-bold tracking-wide flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> SECURE STRIPE
                        </div>
                        <div className="text-[8px] font-mono uppercase text-amber-400 tracking-widest mt-1">Gourmet Checkout</div>
                        
                        <div className="font-mono text-xs tracking-widest mt-4">
                          {paymentDetails.cardNumber || "••••  ••••  ••••  ••••"}
                        </div>
                        <div className="flex justify-between items-end mt-4">
                          <div className="font-mono uppercase text-[9px] truncate max-w-[150px]">
                            {paymentDetails.cardName || "CARDHOLDER NAME"}
                          </div>
                          <div className="font-mono text-[9px]">
                            {paymentDetails.expiry || "MM/YY"}
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Card Number</label>
                        <input
                          type="text"
                          required
                          value={paymentDetails.cardNumber}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })}
                          placeholder="e.g. 4111 8155 3341 9980"
                          className="w-full mt-1 p-2 bg-white border border-gray-200 rounded text-xs outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Name on Card</label>
                          <input
                            type="text"
                            required
                            value={paymentDetails.cardName}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, cardName: e.target.value })}
                            placeholder="Alex Johnson"
                            className="w-full mt-1 p-2 bg-white border border-gray-200 rounded text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">CVV</label>
                          <input
                            type="text"
                            required
                            maxLength={3}
                            value={paymentDetails.cvv}
                            onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}
                            placeholder="342"
                            className="w-full mt-1 p-2 bg-white border border-gray-200 rounded text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[9px] font-mono text-gray-400 uppercase tracking-wider block">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          required
                          placeholder="12/28"
                          value={paymentDetails.expiry}
                          onChange={(e) => setPaymentDetails({ ...paymentDetails, expiry: e.target.value })}
                          className="w-full mt-1 p-2 bg-white border border-gray-200 rounded text-xs outline-none"
                        />
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Footer containing totals and trigger buttons */}
            <div className="p-6 bg-slate-50 border-t border-gray-100 space-y-4">
              <div className="space-y-1.5 text-xxs text-gray-500 font-mono">
                <div className="flex justify-between">
                  <span>Basket Subtotal</span>
                  <span>${getCartTotals().subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery fee</span>
                  <span>${getCartTotals().deliveryFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-gray-800 text-xs border-t border-gray-100 pt-2 font-display">
                  <span>Total Amount</span>
                  <span>${getCartTotals().total.toFixed(2)}</span>
                </div>
              </div>

              {checkoutStep === "cart" ? (
                <button
                  type="button"
                  onClick={() => setCheckoutStep("payment")}
                  className="w-full bg-amber-500 text-white py-3 rounded-xl font-display font-semibold hover:bg-amber-600 transition-colors cursor-pointer text-center text-xs"
                >
                  Proceed to Checkout Secure
                </button>
              ) : (
                <button
                  type="submit"
                  form="payment-checkout-form"
                  disabled={isProcessing}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-display font-semibold hover:bg-slate-800 transition-colors cursor-pointer text-center text-xs flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? (
                    "Authorizing Secure payment..."
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" /> Authorized payment & Place Order
                    </>
                  )}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Historical Logs List */}
      <OrderHistory user={user} />
    </div>
  );
}
