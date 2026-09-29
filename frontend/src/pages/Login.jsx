import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../api/service";
import { Eye, EyeOff, Fish, Lock, Mail } from "../components/Icons";
import { ErrorAlert, InputField, PrimaryBtn } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    setLoading(true);
    try {
      const { userProfile } = await login(email, password);
      setUser(userProfile);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-0 md:p-8"
      style={{
        background:
          "linear-gradient(160deg, #060d2c 0%, #0d1b4b 60%, #1e3a8a 100%)",
      }}
    >
      <div className="w-full max-w-[430px] min-h-screen md:min-h-0 flex flex-col md:rounded-3xl md:overflow-hidden md:shadow-2xl">
        {/* Hero top */}
        <div className="flex flex-col items-center pt-14 pb-8 px-6 text-white">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center mb-4">
            <Fish />
          </div>
          <h1 className="text-2xl font-bold tracking-wide mb-1">
            SMART AQUARIUM
          </h1>
          <p className="text-blue-300 text-sm text-center">
            Monitor and control your aquarium
            <br />
            from anywhere, anytime.
          </p>
        </div>

        {/* Form card */}
        <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10 space-y-4">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-800">Welcome back</h2>
            <p className="text-slate-400 text-sm">Sign in to your account</p>
          </div>

          <ErrorAlert message={error} />

          <form onSubmit={handleSubmit} className="space-y-4">
            <InputField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              icon={Mail}
              required
            />
            <InputField
              label="Password"
              type={showPw ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              icon={Lock}
              required
              right={
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="text-slate-400 p-1"
                >
                  {showPw ? <EyeOff /> : <Eye />}
                </button>
              }
            />
            <div className="pt-2">
              <PrimaryBtn type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </PrimaryBtn>
            </div>
          </form>

          <p className="text-center text-sm text-slate-500 pt-2">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="text-blue-500 font-semibold hover:underline"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
