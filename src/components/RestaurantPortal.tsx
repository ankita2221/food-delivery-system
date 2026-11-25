import React, { useState, useEffect } from "react";
import { Restaurant, MenuItem, Order, User } from "../types";
import { 
  Plus, Edit, Trash2, Power, ClipboardList, Utensils, Settings, 
  Check, Save, DollarSign, Clock, MapPin, AlertCircle 
} from "lucide-react";

interface RestaurantPortalProps {
  user: User;
}

export default function RestaurantPortal({ user }: RestaurantPortalProps) {
  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "settings">("orders");
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Menu Creation/Editing Formulation
  const [newItemData, setNewItemData] = useState({ name: "", price: "", description: "", category: "Burgers", image: "" });
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemData, setEditingItemData] = useState({ name: "", price: 0, description: "", category: "", available: true });
  const [showAddForm, setShowAddForm] = useState(false);

  // Settings Edit Formulation
  const [settingsData, setSettingsData] = useState({ name: "", cuisine: "", address: "", image: "", deliveryFee: 0, deliveryTime: "", isActive: true });
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    fetchRestaurantAndDetails();
  }, [user.restaurantId]);

  const fetchRestaurantAndDetails = async () => {
    if (!user.restaurantId) return;
    try {
      // 1. Fetch info
      const restRes = await fetch(`/api/restaurants/${user.restaurantId}`);
      if (restRes.ok) {
        const restData: Restaurant = await restRes.json();
        setRestaurant(restData);
        setSettingsData({
          name: restData.name,
          cuisine: restData.cuisine,
          address: restData.address,
          image: restData.image,
          deliveryFee: restData.deliveryFee,
          deliveryTime: restData.deliveryTime,
          isActive: restData.isActive
        });
      }

      // 2. Fetch Menu
      const menuRes = await fetch(`/api/restaurants/${user.restaurantId}/menu`);
      if (menuRes.ok) setMenuItems(await menuRes.json());

      // 3. Fetch Orders
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch(`/api/orders?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Menu action triggers
  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.restaurantId) return;

    try {
      const res = await fetch("/api/menu-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: user.restaurantId,
          name: newItemData.name,
          price: Number(newItemData.price),
          description: newItemData.description,
          category: newItemData.category,
          image: newItemData.image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80"
        })
      });

      if (res.ok) {
        setNewItemData({ name: "", price: "", description: "", category: "Burgers", image: "" });
        setShowAddForm(false);
        fetchRestaurantAndDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/menu-items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingItemData)
      });
      if (res.ok) {
        setEditingItemId(null);
        fetchRestaurantAndDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/menu-items/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available: !item.available })
      });
      if (res.ok) {
        fetchRestaurantAndDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this menu item permanently?")) return;
    try {
      const res = await fetch(`/api/menu-items/${itemId}`, { method: "DELETE" });
      if (res.ok) {
        fetchRestaurantAndDetails();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update business profile details
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user.restaurantId) return;

    setSaveStatus("updating");
    try {
      const res = await fetch(`/api/restaurants/${user.restaurantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsData)
      });
      if (res.ok) {
        setSaveStatus("success");
        setTimeout(() => setSaveStatus(""), 3000);
        fetchRestaurantAndDetails();
      } else {
        setSaveStatus("error");
      }
    } catch (err) {
      setSaveStatus("error");
    }
  };

  if (!user.restaurantId) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center text-red-800">
        <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
        <h3 className="font-display font-semibold text-sm">Restaurant Profile Mismatch</h3>
        <p className="text-xs text-red-600 mt-2">
          Your account is registered as a restaurant partner, but has no corresponding culinary ID linked. Contact operations support.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Cards Strip */}
      {restaurant && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-50 border shrink-0">
              <img src={restaurant.image} alt={restaurant.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="font-display font-extrabold text-gray-800 text-lg leading-tight">{restaurant.name}</h2>
              <p className="text-xxs text-amber-500 font-medium uppercase tracking-wide mt-1">{restaurant.cuisine}</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 rounded-xl text-xxs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "orders" ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <ClipboardList className="w-4 h-4" /> Live Orders ({orders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length})
            </button>
            <button
              onClick={() => setActiveTab("menu")}
              className={`px-4 py-2 rounded-xl text-xxs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "menu" ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Utensils className="w-4 h-4" /> Manage Menu ({menuItems.length})
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2 rounded-xl text-xxs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "settings" ? "bg-amber-500 text-white shadow-md shadow-amber-500/20" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <Settings className="w-4 h-4" /> Kitchen Settings
            </button>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE TAB */}
      {activeTab === "orders" && (
        <div className="space-y-6">
          <h3 className="font-display font-semibold text-gray-800 text-sm tracking-tight border-l-4 border-amber-500 pl-2">
            Incoming & Active Kitchen Tickets
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {orders.filter(o => o.status !== "delivered" && o.status !== "cancelled").map((order) => (
              <div key={order.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="bg-slate-100 text-gray-800 font-mono text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        #{order.id.slice(0, 5).toUpperCase()}
                      </span>
                      <p className="text-xxs font-mono text-gray-400 mt-1">
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <span className={`text-xxs font-mono font-bold uppercase px-2 py-0.5 rounded ${
                      order.status === "pending" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                      order.status === "confirmed" ? "bg-blue-50 text-blue-700" :
                      order.status === "preparing" ? "bg-indigo-50 text-indigo-700" :
                      "bg-purple-50 text-purple-700"
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  {/* Order items listing */}
                  <div className="border-t border-gray-50 mt-4 pt-3 space-y-2">
                    {order.items.map((i) => (
                      <div key={i.id} className="flex justify-between text-xs text-gray-700 leading-tight">
                        <span>{i.quantity}x {i.name}</span>
                        <span className="font-mono text-gray-500 font-medium">${(i.price * i.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Summary */}
                  <div className="flex justify-between border-t border-dashed border-gray-100 pt-3 mt-3 text-xxs font-mono text-gray-500">
                    <span>Total Net Revenue:</span>
                    <span className="font-bold text-gray-950">${order.totalAmount.toFixed(2)}</span>
                  </div>

                  <p className="text-[10px] text-gray-400 flex items-start gap-1 mt-4 font-sans leading-tight">
                    <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0 mt-0.5" />
                    <span>Deliver to: {order.deliveryAddress} ({order.customerName})</span>
                  </p>
                </div>

                {/* Pipeline Controls Buttons */}
                <div className="pt-4 border-t border-gray-50 mt-4">
                  {order.status === "pending" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "confirmed")}
                      className="w-full bg-blue-600 text-white font-medium py-1.5 rounded-lg text-xxs hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Confirm Order Ticket
                    </button>
                  )}
                  {order.status === "confirmed" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "preparing")}
                      className="w-full bg-indigo-600 text-white font-medium py-1.5 rounded-lg text-xxs hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Start Preparation (Cook)
                    </button>
                  )}
                  {order.status === "preparing" && (
                    <button
                      onClick={() => updateOrderStatus(order.id, "ready")}
                      className="w-full bg-purple-600 text-white font-medium py-1.5 rounded-lg text-xxs hover:bg-purple-700 transition-colors cursor-pointer"
                    >
                      Mark as Ready for Delivery
                    </button>
                  )}
                  {order.status === "ready" && (
                    <div className="text-center p-2 bg-purple-50 text-purple-800 text-[10px] font-mono rounded">
                      ● Waiting for courier pickup...
                    </div>
                  )}
                </div>
              </div>
            ))}

            {orders.filter(o => o.status !== "delivered" && o.status !== "cancelled").length === 0 && (
              <div className="col-span-full bg-white border border-gray-100 rounded-2xl p-12 text-center text-gray-400 text-xs">
                Your kitchen has no pending orders at the moment.
              </div>
            )}
          </div>
        </div>
      )}

      {/* MENU TAB */}
      {activeTab === "menu" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-semibold text-gray-800 text-sm tracking-tight border-l-4 border-amber-500 pl-2">
              Dishes & Menu Listing
            </h3>
            <button
              onClick={() => {
                setShowAddForm(!showAddForm);
                setEditingItemId(null);
              }}
              className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xxs font-medium hover:bg-amber-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Dish Product
            </button>
          </div>

          {/* Form to CREATE product */}
          {showAddForm && (
            <form onSubmit={handleAddMenuItem} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="text-xxs font-medium text-gray-500">Dish Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Avocado Cheddar Smasher"
                  value={newItemData.name}
                  onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none"
                />
              </div>

              <div>
                <label className="text-xxs font-medium text-gray-500">Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="12.99"
                  value={newItemData.price}
                  onChange={(e) => setNewItemData({ ...newItemData, price: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xxs font-medium text-gray-500">Description</label>
                <textarea
                  placeholder="Describe ingredients, cooking prep standard, toppings..."
                  value={newItemData.description}
                  onChange={(e) => setNewItemData({ ...newItemData, description: e.target.value })}
                  className="w-full mt-1 p-3 border border-gray-200 rounded-lg text-xs h-16 outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-xxs font-medium text-gray-500">Category Tag</label>
                <select
                  value={newItemData.category}
                  onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
                  className="w-full mt-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none"
                >
                  <option value="Burgers">Burgers</option>
                  <option value="Pizza">Pizza</option>
                  <option value="Sides">Sides</option>
                  <option value="Salads">Salads</option>
                  <option value="Drinks">Drinks/Desserts</option>
                </select>
              </div>

              <div>
                <label className="text-xxs font-medium text-gray-500">Photo URL (Gourmet Cover)</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newItemData.image}
                  onChange={(e) => setNewItemData({ ...newItemData, image: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none"
                />
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-gray-50">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xxs text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xxs font-medium hover:bg-slate-800"
                >
                  Publish to Menu
                </button>
              </div>
            </form>
          )}

          {/* List of current Dishes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {menuItems.map((item) => (
              <div key={item.id} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex gap-4 relative">
                <div className="w-16 h-16 bg-gray-50 rounded-xl overflow-hidden shrink-0 border border-gray-100">
                  <img src={item.image} alt={item.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  {editingItemId === item.id ? (
                    // Inline Edit Panel fields
                    <div className="space-y-2 pr-8">
                      <input
                        type="text"
                        value={editingItemData.name}
                        onChange={(e) => setEditingItemData({ ...editingItemData, name: e.target.value })}
                        className="w-full px-2 py-0.5 border rounded text-xs"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={editingItemData.price}
                        onChange={(e) => setEditingItemData({ ...editingItemData, price: Number(e.target.value) })}
                        className="w-24 px-2 py-0.5 border rounded text-xs inline-block mr-2"
                      />
                      <button
                        onClick={() => handleUpdateItem(item.id)}
                        className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] hover:bg-emerald-700 cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-semibold text-xs text-gray-800 truncate">{item.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">(${item.price.toFixed(2)})</span>
                      </div>
                      <p className="text-xxs text-gray-400 leading-snug line-clamp-2 mt-1 pr-6">{item.description}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-3">
                    <span className="bg-slate-50 text-gray-500 font-mono text-[9px] px-2 py-0.5 rounded uppercase">
                      {item.category}
                    </span>

                    {/* Stock switch toggle */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleAvailability(item)}
                        title={item.available ? "Mark sold out" : "Mark in stock"}
                        className={`text-[9px] font-semibold flex items-center gap-1.5 border rounded-lg px-2 py-0.5 cursor-pointer ${
                          item.available
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-red-50 border-red-200 text-red-800"
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        {item.available ? "In Stock" : "Sold Out"}
                      </button>

                      {editingItemId !== item.id && (
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <button
                            onClick={() => {
                              setEditingItemId(item.id);
                              setEditingItemData({
                                name: item.name,
                                price: item.price,
                                description: item.description,
                                category: item.category,
                                available: item.available
                              });
                            }}
                            className="hover:text-amber-500"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="hover:text-red-500"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COV_SETTINGS TAB */}
      {activeTab === "settings" && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm max-w-xl">
          <h3 className="font-display font-semibold text-gray-800 text-sm tracking-tight border-l-4 border-amber-500 pl-2 mb-6">
            Edit Kitchen Settings Profile
          </h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xxs font-medium text-gray-500 font-mono uppercase">Culinary Name</label>
                <input
                  type="text"
                  required
                  value={settingsData.name}
                  onChange={(e) => setSettingsData({ ...settingsData, name: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xxs font-medium text-gray-500 font-mono uppercase">Cuisine Specialty</label>
                <input
                  type="text"
                  required
                  value={settingsData.cuisine}
                  onChange={(e) => setSettingsData({ ...settingsData, cuisine: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xxs font-medium text-gray-500 font-mono uppercase">Address Location</label>
              <input
                type="text"
                required
                value={settingsData.address}
                onChange={(e) => setSettingsData({ ...settingsData, address: e.target.value })}
                className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xxs font-medium text-gray-500 font-mono uppercase">Delivery Fee ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={settingsData.deliveryFee}
                  onChange={(e) => setSettingsData({ ...settingsData, deliveryFee: Number(e.target.value) })}
                  className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xxs font-medium text-gray-500 font-mono uppercase">Standard Delivery Time</label>
                <input
                  type="text"
                  required
                  value={settingsData.deliveryTime}
                  onChange={(e) => setSettingsData({ ...settingsData, deliveryTime: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xxs font-medium text-gray-500 font-mono uppercase">Display Banner Image URL</label>
              <input
                type="text"
                required
                value={settingsData.image}
                onChange={(e) => setSettingsData({ ...settingsData, image: e.target.value })}
                className="w-full mt-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={settingsData.isActive}
                  onChange={(e) => setSettingsData({ ...settingsData, isActive: e.target.checked })}
                  className="w-4 h-4 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                />
                <label htmlFor="isActive" className="text-xxs font-medium text-gray-600 cursor-pointer">
                  Accept order ticketing (Active Status)
                </label>
              </div>

              <div className="flex items-center gap-2">
                {saveStatus === "success" && (
                  <span className="text-emerald-600 font-semibold text-xxs flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Updated Settings!
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saveStatus === "updating"}
                  className="bg-slate-900 text-white font-semibold hover:bg-slate-800 px-4 py-2 rounded-xl text-xxs cursor-pointer flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> Save Changes
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
