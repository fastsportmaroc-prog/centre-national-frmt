import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { FacturationClubClient } from "@/components/v2/budget/FacturationClubClient";

export default function V2FacturationClubPage() {
  return (
    <ProtectedRoute allowedRoles={["admin", "direction", "viewer"]}>
      <FacturationClubClient />
    </ProtectedRoute>
  );
}

