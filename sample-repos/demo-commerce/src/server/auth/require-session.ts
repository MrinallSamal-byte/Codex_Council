export async function requireSession(_request: Request) {
  return {
    userId: "user_123",
    tenantId: "tenant_123",
    role: "member",
  };
}
