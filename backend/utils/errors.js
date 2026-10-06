// Dilempar di route; error handler di index.js mengubahnya jadi respons 400
export function badRequest(message) {
    return Object.assign(new Error(message), { status: 400 });
}
