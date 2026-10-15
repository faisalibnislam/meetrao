import Foundation

/// The session Convex Auth issued: a short-lived JWT (an hour) and the
/// refresh token that buys the next one. Refresh tokens rotate, so the pair is
/// always saved together.
nonisolated struct AuthTokens: Codable, Equatable, Sendable {
    var token: String
    var refreshToken: String

    private static let account = "auth.tokens"

    static func load() -> AuthTokens? {
        guard let data = SharedKeychain.read(account) else { return nil }
        return try? JSONDecoder().decode(AuthTokens.self, from: data)
    }

    func save() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        SharedKeychain.write(data, account: Self.account)
    }

    static func clear() {
        SharedKeychain.delete(account)
    }

    /// When the JWT stops being accepted, read from its own `exp` claim.
    var expiresAt: Date? { JWT.expiry(of: token) }
}

nonisolated enum JWT {
    /// The `exp` claim, without verifying anything: the server verifies, this
    /// only decides whether asking for a fresh token is worth it.
    static func expiry(of token: String) -> Date? {
        let parts = token.split(separator: ".")
        guard parts.count == 3 else { return nil }
        var payload = String(parts[1]).replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        payload += String(repeating: "=", count: (4 - payload.count % 4) % 4)
        guard
            let data = Data(base64Encoded: payload),
            let claims = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let exp = claims["exp"] as? Double
        else { return nil }
        return Date(timeIntervalSince1970: exp)
    }
}
