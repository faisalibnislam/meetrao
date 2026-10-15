import Foundation

/// What the "Next meeting" widget shows, written by the app whenever its
/// bookings change.
///
/// The widget never signs in or calls the backend itself: a second process
/// refreshing the same session would rotate the refresh token out from under
/// the app. Instead the app hands over the next few bookings, and the widget
/// builds a timeline from them, so "next" moves on as meetings start without
/// the app running.
nonisolated struct WidgetSnapshot: Codable, Equatable, Sendable {
    struct Item: Codable, Equatable, Sendable, Identifiable {
        var id: String
        var guest: String
        var meeting: String
        var startsAt: Date
        var endsAt: Date
        var joinURL: URL?
    }

    var workspace: String
    var items: [Item]
    var updatedAt: Date

    private static let account = "widget.snapshot"

    static func load() -> WidgetSnapshot? {
        guard let data = SharedKeychain.read(account) else { return nil }
        return try? JSONDecoder.snapshot.decode(WidgetSnapshot.self, from: data)
    }

    func save() {
        guard let data = try? JSONEncoder.snapshot.encode(self) else { return }
        SharedKeychain.write(data, account: Self.account)
    }

    static func clear() {
        SharedKeychain.delete(account)
    }

    /// The meeting to show at `date`: the one in progress, else the next one.
    func current(at date: Date) -> Item? {
        items
            .filter { $0.endsAt > date }
            .min { $0.startsAt < $1.startsAt }
    }

    /// The moments the widget should redraw: each start and each end.
    func changePoints(after date: Date) -> [Date] {
        items.flatMap { [$0.startsAt, $0.endsAt] }.filter { $0 > date }.sorted()
    }
}

nonisolated extension JSONEncoder {
    static var snapshot: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        return encoder
    }
}

nonisolated extension JSONDecoder {
    static var snapshot: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
