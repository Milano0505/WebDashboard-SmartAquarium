import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerAccount } from "../api/backendApi";
import {
    CameraIcon,
    ChevronLeftIcon,
    EyeIcon,
    EyeOffIcon,
    FishIcon,
    LockIcon,
    MailIcon,
    UserIcon,
} from "../components/Icons";
import { ErrorAlert, InputField, PrimaryButton, SuccessAlert } from "../components/UiKit";
import { useAuth } from "../context/AuthContext";
import { getInitials } from "../utils/displayFormatters";
import { createProfilePhotoDataUrl } from "../utils/profilePhoto";

// register page
export default function RegisterPage() {
    // form state
    const [registerForm, setRegisterForm] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
    const [avatarFile, setAvatarFile] = useState(null);
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [confirmationSent, setConfirmationSent] = useState(false);
    const { completeSignIn } = useAuth();
    const navigate = useNavigate();
    const avatarFileInputRef = useRef();

    // revoke preview
    useEffect(
        () => () => {
            if (avatarPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(avatarPreviewUrl);
        },
        [avatarPreviewUrl],
    );

    // update field
    const updateFormField = fieldName => event =>
        setRegisterForm(current => ({ ...current, [fieldName]: event.target.value }));

    // avatar selected
    const handleAvatarSelected = event => {
        const file = event.target.files[0];
        if (!file) return;
        try {
            setAvatarFile(file);
            setAvatarPreviewUrl(URL.createObjectURL(file));
        } catch (error) {
            setErrorMessage(error instanceof Error ? error.message : "Could not load the selected photo.");
        }
    };

    // submit register
    const handleRegisterSubmit = async event => {
        event.preventDefault();
        setErrorMessage("");
        if (!registerForm.fullName || !registerForm.email || !registerForm.password) {
            setErrorMessage("Please fill in all required fields.");
            return;
        }
        if (registerForm.password !== registerForm.confirmPassword) {
            setErrorMessage("Passwords do not match.");
            return;
        }
        if (registerForm.password.length < 6) {
            setErrorMessage("Password must be at least 6 characters.");
            return;
        }
        setIsLoading(true);
        try {
            const photoUrl = avatarFile ? await createProfilePhotoDataUrl(avatarFile) : null;
            const { userProfile, needsConfirmation } = await registerAccount({
                fullName: registerForm.fullName,
                email: registerForm.email,
                password: registerForm.password,
                photoUrl,
            });
            if (needsConfirmation) {
                setConfirmationSent(true);
                return;
            }
            await completeSignIn(userProfile);
            navigate("/dashboard", { replace: true });
        } catch (registrationError) {
            setErrorMessage(registrationError instanceof Error ? registrationError.message : "Registration failed.");
        } finally {
            setIsLoading(false);
        }
    };

    // confirmation view
    if (confirmationSent) {
        return (
            <div
                className="min-h-screen flex items-center justify-center p-4"
                style={{ background: "linear-gradient(160deg, #060d2c 0%, #0d1b4b 60%, #1e3a8a 100%)" }}
            >
                <div className="w-full max-w-[430px] space-y-4 rounded-3xl bg-white p-6">
                    <SuccessAlert message="Account created. Check your email to confirm it, then sign in." />
                    <Link to="/login" className="block text-center text-sm font-semibold text-blue-500 hover:underline">
                        Go to sign in
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex items-center justify-center p-0 md:p-8"
            style={{
                background: "linear-gradient(160deg, #060d2c 0%, #0d1b4b 60%, #1e3a8a 100%)",
            }}
        >
            <div className="w-full max-w-[430px] min-h-screen md:min-h-0 flex flex-col md:rounded-3xl md:overflow-hidden md:shadow-2xl">
                {/* header */}
                <div className="flex flex-col items-center pt-10 pb-6 px-6 text-white">
                    <button
                        onClick={() => navigate("/login")}
                        className="self-start flex items-center gap-1 text-blue-300 hover:text-white text-sm font-semibold mb-4 transition-colors"
                    >
                        <ChevronLeftIcon /> Back to Sign In
                    </button>
                    <div className="w-16 h-16 rounded-2xl bg-blue-500/30 border border-blue-400/40 flex items-center justify-center mb-4">
                        <FishIcon />
                    </div>
                    <h1 className="text-2xl font-bold tracking-wide mb-1">SMART AQUARIUM</h1>
                    <p className="text-blue-300 text-sm text-center">Create your account to get started.</p>
                </div>

                {/* register form */}
                <div className="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10 space-y-4 overflow-y-auto scroll-area">
                    <div className="mb-2">
                        <h2 className="text-xl font-bold text-slate-800">Create Account</h2>
                        <p className="text-slate-400 text-sm">Fill in your details below</p>
                    </div>

                    <ErrorAlert message={errorMessage} />

                    {/* avatar picker */}
                    <div className="flex flex-col items-center pb-2">
                        <button
                            type="button"
                            onClick={() => avatarFileInputRef.current?.click()}
                            className="w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50 hover:border-blue-400 transition-colors relative group"
                        >
                            {avatarPreviewUrl ? (
                                <img src={avatarPreviewUrl} alt="avatar" className="w-full h-full object-cover" />
                            ) : registerForm.fullName ? (
                                <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                                    {getInitials(registerForm.fullName)}
                                </div>
                            ) : (
                                <CameraIcon />
                            )}
                            <div className="absolute inset-0 bg-black/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                <span className="text-white text-xs font-semibold">Edit</span>
                            </div>
                        </button>
                        <p className="text-xs text-slate-400 mt-2">Profile photo (optional)</p>
                        <input
                            ref={avatarFileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarSelected}
                            className="hidden"
                        />
                    </div>

                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                        <InputField
                            label="Full Name"
                            type="text"
                            value={registerForm.fullName}
                            onChange={updateFormField("fullName")}
                            placeholder="Juan dela Cruz"
                            icon={UserIcon}
                            required
                        />
                        <InputField
                            label="Email Address"
                            type="email"
                            value={registerForm.email}
                            onChange={updateFormField("email")}
                            placeholder="you@email.com"
                            icon={MailIcon}
                            required
                        />
                        <InputField
                            label="Password"
                            type={isPasswordVisible ? "text" : "password"}
                            value={registerForm.password}
                            onChange={updateFormField("password")}
                            placeholder="At least 6 characters"
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
                        <InputField
                            label="Confirm Password"
                            type="password"
                            value={registerForm.confirmPassword}
                            onChange={updateFormField("confirmPassword")}
                            placeholder="Repeat your password"
                            icon={LockIcon}
                            required
                        />

                        <div className="pt-2">
                            <PrimaryButton type="submit" disabled={isLoading}>
                                {isLoading ? "Creating account…" : "Create Account"}
                            </PrimaryButton>
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
