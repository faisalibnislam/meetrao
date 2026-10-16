import Foundation

/// Plain HTTPS calls to Convex, for the few moments there is no live client
/// to use: signing in, refreshing a session, signing out.
///
/// Convex's HTTP API answers `{ status, value }` or `{ status: "error",
/// errorMessage, errorData }`; `errorData` is the ConvexError payload, the
/// only part written for people.
nonisolated struct ConvexHTTP: Sendable {
    let deploymentURL: String
    var session: URLSession = .shared

    private struct Envelope<T: Decodable>: Decodable {
        let status: String
        let value: T?
        let errorMessage: String?
        let errorData: JSONValue?
    }

    func action<T: Decodable>(_ path: String, args: [String: JSONValue], token: String? = nil) async throws -> T {
        try await call("api/action", path: path, args: args, token: token)
    }

    /// An action whose result is not needed (and may be null).
    func run(_ path: String, args: [String: JSONValue] = [:], token: String? = nil) async throws {
        let _: JSONValue? = try await call("api/action", path: path, args: args, token: token, allowNull: true)
    }

    private func call<T: Decodable>(_ endpoint: String, path: String, args: [String: JSONValue], token: String?) async throws -> T {
        guard let value: T = try await call(endpoint, path: path, args: args, token: token, allowNull: false) else {
            throw ConvexHTTPFailure(serverMessage: "\(path) returned nothing")
        }
        return value
    }

    private func call<T: Decodable>(
        _ endpoint: String, path: String, args: [String: JSONValue], token: String?, allowNull: Bool
    ) async throws -> T? {
        guard let url = URL(string: deploymentURL)?.appending(path: endpoint) else {
            throw MeetraoError(message: "The app is not configured.")
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        request.httpBody = try JSONEncoder().encode(
            ["path": JSONValue.string(path), "args": .object(args), "format": .string("json")]
        )

        let (data, _): (Data, URLResponse)
        do {
            (data, _) = try await session.data(for: request)
        } catch {
            throw NetworkFailure()
        }
        let envelope = try JSONDecoder().decode(Envelope<T>.self, from: data)
        if envelope.status == "success" {
            if envelope.value != nil || allowNull { return envelope.value }
        }
        if let message = envelope.errorData?.message { throw MeetraoError(message: message) }
        throw ConvexHTTPFailure(serverMessage: envelope.errorMessage ?? "")
    }
}

/// The request never got an answer: offline, DNS, a dropped connection.
/// Kept distinct so a refresh that fails this way never signs anybody out.
nonisolated struct NetworkFailure: Error, Sendable {}

/// A failure Convex did not explain to people. Kept apart from MeetraoError so
/// a caller can tell "the server said no" from "the server broke".
nonisolated struct ConvexHTTPFailure: Error, Sendable {
    let serverMessage: String
}

/// Enough of JSON to build arguments and read error payloads.
nonisolated enum JSONValue: Codable, Equatable, Sendable {
    case string(String)
    case number(Double)
    case bool(Bool)
    case object([String: JSONValue])
    case array([JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() { self = .null }
        else if let value = try? container.decode(Bool.self) { self = .bool(value) }
        else if let value = try? container.decode(Double.self) { self = .number(value) }
        else if let value = try? container.decode(String.self) { self = .string(value) }
        else if let value = try? container.decode([JSONValue].self) { self = .array(value) }
        else { self = .object(try container.decode([String: JSONValue].self)) }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .bool(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .null: try container.encodeNil()
        }
    }

    /// `{ message }` or a bare string: the two shapes a ConvexError's data takes here.
    var message: String? {
        switch self {
        case .string(let text): text
        case .object(let object): if case .string(let text)? = object["message"] { text } else { nil }
        default: nil
        }
    }
}
