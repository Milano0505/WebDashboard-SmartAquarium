// icon frame
function IconFrame({ small = false, strokeWidth = 1.8, children }) {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className={small ? "w-4 h-4" : "w-5 h-5"}
        >
            {children}
        </svg>
    );
}

// fish icon
export const FishIcon = () => (
    <svg viewBox="0 0 24 24" className="w-6 h-6">
        <path
            d="M20.5 7.5C19 5.5 16.5 4 14 4c-2.5 0-5 1.5-7 4L4 6l2 6-2 6 3-2c2 2.5 4.5 4 7 4 2.5 0 5-1.5 6.5-3.5L22 12l-1.5-4.5z"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
        />
        <circle cx="16" cy="10" r="1.2" fill="currentColor" />
    </svg>
);

// dashboard icon
export const DashboardIcon = () => (
    <IconFrame>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
    </IconFrame>
);

// history icon
export const HistoryIcon = () => (
    <IconFrame>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 3" />
    </IconFrame>
);

// bell icon
export const BellIcon = () => (
    <IconFrame>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </IconFrame>
);

// settings icon
export const SettingsIcon = () => (
    <IconFrame>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </IconFrame>
);

// logout icon
export const LogoutIcon = () => (
    <IconFrame>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </IconFrame>
);

// chevron left
export const ChevronLeftIcon = () => (
    <IconFrame small strokeWidth={2}>
        <path d="M15 18l-6-6 6-6" />
    </IconFrame>
);

// chevron right
export const ChevronRightIcon = () => (
    <IconFrame small strokeWidth={2}>
        <path d="M9 18l6-6-6-6" />
    </IconFrame>
);

// user icon
export const UserIcon = () => (
    <IconFrame>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
    </IconFrame>
);

// mail icon
export const MailIcon = () => (
    <IconFrame>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </IconFrame>
);

// lock icon
export const LockIcon = () => (
    <IconFrame>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </IconFrame>
);

// camera icon
export const CameraIcon = () => (
    <IconFrame>
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
    </IconFrame>
);

// eye icon
export const EyeIcon = () => (
    <IconFrame small>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </IconFrame>
);

// eye off
export const EyeOffIcon = () => (
    <IconFrame small>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </IconFrame>
);

// check icon
export const CheckIcon = () => (
    <IconFrame small strokeWidth={2.5}>
        <polyline points="20 6 9 17 4 12" />
    </IconFrame>
);

// plus icon
export const PlusIcon = () => (
    <IconFrame small strokeWidth={2}>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </IconFrame>
);

// trash icon
export const TrashIcon = () => (
    <IconFrame small>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </IconFrame>
);

// download icon
export const DownloadIcon = () => (
    <IconFrame small>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </IconFrame>
);

// search icon
export const SearchIcon = () => (
    <IconFrame small>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </IconFrame>
);
