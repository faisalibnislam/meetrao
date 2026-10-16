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
        let guestEmail: String?
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
            case guestEmail = "guest_email"
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

/// Every number on the company dashboard, worked out the way
/// src/lib/company-analytics.ts `summarise` does for the web, so the app and
/// the site never disagree. Pure, from the rows and a clock, so it is testable.
nonisolated struct CompanySummary: Equatable, Sendable {
    typealias Row = CompanyAnalyticsData.Row
    typealias Member = CompanyAnalyticsData.Member

    struct Today: Equatable, Sendable {
        let total: Int
        let remaining: Int
        let minutes: Int
    }

    struct Window: Equatable, Sendable {
        /// Confirmed and already started: meetings that have not happened
        /// yet are not work done.
        let held: Int
        let cancelled: Int
        /// Cancelled as a share of everything booked for the window, 0 to 1.
        let cancelRate: Double
        let minutes: Int
        /// Distinct guest addresses.
        let people: Int
        /// Median hours between booking and meeting, across kept meetings.
        let medianNoticeHours: Double?
    }

    struct Day: Equatable, Sendable, Identifiable {
        let day: Date
        let count: Int
        /// Ahead of today: bookings held, not work done, drawn lighter.
        let future: Bool
        var id: Date { day }
    }

    struct Load: Equatable, Sendable, Identifiable {
        let member: Member
        let held: Int
        let upcoming: Int
        let cancelled: Int
        let minutes: Int
        let next: Row?
        var id: String { member.userID }
    }

    struct Flag: Equatable, Sendable, Identifiable {
        enum Kind: Equatable, Sendable { case noLinks, idle, cancellations, overloaded }
        let kind: Kind
        let who: String
        let detail: String
        var id: String { "\(kind)-\(who)-\(detail)" }
    }

    struct MeetingCount: Equatable, Sendable, Identifiable {
        let name: String
        let count: Int
        let minutes: Int
        var id: String { name }
    }

    let days: Int
    let today: Today
    let next7: Int
    let window: Window
    let upNext: [Row]
    /// The whole window and up to a fortnight ahead, one entry a day.
    let perDay: [Day]
    let byMeeting: [MeetingCount]
    /// Kept meetings by weekday, Sunday first, and by hour of the day.
    let byWeekday: [Int]
    let byHour: [Int]
    let members: [Load]
    let flags: [Flag]

    init(_ data: CompanyAnalyticsData, timeZone: TimeZone, now: Date = .now) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let day: TimeInterval = 86_400
        let from = now.addingTimeInterval(-Double(data.days) * day)
        days = data.days

        let confirmed = data.bookings.filter(\.isConfirmed)

        let todayRows = confirmed.filter { calendar.isDate($0.start, inSameDayAs: now) }
        today = Today(
            total: todayRows.count,
            remaining: todayRows.filter { $0.end > now }.count,
            minutes: todayRows.reduce(0) { $0 + $1.durationMinutes }
        )
        next7 = confirmed.filter { $0.start >= now && $0.start < now.addingTimeInterval(7 * day) }.count

        let inWindow = data.bookings.filter { $0.start >= from && $0.start <= now }
        let heldRows = inWindow.filter(\.isConfirmed)
        let cancelledRows = inWindow.filter { !$0.isConfirmed }
        let notice = heldRows
            .map { ($0.startsAt - $0.createdAt) / 3_600_000 }
            .filter { $0 >= 0 }
        let guests = Set(heldRows.compactMap { $0.guestEmail?.trimmingCharacters(in: .whitespaces).lowercased() }.filter { !$0.isEmpty })
        window = Window(
            held: heldRows.count,
            cancelled: cancelledRows.count,
            cancelRate: inWindow.isEmpty ? 0 : Double(cancelledRows.count) / Double(inWindow.count),
            minutes: heldRows.reduce(0) { $0 + $1.durationMinutes },
            people: guests.count,
            medianNoticeHours: Self.median(notice)
        )

        let upcoming = confirmed.filter { $0.start >= now }.sorted { $0.startsAt < $1.startsAt }
        upNext = Array(upcoming.prefix(6))

        // A calendar walk rather than the rows, so an empty day is a gap in
        // the chart and not a missing column.
        perDay = (-13...data.days).reversed().map { offset in
            let at = now.addingTimeInterval(-Double(offset) * day)
            let count = confirmed.filter { calendar.isDate($0.start, inSameDayAs: at) }.count
            return Day(day: calendar.startOfDay(for: at), count: count, future: offset < 0)
        }

        var byName: [String: (count: Int, minutes: Int)] = [:]
        for row in heldRows {
            let at = byName[row.meetingName] ?? (0, 0)
            byName[row.meetingName] = (at.count + 1, at.minutes + row.durationMinutes)
        }
        byMeeting = byName
            .map { MeetingCount(name: $0.key, count: $0.value.count, minutes: $0.value.minutes) }
            .sorted { $0.count != $1.count ? $0.count > $1.count : $0.name < $1.name }

        var weekdays = Array(repeating: 0, count: 7)
        var hours = Array(repeating: 0, count: 24)
        for row in heldRows {
            weekdays[calendar.component(.weekday, from: row.start) - 1] += 1
            hours[calendar.component(.hour, from: row.start)] += 1
        }
        byWeekday = weekdays
        byHour = hours

        let load = data.members.map { member in
            let theirs = data.bookings.filter { $0.hostID == member.userID }
            let theirWindow = theirs.filter { $0.start >= from && $0.start <= now }
            let theirHeld = theirWindow.filter(\.isConfirmed)
            let theirUpcoming = theirs.filter { $0.isConfirmed && $0.start >= now }
            return Load(
                member: member,
                held: theirHeld.count,
                upcoming: theirUpcoming.count,
                cancelled: theirWindow.filter { !$0.isConfirmed }.count,
                minutes: theirHeld.reduce(0) { $0 + $1.durationMinutes },
                next: theirUpcoming.min { $0.startsAt < $1.startsAt }
            )
        }
        .sorted { a, b in
            let an = a.next?.startsAt ?? .infinity, bn = b.next?.startsAt ?? .infinity
            if an != bn { return an < bn }
            if a.held != b.held { return a.held > b.held }
            return a.member.name < b.member.name
        }
        members = load

        var flags: [Flag] = []
        for m in load {
            if m.member.activeLinks == 0 {
                flags.append(Flag(kind: .noLinks, who: m.member.name, detail: "No meeting is switched on, so /\(m.member.handle) answers nothing."))
            } else if m.upcoming == 0 && m.held == 0 {
                flags.append(Flag(kind: .idle, who: m.member.name, detail: "Nothing booked, and nothing in the last \(data.days) days."))
            } else if m.upcoming == 0 {
                flags.append(Flag(kind: .idle, who: m.member.name, detail: "Nothing booked from here on."))
            }
            if m.cancelled > 0 && m.cancelled >= m.held {
                flags.append(Flag(kind: .cancellations, who: m.member.name, detail: "\(m.cancelled) cancelled against \(m.held) held."))
            }
        }
        if load.count > 1 && window.held >= 4, let busiest = load.max(by: { $0.held < $1.held }) {
            let share = Double(busiest.held) / Double(window.held)
            if share >= 0.6 {
                flags.append(Flag(kind: .overloaded, who: busiest.member.name, detail: "Took \(Int((share * 100).rounded()))% of the meetings held in the last \(data.days) days."))
            }
        }
        self.flags = flags
    }

    private static func median(_ values: [Double]) -> Double? {
        guard !values.isEmpty else { return nil }
        let sorted = values.sorted()
        let middle = sorted.count / 2
        return sorted.count % 2 == 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
    }

    /// "29h 30m", or "45m", as the web writes hours.
    static func hours(_ minutes: Int) -> String {
        if minutes < 60 { return "\(minutes)m" }
        let h = minutes / 60, m = minutes % 60
        return m == 0 ? "\(h)h" : "\(h)h \(m)m"
    }
}
