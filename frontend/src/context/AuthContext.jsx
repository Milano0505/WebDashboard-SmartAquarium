import { onAuthStateChanged } from "firebase/auth";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { logout as apiLogout, getAquariums, isAuthBusy, startSession, updateUserProfile } from "../api/service";
import { auth } from "../firebase";

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

// Status login dipegang Firebase Authentication (onAuthStateChanged). Profil, peran admin, dan daftar
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

    // Jalan sekali saat aplikasi dibuka, lalu setiap status login Firebase berubah
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

        const unsubscribe = onAuthStateChanged(auth, async firebaseUser => {
            if (!firebaseUser) {
                if (isMounted) {
                    clearSession();
                    setIsAuthLoading(false);
                }
                return;
            }
            // Login/register sedang berjalan; mereka memuat sesi sendiri lewat signIn()
            if (!isAuthBusy()) await loadSession();
            if (isMounted) setIsAuthLoading(false);
        });

        // Dipicu client API saat respons 401
        const handleUnauthorized = () => {
            apiLogout().catch(() => {});
            clearSession();
        };
        window.addEventListener("sa:unauthorized", handleUnauthorized);

        return () => {
            isMounted = false;
            unsubscribe();
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
    const canControl = activeRole === "owner" || activeRole === "admin";

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
                canManageAccess: canControl,
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
