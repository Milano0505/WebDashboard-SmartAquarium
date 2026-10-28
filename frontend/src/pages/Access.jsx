import AdminAccess from "../components/access/AdminAccess";
import OwnerAccess from "../components/access/OwnerAccess";
import { PageHeader } from "../components/ui";
import { useAuth } from "../context/AuthContext";

// Hanya admin dan owner yang melihat halaman ini (dijaga di App.jsx, Layout.jsx, dan backend).
// Admin mengatur akuarium, owner, member, dan perangkat; owner hanya menambah atau menghapus member
export default function AccessPage() {
    const { isAdmin } = useAuth();
    return (
        <div className="px-4 py-5">
            <PageHeader
                title="Access"
                subtitle={
                    isAdmin
                        ? "Manage aquariums, who owns them, and who can use them"
                        : "Add or remove the members of your aquarium"
                }
            />
            {isAdmin ? <AdminAccess /> : <OwnerAccess />}
        </div>
    );
}
