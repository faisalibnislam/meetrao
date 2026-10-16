import Foundation

/// availability:screen. Everything the Availability tab draws, in one read.
nonisolated struct AvailabilityScreen: Decodable, Equatable, Sendable {
    let schedules: [Schedule]
    let rules: [Rule]
    let meetings: [MeetingRef]
    let overrides: [TimeOff]

    nonisolated struct Schedule: Decodable, Equatable, Sendable, Identifiable, Hashable {
        let id: String
        let name: String
        let isDefault: Bool

        enum CodingKeys: String, CodingKey {
            case id, name
            case isDefault = "is_default"
        }
    }

    nonisolated struct Rule: Decodable, Equatable, Sendable {
        let scheduleID: String
        let weekday: Int
        let startMinute: Int
        let endMinute: Int

        enum CodingKeys: String, CodingKey {
            case weekday
            case scheduleID = "schedule_id"
            case startMinute = "start_minute"
            case endMinute = "end_minute"
        }
    }

    nonisolated struct MeetingRef: Decodable, Equatable, Sendable {
        let name: String
        let scheduleID: String?

        enum CodingKeys: String, CodingKey {
            case name
            case scheduleID = "schedule_id"
        }
    }

    nonisolated struct TimeOff: Decodable, Equatable, Sendable, Identifiable {
        let id: String
        let scheduleID: String
        let date: String
        let ranges: [Range]
        let note: String

        nonisolated struct Range: Codable, Equatable, Sendable, Hashable {
            var startMinute: Int
            var endMinute: Int

            enum CodingKeys: String, CodingKey {
                case startMinute = "start_minute"
                case endMinute = "end_minute"
            }
        }

        enum CodingKeys: String, CodingKey {
            case id, date, ranges, note
            case scheduleID = "schedule_id"
        }

        /// No ranges is a whole day off.
        var isWholeDay: Bool { ranges.isEmpty }
    }

    /// The schedule a meeting with no schedule of its own follows.
    var defaultSchedule: Schedule? { schedules.first(where: \.isDefault) ?? schedules.first }

    /// The names of the meetings each schedule answers for, as the web shows them.
    func meetingNames(for schedule: Schedule) -> [String] {
        meetings
            .filter { $0.scheduleID == schedule.id || ($0.scheduleID == nil && schedule.id == defaultSchedule?.id) }
            .map(\.name)
    }
}

/// One day of the week in the editor. Weekday is Sunday 0, as the server stores it.
nonisolated struct DayHours: Equatable, Sendable, Identifiable {
    var weekday: Int
    var isOn: Bool
    var ranges: [AvailabilityScreen.TimeOff.Range]

    var id: Int { weekday }

    /// Monday first: the working week is what a host is setting.
    static let order = [1, 2, 3, 4, 5, 6, 0]

    static func name(_ weekday: Int) -> String {
        Calendar(identifier: .gregorian).weekdaySymbols[weekday]
    }

    /// Rules to the seven days the editor shows.
    static func week(from rules: [AvailabilityScreen.Rule], schedule: String) -> [DayHours] {
        order.map { weekday in
            let ranges = rules
                .filter { $0.scheduleID == schedule && $0.weekday == weekday }
                .sorted { $0.startMinute < $1.startMinute }
                .map { AvailabilityScreen.TimeOff.Range(startMinute: $0.startMinute, endMinute: $0.endMinute) }
            return DayHours(
                weekday: weekday,
                isOn: !ranges.isEmpty,
                ranges: ranges.isEmpty ? [.init(startMinute: 540, endMinute: 1020)] : ranges
            )
        }
    }

    /// The same checks the web makes before saving (src/lib/actions/availability.ts).
    static func problem(in week: [DayHours]) -> String? {
        for day in week where day.isOn {
            for range in day.ranges {
                if range.startMinute < 0 || range.endMinute > 1440 { return "Hours have to sit inside a single day." }
                if range.endMinute <= range.startMinute { return "Each range has to end after it starts." }
            }
            let sorted = day.ranges.sorted { $0.startMinute < $1.startMinute }
            for (previous, next) in zip(sorted, sorted.dropFirst()) where next.startMinute < previous.endMinute {
                return "Two ranges on \(name(day.weekday)) overlap."
            }
        }
        return nil
    }
}
