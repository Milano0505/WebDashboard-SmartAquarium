// Dilempar di route; error handler di index.js mengubahnya jadi respons dengan status tersebut
export function badRequest(message) {
    return Object.assign(new Error(message), { status: 400 });
}

export function forbidden(message) {
    return Object.assign(new Error(message), { status: 403 });
}
