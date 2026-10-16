import Foundation

/// A host notification: somebody booked, moved, cancelled or declined.
nonisolated struct Notice: Decodable, Equatable, Sendable, Identifiable {
    let id: String
    let kind: String
    let title: String
    let body: String
    let bookingID: String?
    let readAt: String?
    let createdAtText: String

    enum CodingKeys: String, CodingKey {
        case id, kind, title, body
        case bookingID = "booking_id"
        case readAt = "read_at"
        case createdAtText = "created_at"
    }

    var isUnread: Bool { readAt == nil }
    var createdAt: Date { ISODate.parse(createdAtText) ?? .distantPast }

    var symbol: String {
        switch kind {
        case "booking_new": "calendar.badge.plus"
        case "booking_cancelled": "calendar.badge.minus"
        case "booking_declined": "person.crop.circle.badge.xmark"
        default: "calendar.badge.clock"
        }
    }
}
