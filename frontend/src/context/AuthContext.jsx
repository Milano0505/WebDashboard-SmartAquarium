import { createContext, useContext, useEffect, useState } from "react";
import { logout as apiLogout, getToken, getUserProfile, updateUserProfile } from "../api/service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [user, setUser] = useState(() => {
        try {
            const storedUser = JSON.parse(localStorage.getItem("sa_user"));
            return storedUser?.photoUrl?.startsWith("blob:") ? { ...storedUser, photoUrl: null } : storedUser;
        } catch {
            return null;
        }
    });

    const signIn = userData => {
        localStorage.setItem("sa_user", JSON.stringify(userData));
        setUser(userData);
    };

    const signOut = async () => {
        try {
            await apiLogout();
        } finally {
            setUser(null);
            try {
                localStorage.removeItem("sa_user");
            } catch (error) {
                console.warn("Unable to remove the saved user profile.", error);
            }
        }
    };

    useEffect(() => {
        let isMounted = true;
        const handleUnauthorized = () => {
            setUser(null);
            setIsAuthLoading(false);
        };

        window.addEventListener("sa:unauthorized", handleUnauthorized);

        const validateSession = async () => {
            const token = getToken();
            if (!user || !token) {
                try {
                    await apiLogout();
                    localStorage.removeItem("sa_user");
                } catch (error) {
                    console.warn("Unable to clear an incomplete session.", error);
                } finally {
                    if (isMounted) {
                        setUser(null);
                        setIsAuthLoading(false);
                    }
                }
                return;
            }

            try {
                const profile = await getUserProfile(user.id || user.userId);
                if (profile.photoUrl?.startsWith("blob:")) {
                    try {
                        await updateUserProfile(profile.id, { photoUrl: null });
                    } catch (error) {
                        console.warn("Unable to clear a temporary profile photo URL.", error);
                    }
                    profile.photoUrl = null;
                }
                if (isMounted) {
                    localStorage.setItem("sa_user", JSON.stringify(profile));
                    setUser(profile);
                }
            } catch (error) {
                if (error.status === 401 || error.status === 404) {
                    try {
                        await apiLogout();
                        localStorage.removeItem("sa_user");
                    } catch (clearError) {
                        console.warn("Unable to clear an expired session.", clearError);
                    } finally {
                        if (isMounted) setUser(null);
                    }
                } else {
                    console.warn("Unable to validate the saved session.", error);
                }
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
                setUser: signIn,
                signOut,
                isAuthLoading,
                isAuthenticated: !!user && !!getToken(),
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
