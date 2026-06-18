/**
 * Restaurant Account Service - removed for single-store Tamtom project
 * All revenue goes to the company directly
 */

import type { Order } from "@shared/schema";

export interface OrderRevenueResult {
  orderAmount: number;
  platformCommission: number;
  restaurantRevenue: number;
  deliveryFee: number;
  netRevenue: number;
}

export async function processOrderRevenue(order: Order): Promise<void> {
  // No-op: single-store Tamtom project, no restaurant revenue splitting
}

export async function getRestaurantStats(restaurantId: string): Promise<any> {
  return { totalOrders: 0, totalRevenue: 0, netRevenue: 0 };
}

export async function processRestaurantWithdrawal(restaurantId: string, amount: number): Promise<any> {
  return { success: false, message: "Restaurant accounts removed" };
}
