import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { logout as apiLogout, getAquariums, isAuthBusy, startSession, updateUserProfile } from "../api/service";
import { auth } from "../supabase";

const AuthContext = createContext(null);
const ACTIVE_AQUARIUM_KEY = "sa_active_aquarium";

// ---------- Fungsi bantu ----------

// Versi lama bisa menyimpan URL blob: sebagai foto profil; URL ini rusak setelah reload
const isBlobUrl = url => typeof url === "string" && url.startsWith("blob:");

function readActiveAquarium() {
    try {
        return localStorage.getItem(ACTIVE_AQUARIUM_KEY);
    } catch {
        return null;
    }
}

function saveActiveAquarium(aquariumId) {
    try {
        if (aquariumId) localStorage.setItem(ACTIVE_AQUARIUM_KEY, aquariumId);
        else localStorage.removeItem(ACTIVE_AQUARIUM_KEY);
    } catch (error) {
        console.warn("Unable to save the selected aquarium.", error);
    }
}

// ---------- Provider ----------

// Status login dipegang Supabase Auth (onAuthStateChange). Profil, peran admin, dan daftar
// akuarium diambil dari backend setiap aplikasi dibuka
export function AuthProvider({ children }) {
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [aquariums, setAquariums] = useState([]);
    const [selectedAquariumId, setSelectedAquariumId] = useState(readActiveAquarium);

    const loadAquariums = useCallback(async () => {
        const { aquariums: list } = await getAquariums();
        setAquariums(list);
        return list;
    }, []);

    // Dipanggil Login/Register setelah backend membalas profil
    const signIn = useCallback(
        async profile => {
            setUser(profile);
            await loadAquariums();
        },
        [loadAquariums],
    );

    const clearSession = useCallback(() => {
        setUser(null);
        setAquariums([]);
    }, []);

    const signOut = async () => {
        try {
            await apiLogout();
        } finally {
            clearSession();
        }
    };

    // Jalan sekali saat aplikasi dibuka, lalu setiap status login Supabase berubah
    useEffect(() => {
        let isMounted = true;

        const loadSession = async () => {
            try {
                const { userProfile } = await startSession();
                if (isBlobUrl(userProfile.photoUrl)) {
                    await updateUserProfile(userProfile.id, { photoUrl: null }).catch(error =>
                        console.warn("Unable to clear a temporary profile photo URL.", error),
                    );
                    userProfile.photoUrl = null;
                }
                const { aquariums: list } = await getAquariums();
                if (!isMounted) return;
                setUser(userProfile);
                setAquariums(list);
            } catch (error) {
                if (error.status === 401) {
                    await apiLogout().catch(() => {});
                    if (isMounted) clearSession();
                } else {
                    console.warn("Unable to validate the saved session.", error);
                }
            }
        };

        // INITIAL_SESSION datang sekali saat dibuka. TOKEN_REFRESHED tiap jam tidak perlu memuat ulang profil
        const {
            data: { subscription },
        } = auth.onAuthStateChange((event, session) => {
            if (event === "TOKEN_REFRESHED") return;
            // Jangan memanggil Supabase langsung di dalam callback ini (bisa menahan kunci auth): tunda satu tick
            setTimeout(async () => {
                if (!session) {
                    if (isMounted) {
                        clearSession();
                        setIsAuthLoading(false);
                    }
                    return;
                }
                // Login/register sedang berjalan; mereka memuat sesi sendiri lewat signIn()
                if (!isAuthBusy()) await loadSession();
                if (isMounted) setIsAuthLoading(false);
            }, 0);
        });

        // Dipicu client API saat respons 401
        const handleUnauthorized = () => {
            apiLogout().catch(() => {});
            clearSession();
        };
        window.addEventListener("sa:unauthorized", handleUnauthorized);

        return () => {
            isMounted = false;
            subscription.unsubscribe();
            window.removeEventListener("sa:unauthorized", handleUnauthorized);
        };
    }, [clearSession]);

    // Akuarium aktif: pilihan tersimpan jika masih bisa diakses, jika tidak yang pertama
    const activeAquarium = aquariums.find(item => item.id === selectedAquariumId) || aquariums[0] || null;
    const activeAquariumId = activeAquarium?.id ?? null;
    const activeRole = activeAquarium?.role ?? null;

    const selectAquarium = aquariumId => {
        saveActiveAquarium(aquariumId);
        setSelectedAquariumId(aquariumId);
    };

    const isAdmin = user?.role === "admin";
    // member, owner, dan admin boleh mengubah akuarium; viewer hanya melihat monitoring
    const canControl = activeRole === "member" || activeRole === "owner" || activeRole === "admin";
    const isViewer = activeRole === "viewer";
    // Akuarium yang dimiliki user sebagai owner; halaman Access dibuka untuk admin dan siapa pun yang punya satu
    const ownedAquariums = aquariums.filter(item => item.role === "owner");
    const canOpenAccess = isAdmin || ownedAquariums.length > 0;

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                signIn,
                signOut,
                isAuthLoading,
                isAuthenticated: Boolean(user),
                aquariums,
                refreshAquariums: loadAquariums,
                activeAquariumId,
                activeRole,
                selectAquarium,
                isAdmin,
                canControl,
                canManageAccess: activeRole === "owner" || activeRole === "admin",
                canOpenAccess,
                isViewer,
                ownedAquariums,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}
