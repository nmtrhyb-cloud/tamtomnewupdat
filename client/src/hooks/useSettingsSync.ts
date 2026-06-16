import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/context/AuthContext";

export function useSettingsSync() {
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      (window as any).WS_MANAGER = ws;

      ws.onopen = () => {
        if (isAuthenticated && user?.id) {
          ws?.send(JSON.stringify({
            type: "auth",
            payload: {
              userId: user.id,
              userType: user.userType || "customer"
            }
          }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "settings_changed") {
            const key = msg.payload?.key || msg.payload?.changedKey;

            // Always invalidate ui-settings for any settings change
            queryClient.invalidateQueries({ queryKey: ["/api/ui-settings"] });
            queryClient.invalidateQueries({ queryKey: ["/api/admin/ui-settings"] });

            if (!key || key === "restaurants" || key === "delivery_fee_settings" || key === "app_closed") {
              queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/restaurants"] });
              queryClient.invalidateQueries({ queryKey: ["/api/delivery-fees/settings"] });
            }

            if (!key || key === "categories") {
              queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/categories"] });
            }

            if (!key || key === "menu_items") {
              queryClient.invalidateQueries({ queryKey: ["/api/menu-items"] });
              queryClient.invalidateQueries({ queryKey: ["/api/restaurants"] });
            }

            if (!key || key === "special_offers") {
              queryClient.invalidateQueries({ queryKey: ["/api/special-offers"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/special-offers"] });
            }

            // Business hours / store_status: invalidate all settings-related queries
            if (!key || key === "business_hours" || key === "opening_time" || key === "closing_time" || key === "store_status") {
              queryClient.invalidateQueries({ queryKey: ["/api/ui-settings"] });
              queryClient.invalidateQueries({ queryKey: ["/api/admin/ui-settings"] });
            }

          } else if (msg.type === "order_status_changed" || msg.type === "order_update") {
            queryClient.invalidateQueries({ queryKey: ["orders"] });
            queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
            if (msg.payload?.orderId) {
              queryClient.invalidateQueries({ queryKey: [`/api/orders/${msg.payload.orderId}`] });
              queryClient.invalidateQueries({ queryKey: [`/api/orders/${msg.payload.orderId}/track`] });
            }
          } else if (msg.type === "NEW_NOTIFICATION") {
            queryClient.invalidateQueries({ queryKey: ['/api/notifications/customer'] });
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 5000);
      };

      ws.onerror = () => {
        ws?.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [queryClient, user?.id, isAuthenticated]);
}
