# Security Specification and Threat Model

This document outlines the data invariants, threat model, and security rules testing spec for the Foodly Centralized System Firestore storage layer.

## 1. Data Invariants

- **Users**: Users cannot arbitrary change their role or set themselves as Admin. Email must be valid.
- **Restaurants**: Can only be created/modified by their owner or an administrator. `ownerId` is immutable.
- **MenuItems**: Can only be managed by the restaurant owner who owns the corresponding `restaurantId`. Prices must be positive (> 0) and image URLs must be bounded in length.
- **Orders**: Orders must have unique ID. Customers can only create orders where `customerId` is their own UID. Only assigned delivery riders or the restaurant owner or customers can read their specific orders. Orders cannot have their states modified backward once delivered or cancelled.
- **Reviews**: Only customers who placed an order can write reviews, and the customer cannot review with a rating out of 1-5 range.
- **Notifications**: Users can only see and mark as read their own notifications.

## 2. The "Dirty Dozen" Malicious Payloads

The following malicious payloads seek to subvert identity and state integrity, and must return `PERMISSION_DENIED`:

1. **Privilege Escalation**: Non-admin registering self with `role: "admin"` in user profiles.
2. **Identity Spoofing**: User "A" creating a restaurant document assigning ownership `ownerId` to User "B".
3. **Price Manipulation**: Malicious user updating menu item price of another restaurant or set to negative value.
4. **Invalid Structure ID**: Document ID containing special control characters or size > 150.
5. **PII Breach**: Customer "A" reading the private user profiles / details of Customer "B".
6. **Order Stealing**: Driver "A" accepting/overwriting a delivery order assignment that is already owned/delivered by Driver "B".
7. **Negative Order/Total Amount**: Creating an order with `totalAmount: -100`.
8. **Ransom Review Spammer**: Creating a review rating with a value of `99`.
9. **Fake Notification Injector**: Injecting notification item under another user's `userId`.
10. **State Shortcutting**: Skipping order state, e.g., customer changing status directly from "pending" to "delivered" without driver or restaurant authorization.
11. **Timestamp Spoofing**: Creating orders with spoofed client-side timestamps instead of `request.time`.
12. **Shadow Field Injector**: Writing a document containing undocumented keys or permissions field (e.g. `isAdmin: true`).

## 3. Test Runner Design

Validation checks will verify that all 12 malicious payloads receive `PERMISSION_DENIED`. The security policies are implemented in `firestore.rules`.
