@preconcurrency import ConvexMobile
import Foundation
import os

/// An error a person can read.
///
/// Convex delivers a ConvexError's `data` verbatim and redacts everything
/// else, so only that carries a message meant for people; anything else is a
/// bug or an outage and gets the caller's fallback line, as on the web
/// (src/lib/convex/error.ts).
nonisolated struct MeetraoError: LocalizedError, Equatable, Sendable {
    let message: String
    /// True when the session is gone and the person has to sign in again.
    var signedOut = false

    var errorDescription: String? { message }

    static let signedOut = MeetraoError(message: "Sign in again to continue.", signedOut: true)
    static let offline = MeetraoError(message: "You're offline. Check your connection and try again.")

    private static let log = Logger(subsystem: "com.meetrao.app", category: "errors")

    /// The readable part of whatever was thrown.
    static func from(_ error: Error, fallback: String = "That didn't work. Try again.") -> MeetraoError {
        if let error = error as? MeetraoError { return error }
        // What people see is the fallback; what happened is in the log for whoever debugs it.
        #if DEBUG
        log.error("\(String(describing: error), privacy: .public)")
        #else
        log.error("\(String(describing: error), privacy: .private)")
        #endif
        if error is NetworkFailure { return .offline }
        if let error = error as? ClientError {
            switch error {
            case .ConvexError(let data):
                return MeetraoError(message: message(fromConvexData: data) ?? fallback)
            case .ServerError, .InternalError:
                return MeetraoError(message: fallback)
            }
        }
        if let error = error as? URLError, [.notConnectedToInternet, .networkConnectionLost, .timedOut].contains(error.code) {
            return .offline
        }
        return MeetraoError(message: fallback)
    }

    /// ConvexError data is `{ message, code }` from convex/lib/errors.ts, or a bare string.
    static func message(fromConvexData data: String) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: Data(data.utf8), options: [.fragmentsAllowed]) else {
            return nil
        }
        if let text = json as? String { return text }
        if let object = json as? [String: Any], let text = object["message"] as? String { return text }
        return nil
    }
}
