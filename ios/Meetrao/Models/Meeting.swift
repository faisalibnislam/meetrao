import Foundation

/// A meeting type: what a guest books.
nonisolated struct Meeting: Decodable, Equatable, Sendable, Identifiable, Hashable {
    let id: String
    let name: String
    let description: String
    let slug: String
    let durationMinutes: Int
    let bufferMinutes: Int
    let minimumNoticeMinutes: Int
    let bookingWindowDays: Int
    let location: String
    let locationDetail: String?
    let capacity: Int?
    let isActive: Bool
    let scheduleID: String?
    let companyID: String?

    enum CodingKeys: String, CodingKey {
        case id, name, description, slug, location, capacity
        case durationMinutes = "duration_minutes"
        case bufferMinutes = "buffer_minutes"
        case minimumNoticeMinutes = "minimum_notice_minutes"
        case bookingWindowDays = "booking_window_days"
        case locationDetail = "location_detail"
        case isActive = "is_active"
        case scheduleID = "schedule_id"
        case companyID = "company_id"
    }

    var seats: Int { capacity ?? 1 }
}

/// The four ways a meeting happens, as convex/meetingTypes.ts allows them.
nonisolated enum MeetingLocation: String, CaseIterable, Identifiable, Sendable {
    case googleMeet = "google_meet"
    case phone
    case inPerson = "in_person"
    case custom

    var id: String { rawValue }

    var label: String {
        switch self {
        case .googleMeet: "Google Meet"
        case .phone: "Phone call"
        case .inPerson: "In person"
        case .custom: "Something else"
        }
    }

    var symbol: String {
        switch self {
        case .googleMeet: "video"
        case .phone: "phone"
        case .inPerson: "mappin.and.ellipse"
        case .custom: "text.bubble"
        }
    }

    var detailPrompt: String? {
        switch self {
        case .googleMeet: nil
        case .phone: "The number, or who calls whom"
        case .inPerson: "The address guests should come to"
        case .custom: "Zoom, Teams, a note: whatever you tell guests"
        }
    }

    init(raw: String) {
        self = MeetingLocation(rawValue: raw) ?? .googleMeet
    }
}

/// The choices the web's meeting form offers, and the only values the
/// server-side validation in src/lib/actions/meetings.ts accepts.
nonisolated enum MeetingChoices {
    static let durations = [15, 30, 45, 60]

    /// The presets, plus the meeting's own length when the web gave it a
    /// custom one (anything from 5 to 480), so the picker never opens blank.
    static func durations(including current: Int) -> [Int] {
        durations.contains(current) ? durations : (durations + [current]).sorted()
    }
    static let buffers = [0, 5, 10, 15]
    static let notices = [60, 120, 240, 720, 1440]
    static let windows = [7, 14, 30, 60]

    static func minutesLabel(_ minutes: Int) -> String {
        if minutes == 0 { return "None" }
        if minutes < 60 { return "\(minutes) min" }
        if minutes % 1440 == 0 { return minutes == 1440 ? "1 day" : "\(minutes / 1440) days" }
        let hours = minutes / 60
        return hours == 1 ? "1 hour" : "\(hours) hours"
    }

    /// The same rule as slugify in src/lib/username.ts.
    static func slug(for name: String) -> String {
        let lowered = name.lowercased()
        var out = ""
        var lastWasDash = false
        for scalar in lowered.unicodeScalars {
            if (scalar >= "a" && scalar <= "z") || (scalar >= "0" && scalar <= "9") {
                out.unicodeScalars.append(scalar)
                lastWasDash = false
            } else if !lastWasDash {
                out.append("-")
                lastWasDash = true
            }
        }
        let trimmed = out.trimmingCharacters(in: CharacterSet(charactersIn: "-"))
        let capped = String(trimmed.prefix(78))
        return capped.isEmpty ? "meeting" : capped
    }

    /// The slug, made unique against the host's other meetings the way the web does.
    static func uniqueSlug(for name: String, taken: Set<String>) -> String {
        let base = slug(for: name)
        if !taken.contains(base) { return base }
        var n = 2
        while taken.contains("\(base)-\(n)") { n += 1 }
        return "\(base)-\(n)"
    }
}
