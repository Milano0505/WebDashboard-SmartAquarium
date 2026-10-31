import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginWithEmail } from "../api/backendApi";
import { EyeIcon, EyeOffIcon, FishIcon, LockIcon, MailIcon } from "../components/Icons";
import { ErrorAlert, InputField, PrimaryButton } from "../components/UiKit";
import { useAuth } from "../context/AuthContext";

// login page
export default function LoginPage() {
    // form state
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { completeSignIn } = useAuth();
    const navigate = useNavigate();

    // submit login
    const handleLoginSubmit = async event => {
        event.preventDefault();
        setErrorMessage("");
        if (!email || !password) {
            setErrorMessage("Please fill in all fields.");
            return;
        }
        setIsLoading(true);
        try {
            const { userProfile } = await loginWithEmail(email, password);
            await completeSignIn(userProfile);
            navigate("/dashboard", { replace: true });
        } catch (loginError) {
            setErrorMessage(loginError instanceof Error ? loginError.message : "Login failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center p-0 md:p-8"
            style={{
                background: "linear-gradient(160deg, #060d2c 0%, #0d1b4b 60%, #1e3a8a 100%)",
            }}
        >
            <div className="w-full max-w-[430px] min-h-screen md:min-h-0 flex flex-col md:rounded-3xl md:overflow-hidden md:shadow-2xl">
                {/* header */}
                <div className="flex flex-col items-center pt-14 pb-8 px-6 text-white">
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center mb-4">
                        <FishIcon />
                    </div>
                    <h1 className="text-2xl font-bold tracking-wide mb-1">SMART AQUARIUM</h1>
                    <p className="text-blue-300 text-sm text-center">
                        Monitor and control your aquarium
                        <br />
                        from anywhere, anytime.
                    </p>
                </div>

                {/* login form */}
                <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10 space-y-4">
                    <div className="mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Welcome back</h2>
                        <p className="text-slate-400 text-sm">Sign in to your account</p>
                    </div>

                    <ErrorAlert message={errorMessage} />

                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <InputField
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={event => setEmail(event.target.value)}
                            placeholder="you@email.com"
                            icon={MailIcon}
                            required
                        />
                        <InputField
                            label="Password"
                            type={isPasswordVisible ? "text" : "password"}
                            value={password}
                            onChange={event => setPassword(event.target.value)}
                            placeholder="••••••••"
                            icon={LockIcon}
                            required
                            right={
                                <button
                                    type="button"
                                    onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                                    className="text-slate-400 p-1"
                                >
                                    {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
                                </button>
                            }
                        />
                        <div className="pt-2">
                            <PrimaryButton type="submit" disabled={isLoading}>
                                {isLoading ? "Signing in…" : "Sign In"}
                            </PrimaryButton>
                        </div>
                    </form>

                    <p className="text-center text-sm text-slate-500 pt-2">
                        Don't have an account?{" "}
                        <Link to="/register" className="text-blue-500 font-semibold hover:underline">
                            Create one
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
