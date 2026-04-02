"use client";

export function RefundOrderButton({ orderId }: { orderId: string }) {
  return (
    <button
      onClick={() => {
        // TODO: wire refund mutation
        console.log("refund order", orderId);
      }}
    >
      Refund order
    </button>
  );
}
