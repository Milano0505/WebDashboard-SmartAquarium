import { Component } from "react";

// error boundary
export default class ErrorBoundary extends Component {
    state = { error: null };

    static getDerivedStateFromError(error) {
        return { error };
    }

    componentDidCatch(error, info) {
        console.error("The app crashed while rendering.", error, info?.componentStack);
    }

    render() {
        if (!this.state.error) return this.props.children;
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
                <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <div className="text-3xl" aria-hidden="true">
                        🐠
                    </div>
                    <h1 className="mt-2 text-lg font-bold text-slate-800">Something went wrong</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        The page could not be displayed. Reloading usually fixes it.
                    </p>
                    <p className="mt-3 break-words rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
                        {this.state.error.message || "Unknown error"}
                    </p>
                    <button
                        type="button"
                        onClick={() => window.location.assign("/")}
                        className="mt-4 w-full rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white hover:bg-blue-600"
                    >
                        Reload
                    </button>
                </div>
            </div>
        );
    }
}
