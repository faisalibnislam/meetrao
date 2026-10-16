import Foundation

/// companyAnalytics:forCompany. Raw rows; the numbers are worked out here,
/// in the viewer's timezone, as src/lib/company-analytics.ts does for the web.
nonisolated struct CompanyAnalyticsData: Decodable, Equatable, Sendable {
    let days: Int
    let now: Double
    let companyName: String
    let members: [Member]
    let bookings: [Row]

    nonisolated struct Member: Decodable, Equatable, Sendable, Identifiable {
        let userID: String
        let name: String
        let handle: String
        let role: String
        let activeLinks: Int

        var id: String { userID }

        enum CodingKeys: String, CodingKey {
            case name, handle, role
            case userID = "user_id"
            case activeLinks = "active_links"
        }
    }

    nonisolated struct Row: Decodable, Equatable, Sendable {
        let hostID: String
        let startsAt: Double
        let endsAt: Double
        let durationMinutes: Int
        let status: String
        let cancelledBy: String?
        let meetingName: String
        let guestName: String
        let createdAt: Double

        enum CodingKeys: String, CodingKey {
            case status
            case hostID = "host_id"
            case startsAt = "starts_at"
            case endsAt = "ends_at"
            case durationMinutes = "duration_minutes"
            case cancelledBy = "cancelled_by"
            case meetingName = "meeting_name"
            case guestName = "guest_name"
            case createdAt = "created_at"
        }

        var start: Date { ISODate.fromMilliseconds(startsAt) }
        var end: Date { ISODate.fromMilliseconds(endsAt) }
        var isConfirmed: Bool { status == "confirmed" }
    }

    enum CodingKeys: String, CodingKey {
        case days, now, members, bookings
        case companyName = "company_name"
    }
}

/// The company dashboard's numbers. Pure, from the rows and a clock, so it is testable.
nonisolated struct CompanySummary: Equatable, Sendable {
    struct Bucket: Equatable, Sendable, Identifiable {
        let day: Date
        let count: Int
        var id: Date { day }
    }

    struct NextUp: Equatable, Sendable, Identifiable {
        let member: CompanyAnalyticsData.Member
        let next: CompanyAnalyticsData.Row?
        var id: String { member.userID }
    }

    let today: Int
    let nextSevenDays: Int
    let booked: Int
    let cancelled: Int
    let hoursBooked: Double
    let perDay: [Bucket]
    let team: [NextUp]
    /// Members with no live link on this company: a handle that serves 404s.
    let silent: [CompanyAnalyticsData.Member]

    init(_ data: CompanyAnalyticsData, timeZone: TimeZone, now: Date = .now) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let startOfToday = calendar.startOfDay(for: now)
        let windowStart = calendar.date(byAdding: .day, value: -(data.days - 1), to: startOfToday) ?? startOfToday
        let weekAhead = calendar.date(byAdding: .day, value: 7, to: startOfToday) ?? now

        let confirmed = data.bookings.filter(\.isConfirmed)
        today = confirmed.filter { calendar.isDate($0.start, inSameDayAs: now) }.count
        nextSevenDays = confirmed.filter { $0.start >= now && $0.start < weekAhead }.count

        let inWindow = data.bookings.filter { $0.start >= windowStart && $0.start < calendar.date(byAdding: .day, value: 1, to: startOfToday)! }
        booked = inWindow.filter(\.isConfirmed).count
        cancelled = inWindow.filter { !$0.isConfirmed }.count
        hoursBooked = Double(inWindow.filter(\.isConfirmed).reduce(0) { $0 + $1.durationMinutes }) / 60

        perDay = (0..<data.days).compactMap { offset in
            guard let day = calendar.date(byAdding: .day, value: offset, to: windowStart) else { return nil }
            let count = confirmed.filter { calendar.isDate($0.start, inSameDayAs: day) }.count
            return Bucket(day: day, count: count)
        }

        team = data.members.map { member in
            let next = confirmed
                .filter { $0.hostID == member.userID && $0.end > now }
                .min { $0.startsAt < $1.startsAt }
            return NextUp(member: member, next: next)
        }
        .sorted { a, b in
            switch (a.next, b.next) {
            case let (x?, y?): x.startsAt < y.startsAt
            case (.some, nil): true
            case (nil, .some): false
            case (nil, nil): a.member.name < b.member.name
            }
        }
        silent = data.members.filter { $0.activeLinks == 0 }
    }
}
