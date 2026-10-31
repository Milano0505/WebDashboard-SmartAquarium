import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
    logoutAccount,
    getAquariumList,
    isAuthInProgress,
    syncBackendSession,
    updateUserProfile,
} from "../api/backendApi";
import { supabaseAuth } from "../supabaseAuth";

// auth context
const AuthContext = createContext(null);
// storage key
const ACTIVE_AQUARIUM_STORAGE_KEY = "sa_active_aquarium";

// blob url
const isBlobUrl = url => typeof url === "string" && url.startsWith("blob:");

// stored aquarium
function readStoredAquariumId() {
    try {
        return localStorage.getItem(ACTIVE_AQUARIUM_STORAGE_KEY);
    } catch {
        return null;
    }
}

// store aquarium
function storeActiveAquariumId(aquariumId) {
    try {
        if (aquariumId) localStorage.setItem(ACTIVE_AQUARIUM_STORAGE_KEY, aquariumId);
        else localStorage.removeItem(ACTIVE_AQUARIUM_STORAGE_KEY);
    } catch (error) {
        console.warn("Unable to save the selected aquarium.", error);
    }
}

// auth provider
export function AuthProvider({ children }) {
    // auth state
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [aquariums, setAquariums] = useState([]);
    const [selectedAquariumId, setSelectedAquariumId] = useState(readStoredAquariumId);

    // load aquariums
    const loadAquariumList = useCallback(async () => {
        const { aquariums: aquariumList } = await getAquariumList();
        setAquariums(aquariumList);
        return aquariumList;
    }, []);

    // sign in
    const completeSignIn = useCallback(
        async profile => {
            setUser(profile);
            await loadAquariumList();
        },
        [loadAquariumList],
    );

    // clear auth
    const clearAuthState = useCallback(() => {
        setUser(null);
        setAquariums([]);
    }, []);

    // sign out
    const signOut = async () => {
        try {
            await logoutAccount();
        } finally {
            clearAuthState();
        }
    };

    // session listener
    useEffect(() => {
        let isMounted = true;

        // load session
        const loadSavedSession = async () => {
            try {
                const { userProfile } = await syncBackendSession();
                if (isBlobUrl(userProfile.photoUrl)) {
                    await updateUserProfile(userProfile.id, { photoUrl: null }).catch(error =>
                        console.warn("Unable to clear a temporary profile photo URL.", error),
                    );
                    userProfile.photoUrl = null;
                }
                const { aquariums: aquariumList } = await getAquariumList();
                if (!isMounted) return;
                setUser(userProfile);
                setAquariums(aquariumList);
            } catch (error) {
                if (error.status === 401) {
                    await logoutAccount().catch(() => {});
                    if (isMounted) clearAuthState();
                } else {
                    console.warn("Unable to validate the saved session.", error);
                }
            }
        };

        const {
            data: { subscription },
        } = supabaseAuth.onAuthStateChange((event, session) => {
            if (event === "TOKEN_REFRESHED") return;
            setTimeout(async () => {
                if (!session) {
                    if (isMounted) {
                        clearAuthState();
                        setIsAuthLoading(false);
                    }
                    return;
                }
                if (!isAuthInProgress()) await loadSavedSession();
                if (isMounted) setIsAuthLoading(false);
            }, 0);
        });

        // unauthorized handler
        const handleUnauthorizedEvent = () => {
            logoutAccount().catch(() => {});
            clearAuthState();
        };
        window.addEventListener("sa:unauthorized", handleUnauthorizedEvent);

        // context value
        return () => {
            isMounted = false;
            subscription.unsubscribe();
            window.removeEventListener("sa:unauthorized", handleUnauthorizedEvent);
        };
    }, [clearAuthState]);

    // active aquarium
    const activeAquarium = aquariums.find(aquarium => aquarium.id === selectedAquariumId) || aquariums[0] || null;
    const activeAquariumId = activeAquarium?.id ?? null;
    const activeAquariumRole = activeAquarium?.role ?? null;

    // select aquarium
    const selectActiveAquarium = aquariumId => {
        storeActiveAquariumId(aquariumId);
        setSelectedAquariumId(aquariumId);
    };

    // role flags
    const isAdmin = user?.role === "admin";
    const canControlAquarium =
        activeAquariumRole === "member" || activeAquariumRole === "owner" || activeAquariumRole === "admin";
    const isViewer = activeAquariumRole === "viewer";
    const ownedAquariums = aquariums.filter(aquarium => aquarium.role === "owner");
    const canOpenAccessPage = isAdmin || ownedAquariums.length > 0;

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser,
                completeSignIn,
                signOut,
                isAuthLoading,
                isAuthenticated: Boolean(user),
                aquariums,
                refreshAquariums: loadAquariumList,
                activeAquariumId,
                activeAquariumRole,
                selectActiveAquarium,
                isAdmin,
                canControlAquarium,
                canManageAccess: activeAquariumRole === "owner" || activeAquariumRole === "admin",
                canOpenAccessPage,
                isViewer,
                ownedAquariums,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

// auth hook
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used inside AuthProvider");
    return context;
}
