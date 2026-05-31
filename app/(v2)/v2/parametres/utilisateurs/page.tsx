import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { UtilisateursV2Client } from "@/components/v2/parametres/UtilisateursV2Client";

export default function UtilisateursPage() {
  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <UtilisateursV2Client />
    </ProtectedRoute>
  );
}
