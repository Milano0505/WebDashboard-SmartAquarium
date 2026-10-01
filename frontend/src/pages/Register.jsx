import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../api/service";
import { Camera, ChevronLeft, Eye, EyeOff, Fish, Lock, Mail, User } from "../components/Icons";
import { ErrorAlert, InputField, PrimaryBtn } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { createProfilePhotoDataUrl } from "../utils/profilePhoto";

export default function RegisterPage() {
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirm: "",
    });
    const [avatar, setAvatar] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const { setUser } = useAuth();
    const navigate = useNavigate();
    const fileRef = useRef();

    useEffect(
        () => () => {
            if (avatar?.startsWith("blob:")) URL.revokeObjectURL(avatar);
        },
        [avatar],
    );

    const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

    const handleAvatar = e => {
        const file = e.target.files[0];
        if (!file) return;
        try {
            setAvatarFile(file);
            setAvatar(URL.createObjectURL(file));
        } catch (error) {
            setError(error instanceof Error ? error.message : "Could not load the selected photo.");
        }
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setError("");
        if (!form.name || !form.email || !form.password) {
            setError("Please fill in all required fields.");
            return;
        }
        if (form.password !== form.confirm) {
            setError("Passwords do not match.");
            return;
        }
        if (form.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        setLoading(true);
        try {
            const photoUrl = avatarFile ? await createProfilePhotoDataUrl(avatarFile) : null;
            const { userProfile } = await register({
                fullName: form.name,
                email: form.email,
                password: form.password,
                photoUrl,
            });
            setUser(userProfile);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed.");
        } finally {
            setLoading(false);
        }
    };

    const initials = form.name
        ? form.name
              .split(" ")
              .map(n => n[0])
              .join("")
              .toUpperCase()
              .slice(0, 2)
        : "?";

    return (
        <div
            className="min-h-screen flex items-center justify-center p-0 md:p-8"
            style={{
                background: "linear-gradient(160deg, #060d2c 0%, #0d1b4b 60%, #1e3a8a 100%)",
            }}
        >
            <div className="w-full max-w-[430px] min-h-screen md:min-h-0 flex flex-col md:rounded-3xl md:overflow-hidden md:shadow-2xl">
                {/* Registration header */}
                <div className="flex flex-col items-center pt-10 pb-6 px-6 text-white">
                    <button
                        onClick={() => navigate("/login")}
                        className="self-start flex items-center gap-1 text-blue-300 hover:text-white text-sm font-semibold mb-4 transition-colors"
                    >
                        <ChevronLeft /> Back to Sign In
                    </button>
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center mb-4">
                        <Fish />
                    </div>
                    <h1 className="text-2xl font-bold tracking-wide mb-1">SMART AQUARIUM</h1>
                    <p className="text-blue-300 text-sm text-center">Create your account to get started.</p>
                </div>

                {/* Registration form */}
                <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10 space-y-4 overflow-y-auto scroll-area">
                    <div className="mb-2">
                        <h2 className="text-xl font-bold text-slate-800">Create Account</h2>
                        <p className="text-slate-400 text-sm">Fill in your details below</p>
                    </div>

                    <ErrorAlert message={error} />

                    {/* Avatar picker */}
                    <div className="flex flex-col items-center pb-2">
                        <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 hover:border-blue-400 transition-colors relative group"
                        >
                            {avatar ? (
                                <img src={avatar} alt="avatar" className="w-full h-full object-cover" />
                            ) : form.name ? (
                                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                                    {initials}
                                </div>
                            ) : (
                                <Camera />
                            )}
                            <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                <span className="text-white text-xs font-semibold">Edit</span>
                            </div>
                        </button>
                        <p className="text-xs text-slate-400 mt-2">Profile photo (optional)</p>
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleAvatar} className="hidden" />
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <InputField
                            label="Full Name"
                            type="text"
                            value={form.name}
                            onChange={set("name")}
                            placeholder="Juan dela Cruz"
                            icon={User}
                            required
                        />
                        <InputField
                            label="Email Address"
                            type="email"
                            value={form.email}
                            onChange={set("email")}
                            placeholder="you@email.com"
                            icon={Mail}
                            required
                        />
                        <InputField
                            label="Password"
                            type={showPw ? "text" : "password"}
                            value={form.password}
                            onChange={set("password")}
                            placeholder="At least 6 characters"
                            icon={Lock}
                            required
                            right={
                                <button type="button" onClick={() => setShowPw(!showPw)} className="text-slate-400 p-1">
                                    {showPw ? <EyeOff /> : <Eye />}
                                </button>
                            }
                        />
                        <InputField
                            label="Confirm Password"
                            type="password"
                            value={form.confirm}
                            onChange={set("confirm")}
                            placeholder="Repeat your password"
                            icon={Lock}
                            required
                        />

                        <div className="pt-2">
                            <PrimaryBtn type="submit" disabled={loading}>
                                {loading ? "Creating account…" : "Create Account"}
                            </PrimaryBtn>
                        </div>
                    </form>

                    <p className="text-center text-sm text-slate-500 pt-2">
                        Already have an account?{" "}
                        <Link to="/login" className="text-blue-500 font-semibold hover:underline">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
