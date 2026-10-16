import Foundation

/// The timezones a host can choose, the same 94 the web offers
/// (src/lib/timezones.ts), so a schedule saved here is one the web can show.
/// src/lib/ios/sync.test.ts fails if the two lists drift apart.
nonisolated enum Timezones {
    static let all: [String] = [
        "Pacific/Midway", "Pacific/Honolulu", "America/Anchorage", "America/Los_Angeles",
        "America/Vancouver", "America/Tijuana", "America/Denver", "America/Phoenix",
        "America/Edmonton", "America/Chicago", "America/Mexico_City", "America/Winnipeg",
        "America/Guatemala", "America/Bogota", "America/Lima", "America/New_York",
        "America/Toronto", "America/Panama", "America/Halifax", "America/Santiago",
        "America/Caracas", "America/Sao_Paulo", "America/Argentina/Buenos_Aires", "America/Montevideo",
        "Atlantic/South_Georgia", "Atlantic/Azores", "Atlantic/Cape_Verde", "UTC",
        "Europe/London", "Europe/Dublin", "Europe/Lisbon", "Africa/Casablanca",
        "Africa/Lagos", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
        "Europe/Rome", "Europe/Amsterdam", "Europe/Brussels", "Europe/Zurich",
        "Europe/Vienna", "Europe/Prague", "Europe/Warsaw", "Europe/Stockholm",
        "Europe/Oslo", "Europe/Copenhagen", "Europe/Budapest", "Africa/Johannesburg",
        "Africa/Cairo", "Europe/Athens", "Europe/Helsinki", "Europe/Bucharest",
        "Europe/Kyiv", "Europe/Istanbul", "Asia/Jerusalem", "Africa/Nairobi",
        "Europe/Moscow", "Asia/Riyadh", "Asia/Baghdad", "Asia/Tehran",
        "Asia/Dubai", "Asia/Baku", "Asia/Kabul", "Asia/Karachi",
        "Asia/Tashkent", "Asia/Kolkata", "Asia/Colombo", "Asia/Kathmandu",
        "Asia/Dhaka", "Asia/Almaty", "Asia/Yangon", "Asia/Bangkok",
        "Asia/Jakarta", "Asia/Ho_Chi_Minh", "Asia/Shanghai", "Asia/Hong_Kong",
        "Asia/Singapore", "Asia/Kuala_Lumpur", "Asia/Manila", "Asia/Taipei",
        "Australia/Perth", "Asia/Tokyo", "Asia/Seoul", "Australia/Adelaide",
        "Australia/Darwin", "Australia/Brisbane", "Australia/Sydney", "Australia/Melbourne",
        "Pacific/Guam", "Pacific/Noumea", "Pacific/Auckland", "Pacific/Fiji",
        "Pacific/Tongatapu", "Pacific/Kiritimati",
    ]

    /// "GMT+06:00  Dhaka", ordered west to east, as the web labels them.
    static func label(_ identifier: String, at date: Date = .now) -> String {
        guard let zone = TimeZone(identifier: identifier) else { return identifier }
        let seconds = zone.secondsFromGMT(for: date)
        let sign = seconds < 0 ? "−" : "+"
        let minutes = abs(seconds) / 60
        let offset = seconds == 0 ? "GMT+00:00" : String(format: "GMT%@%02d:%02d", sign, minutes / 60, minutes % 60)
        let city = identifier == "UTC" ? "UTC" : (identifier.split(separator: "/").last.map(String.init) ?? identifier).replacingOccurrences(of: "_", with: " ")
        return "\(offset)  \(city)"
    }

    static func sorted(at date: Date = .now) -> [String] {
        all.sorted {
            let a = TimeZone(identifier: $0)?.secondsFromGMT(for: date) ?? 0
            let b = TimeZone(identifier: $1)?.secondsFromGMT(for: date) ?? 0
            return a == b ? label($0, at: date) < label($1, at: date) : a < b
        }
    }
}
