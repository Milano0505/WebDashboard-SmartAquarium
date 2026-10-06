import { createContext, useContext, useEffect, useState } from "react";
import { logout as apiLogout, getToken, getUserProfile, updateUserProfile } from "../api/service";

const AuthContext = createContext(null);
const USER_KEY = "sa_user";

// ---------- Fungsi bantu ----------

// Versi lama bisa menyimpan URL blob: sebagai foto profil; URL ini rusak setelah reload
const isBlobUrl = url => typeof url === "string" && url.startsWith("blob:");

function readStoredUser() {
    try {
        const storedUser = JSON.parse(localStorage.getItem(USER_KEY));
        return isBlobUrl(storedUser?.photoUrl) ? { ...storedUser, photoUrl: null } : storedUser;
    } catch {
        return null;
    }
}

function clearStoredUser() {
    try {
        localStorage.removeItem(USER_KEY);
    } catch (error) {
        console.warn("Unable to remove the saved user profile.", error);
    }
}

// ---------- Provider ----------

// Simpan user di localStorage dan validasi ulang sesi ke API saat aplikasi dibuka
export function AuthProvider({ children }) {
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [user, setUser] = useState(readStoredUser);

    const saveUser = userData => {
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        setUser(userData);
    };

    const signOut = async () => {
        try {
            await apiLogout();
        } finally {
            setUser(null);
            clearStoredUser();
        }
    };

    // Jalan sekali saat aplikasi dibuka
    useEffect(() => {
        let isMounted = true;

        // Dipicu client API saat respons 401
        const handleUnauthorized = () => {
            setUser(null);
            setIsAuthLoading(false);
        };
        window.addEventListener("sa:unauthorized", handleUnauthorized);

        const endSession = async () => {
            try {
                await apiLogout();
            } catch (error) {
                console.warn("Unable to clear the session token.", error);
            }
            clearStoredUser();
            if (isMounted) setUser(null);
        };

        const validateSession = async () => {
            try {
                if (!user || !getToken()) {
                    await endSession();
                    return;
                }

                // Perbarui profil dari server
                const profile = await getUserProfile(user.id || user.userId);
                if (isBlobUrl(profile.photoUrl)) {
                    await updateUserProfile(profile.id, { photoUrl: null }).catch(error =>
                        console.warn("Unable to clear a temporary profile photo URL.", error),
                    );
                    profile.photoUrl = null;
                }
                if (isMounted) saveUser(profile);
            } catch (error) {
                if (error.status === 401 || error.status === 404) await endSession();
                else console.warn("Unable to validate the saved session.", error);
            } finally {
                if (isMounted) setIsAuthLoading(false);
            }
        };

        validateSession();
        return () => {
            isMounted = false;
            window.removeEventListener("sa:unauthorized", handleUnauthorized);
        };
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                setUser: saveUser,
                signOut,
                isAuthLoading,
                isAuthenticated: Boolean(user && getToken()),
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
