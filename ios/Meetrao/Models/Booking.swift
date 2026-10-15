import Foundation

/// bookings:listForScreen. The rows, the people the host invited to the
/// meetings they scheduled themselves, and nothing else the app needs.
nonisolated struct BookingsResponse: Decodable, Equatable, Sendable {
    let rows: [Booking]
    let invitees: [String: [Invitee]]
}

nonisolated struct Invitee: Decodable, Equatable, Sendable, Hashable {
    let name: String
    let email: String
}

nonisolated struct Booking: Decodable, Equatable, Sendable, Identifiable, Hashable {
    let id: String
    let reference: String
    let meetingName: String
    let durationMinutes: Int
    let guestName: String
    let guestEmail: String
    let guestNote: String
    let guestTimezone: String?
    let startsAtText: String
    let endsAtText: String
    let status: Status
    let cancelledBy: String?
    let meetURL: String?
    let location: String?
    let locationDetail: String?
    let hostCreated: Bool
    let answers: [Answer]?
    let guestRSVP: String?

    nonisolated enum Status: String, Decodable, Sendable {
        case confirmed, cancelled
    }

    nonisolated struct Answer: Decodable, Equatable, Sendable, Hashable {
        let label: String
        let value: String
    }

    enum CodingKeys: String, CodingKey {
        case id, reference, status, location, answers
        case meetingName = "meeting_name"
        case durationMinutes = "duration_minutes"
        case guestName = "guest_name"
        case guestEmail = "guest_email"
        case guestNote = "guest_note"
        case guestTimezone = "guest_timezone"
        case startsAtText = "starts_at"
        case endsAtText = "ends_at"
        case cancelledBy = "cancelled_by"
        case meetURL = "meet_url"
        case locationDetail = "location_detail"
        case hostCreated = "host_created"
        case guestRSVP = "guest_rsvp"
    }

    var startsAt: Date { ISODate.parse(startsAtText) ?? .distantPast }
    var endsAt: Date { ISODate.parse(endsAtText) ?? .distantPast }
    var isCancelled: Bool { status == .cancelled }
    var isPast: Bool { endsAt < .now }
    var meetingLocation: MeetingLocation { MeetingLocation(raw: location ?? "google_meet") }

    /// The link to open the meeting, when there is one to open.
    var joinURL: URL? {
        guard !isCancelled, !isPast, let meetURL, let url = URL(string: meetURL) else { return nil }
        return url
    }
}

/// bookings:getForHost: one booking, with everyone the host invited to it.
nonisolated struct BookingWithInvitees: Decodable, Equatable, Sendable {
    let booking: Booking
    let invitees: [Invitee]

    private enum CodingKeys: String, CodingKey { case invitees }

    init(from decoder: Decoder) throws {
        booking = try Booking(from: decoder)
        invitees = try decoder.container(keyedBy: CodingKeys.self).decodeIfPresent([Invitee].self, forKey: .invitees) ?? []
    }
}
