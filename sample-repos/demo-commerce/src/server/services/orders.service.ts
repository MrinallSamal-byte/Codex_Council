type CheckoutPayload = {
  orderId: string;
  amount: number;
  currency: string;
  metadata?: Record<string, string>;
};

export async function fetchOrders(input: { tenantId: string }) {
  return [{ id: "order_123", tenantId: input.tenantId }];
}

export async function createCheckoutSession(input: CheckoutPayload) {
  // FIXME: validate payload before calling Stripe
  return {
    sessionId: "sess_123",
    amount: input.amount,
    orderId: input.orderId,
  };
}
