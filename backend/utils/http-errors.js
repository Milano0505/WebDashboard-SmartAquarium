// error 400
export function badRequestError(message) {
    return Object.assign(new Error(message), { status: 400 });
}

// error 403
export function forbiddenError(message) {
    return Object.assign(new Error(message), { status: 403 });
}
