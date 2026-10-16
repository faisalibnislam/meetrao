@preconcurrency import ConvexMobile
import Foundation

/// How somebody is signing in this time.
nonisolated enum SignInRequest: Sendable {
    case password(email: String, password: String)
    case signUp(email: String, password: String, name: String)
    /// The one-time code Convex handed back after Google, and the verifier
    /// this app kept from the start of that flow.
    case oauthCode(code: String, verifier: String)
    /// Apple's identity token and the raw nonce whose hash Apple signed.
    case apple(identityToken: String, nonce: String, name: String)
}

/// The account exists but its email is not confirmed yet. Convex Auth has
/// just sent (or re-sent) the confirmation link.
nonisolated struct VerificationSent: Error, Sendable {
    let email: String
}

/// What `auth:signIn` answers: tokens, a redirect to start OAuth, or "started"
/// (a verification email went out and there is no session yet).
nonisolated struct SignInResult: Decodable, Sendable {
    let tokens: AuthTokens?
    let redirect: String?
    let verifier: String?
    let started: Bool?
}

/// Convex Auth, for ConvexMobile.
///
/// ConvexMobile owns the WebSocket and asks this provider for a JWT whenever
/// it needs one, including after the server says the last one expired. This
/// provider owns the session: it signs in through `auth:signIn` exactly as the
/// web's Convex Auth client does, keeps the token pair in the Keychain, and
/// refreshes it when it is about to expire.
///
/// Not main-actor bound: ConvexMobile calls it from its own tasks.
nonisolated final class ConvexAuthProvider: AuthProvider, @unchecked Sendable {
    typealias T = AuthTokens

    let http: ConvexHTTP
    private let refresher: TokenRefresher
    private let lock = NSLock()
    private var pending: SignInRequest?
    private var pushToken: (@Sendable (String?) -> Void)?

    init(deploymentURL: String) {
        http = ConvexHTTP(deploymentURL: deploymentURL)
        refresher = TokenRefresher(http: http)
    }

    /// What the next `login()` will do. Set immediately before calling it.
    func prepare(_ request: SignInRequest) {
        lock.withLock { pending = request }
    }

    private func remember(_ onIdToken: @escaping @Sendable (String?) -> Void) {
        lock.withLock { pushToken = onIdToken }
        refresher.onRefresh = onIdToken
    }

    // MARK: AuthProvider

    func login(onIdToken: @escaping @Sendable (String?) -> Void) async throws -> AuthTokens {
        let request = lock.withLock { () -> SignInRequest? in
            defer { pending = nil }
            return pending
        }
        guard let request else { throw MeetraoError(message: "Nothing to sign in with.") }

        let result: SignInResult = try await http.action("auth:signIn", args: Self.arguments(for: request))
        guard let tokens = result.tokens else {
            if result.started == true, let email = Self.email(in: request) { throw VerificationSent(email: email) }
            throw MeetraoError(message: "That didn't work. Try again.")
        }
        tokens.save()
        remember(onIdToken)
        return tokens
    }

    func loginFromCache(onIdToken: @escaping @Sendable (String?) -> Void) async throws -> AuthTokens {
        remember(onIdToken)
        return try await refresher.validTokens()
    }

    func logout() async throws {
        let tokens = AuthTokens.load()
        AuthTokens.clear()
        // Ends the session on the server too, so a stolen refresh token dies with it.
        if let tokens { try? await http.run("auth:signOut", token: tokens.token) }
    }

    func extractIdToken(from authResult: AuthTokens) -> String {
        authResult.token
    }

    /// A JWT that is good for at least another minute, for calls the app
    /// makes outside ConvexMobile (its routes on meetrao.com).
    func validToken() async throws -> String {
        try await refresher.validTokens().token
    }

    // MARK: Requests

    static func arguments(for request: SignInRequest) -> [String: JSONValue] {
        switch request {
        case .password(let email, let password):
            return ["provider": .string("password"), "params": .object([
                "email": .string(normalise(email)), "password": .string(password), "flow": .string("signIn"),
            ])]
        case .signUp(let email, let password, let name):
            return ["provider": .string("password"), "params": .object([
                "email": .string(normalise(email)), "password": .string(password),
                "name": .string(name.trimmingCharacters(in: .whitespacesAndNewlines)), "flow": .string("signUp"),
            ])]
        case .oauthCode(let code, let verifier):
            return ["params": .object(["code": .string(code)]), "verifier": .string(verifier)]
        case .apple(let identityToken, let nonce, let name):
            return ["provider": .string("apple-native"), "params": .object([
                "identityToken": .string(identityToken), "nonce": .string(nonce), "name": .string(name),
            ])]
        }
    }

    /// The same rule as the web and convex/auth.ts: one account per address, whatever the case.
    static func normalise(_ email: String) -> String {
        email.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    }

    private static func email(in request: SignInRequest) -> String? {
        switch request {
        case .password(let email, _), .signUp(let email, _, _): normalise(email)
        default: nil
        }
    }
}

/// Refreshes the session at most once at a time.
///
/// Convex Auth rotates the refresh token on every use. Two refreshes racing
/// would both spend the same token, and the loser would sign the person out,
/// so every caller waiting for a fresh token waits on the same request.
nonisolated final class TokenRefresher: @unchecked Sendable {
    private let http: ConvexHTTP
    private let lock = NSLock()
    private var inFlight: Task<AuthTokens, Error>?
    var onRefresh: (@Sendable (String?) -> Void)?

    /// Refresh this long before the JWT expires, not after.
    static let leeway: TimeInterval = 60

    init(http: ConvexHTTP) {
        self.http = http
    }

    func validTokens(now: Date = .now) async throws -> AuthTokens {
        guard let stored = AuthTokens.load() else { throw MeetraoError.signedOut }
        if let expiry = stored.expiresAt, expiry.timeIntervalSince(now) > Self.leeway { return stored }

        let task = lock.withLock { () -> Task<AuthTokens, Error> in
            if let inFlight { return inFlight }
            let task = Task { try await Self.refresh(stored, http: http) }
            inFlight = task
            return task
        }
        defer { lock.withLock { inFlight = nil } }
        do {
            let fresh = try await task.value
            onRefresh?(fresh.token)
            return fresh
        } catch let error as MeetraoError where error.signedOut {
            onRefresh?(nil)
            throw error
        }
    }

    private static func refresh(_ stored: AuthTokens, http: ConvexHTTP) async throws -> AuthTokens {
        let result: SignInResult
        do {
            result = try await http.action("auth:signIn", args: ["refreshToken": .string(stored.refreshToken)])
        } catch is NetworkFailure {
            // Offline is not signed out. Keep the session for when the network returns.
            throw MeetraoError.offline
        } catch {
            AuthTokens.clear()
            throw MeetraoError.signedOut
        }
        guard let tokens = result.tokens else {
            // The session was ended elsewhere, or has run its thirty days.
            AuthTokens.clear()
            throw MeetraoError.signedOut
        }
        tokens.save()
        return tokens
    }
}
