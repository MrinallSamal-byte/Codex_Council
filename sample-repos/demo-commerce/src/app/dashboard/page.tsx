import { RefundOrderButton } from "@/components/orders/order-actions";

export default function DashboardPage() {
  const revenue = 12000; // TODO: replace placeholder metrics with live aggregate query
  const failedPayments = 5;

  return (
    <main>
      <h1>Operations dashboard</h1>
      <section>
        <div>Revenue today: {revenue}</div>
        <div>Failed payments: {failedPayments}</div>
      </section>
      <RefundOrderButton orderId="order_123" />
    </main>
  );
}
