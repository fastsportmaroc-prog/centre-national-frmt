import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { PasseportsV2Client } from "@/components/v2/passeports/PasseportsV2Client";

export default function V2PasseportsPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "direction", "viewer", "entraineur"]}>
      <PasseportsV2Client />
    </ProtectedRoute>
  );
}
