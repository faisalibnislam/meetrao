import Foundation

/// Convex hands instants to the app as ISO strings with milliseconds
/// (convex/lib/serialize.ts) and, in a few analytics rows, as epoch ms.
nonisolated enum ISODate {
    // ISO8601DateFormatter is documented as safe to share once configured.
    nonisolated(unsafe) private static let fractional: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    nonisolated(unsafe) private static let plain = ISO8601DateFormatter()

    static func parse(_ text: String?) -> Date? {
        guard let text else { return nil }
        return fractional.date(from: text) ?? plain.date(from: text)
    }

    static func fromMilliseconds(_ ms: Double) -> Date {
        Date(timeIntervalSince1970: ms / 1000)
    }
}

/// A calendar day in the HOST's timezone, written "2026-12-25", which is how
/// time off and the reschedule form name a day.
nonisolated struct CalendarDay: Hashable, Comparable, Sendable {
    let year: Int
    let month: Int
    let day: Int

    init(year: Int, month: Int, day: Int) {
        self.year = year
        self.month = month
        self.day = day
    }

    init(_ date: Date, in timeZone: TimeZone) {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        let parts = calendar.dateComponents([.year, .month, .day], from: date)
        self.init(year: parts.year ?? 1970, month: parts.month ?? 1, day: parts.day ?? 1)
    }

    init?(key: String) {
        let parts = key.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        self.init(year: parts[0], month: parts[1], day: parts[2])
    }

    var key: String { String(format: "%04d-%02d-%02d", year, month, day) }

    /// Midnight at the start of this day in `timeZone`.
    func start(in timeZone: TimeZone) -> Date {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = timeZone
        return calendar.date(from: DateComponents(year: year, month: month, day: day)) ?? .distantPast
    }

    static func < (a: CalendarDay, b: CalendarDay) -> Bool { a.key < b.key }
}

/// Minutes into a day, as availability rules store them: 540 is 09:00.
nonisolated enum DayMinutes {
    static func label(_ minutes: Int) -> String {
        let clamped = max(0, min(1440, minutes))
        if clamped == 1440 { return "Midnight" }
        var parts = DateComponents()
        parts.hour = clamped / 60
        parts.minute = clamped % 60
        let calendar = Calendar(identifier: .gregorian)
        let date = calendar.date(from: parts) ?? .now
        return date.formatted(date: .omitted, time: .shortened)
    }

    /// Every half hour, which is the grid the web's editor offers.
    static let halfHours: [Int] = Array(stride(from: 0, through: 1440, by: 30))
}
