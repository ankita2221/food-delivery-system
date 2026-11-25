export type UserRole = "customer" | "restaurant" | "delivery" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  address?: string;
  restaurantId?: string; // Linked restaurant if role is 'restaurant'
  createdAt: string;
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviewsCount: number;
  image: string;
  address: string;
  ownerId: string;
  isActive: boolean;
  deliveryTime: string; // e.g. "20-30 min"
  deliveryFee: number;
  createdAt: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  restaurantId: string;
  restaurantName: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  deliveryAddress: string;
  deliveryFee: number;
  paymentStatus: "pending" | "paid" | "failed";
  paymentMethod: string;
  deliveryPartnerId: string | null;
  deliveryPartnerName: string | null;
  deliveryCoords?: { lat: number; lng: number }; // Simulated current delivery coordinates
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  restaurantId: string;
  customerId: string;
  customerName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  userRole?: UserRole; // can also target by role or broad
  title: string;
  message: string;
  read: boolean;
  orderId?: string;
  createdAt: string;
}
