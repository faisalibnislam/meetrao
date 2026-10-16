import Foundation

/// whoami:session. One round trip for "who is this" and "what may they see",
/// as the web's requireSession reads it.
nonisolated struct SessionInfo: Decodable, Equatable, Sendable {
    let authenticated: Bool
    let email: String?
    let emailVerified: Bool?
    let profile: Profile?
}

nonisolated struct Profile: Decodable, Equatable, Sendable, Identifiable {
    let id: String
    let username: String
    let fullName: String
    let email: String
    let timezone: String
    let avatarURL: String?
    let isSuspended: Bool
    let onboardingCompletedAt: String?
    let notifyNewBooking: Bool?
    let notifyBookingChanged: Bool?
    let notifyBookingCancelled: Bool?

    enum CodingKeys: String, CodingKey {
        case id, username, email, timezone
        case fullName = "full_name"
        case avatarURL = "avatar_url"
        case isSuspended = "is_suspended"
        case onboardingCompletedAt = "onboarding_completed_at"
        case notifyNewBooking = "notify_new_booking"
        case notifyBookingChanged = "notify_booking_changed"
        case notifyBookingCancelled = "notify_booking_cancelled"
    }

    /// What to call them: their name, or their link name until they set one.
    var displayName: String { fullName.isEmpty ? username : fullName }

    var timeZone: TimeZone { TimeZone(identifier: timezone) ?? .current }

    var isOnboarded: Bool { onboardingCompletedAt != nil }
}
