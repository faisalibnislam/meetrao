import SwiftUI
import UIKit

/// Meetrao's look, inside an app that otherwise behaves like iOS: the green
/// for actions and selection, Instrument Serif for titles, the system font
/// for everything people read, so Dynamic Type and Bold Text keep working.
enum Theme {
    static let serifName = "InstrumentSerif-Regular"

    /// Large navigation titles in the serif, as the web's page titles are.
    static func configureAppearance() {
        let large = UIFont(name: serifName, size: 36) ?? .systemFont(ofSize: 34, weight: .bold)
        let scaled = UIFontMetrics(forTextStyle: .largeTitle).scaledFont(for: large)
        UINavigationBar.appearance().largeTitleTextAttributes = [.font: scaled]
    }
}

extension Font {
    /// Instrument Serif, scaled with Dynamic Type relative to `style`.
    static func serif(_ size: CGFloat, relativeTo style: Font.TextStyle = .title) -> Font {
        .custom(Theme.serifName, size: size, relativeTo: style)
    }
}

extension Color {
    static let accentSoft = Color("AccentSoft")
    /// The web's --ground: the beige page behind white cards.
    static let ground = Color("Ground")
}

extension View {
    /// Puts a screen's list or form on the beige ground, as on the web.
    func groundBackground() -> some View {
        scrollContentBackground(.hidden)
            .background(Color.ground.ignoresSafeArea())
    }
}

/// Times as the host reads them: in the host's own timezone, which is the
/// web's rule too. The guest's zone is shown only where it differs.
enum Format {
    static func time(_ date: Date, in zone: TimeZone) -> String {
        var style = Date.FormatStyle(date: .omitted, time: .shortened)
        style.timeZone = zone
        return date.formatted(style)
    }

    static func timeRange(_ start: Date, _ end: Date, in zone: TimeZone) -> String {
        "\(time(start, in: zone)) – \(time(end, in: zone))"
    }

    /// "Today", "Tomorrow", or "Wed 9 Oct".
    static func day(_ date: Date, in zone: TimeZone, now: Date = .now) -> String {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = zone
        if calendar.isDate(date, inSameDayAs: now) { return "Today" }
        if let tomorrow = calendar.date(byAdding: .day, value: 1, to: now), calendar.isDate(date, inSameDayAs: tomorrow) {
            return "Tomorrow"
        }
        if let yesterday = calendar.date(byAdding: .day, value: -1, to: now), calendar.isDate(date, inSameDayAs: yesterday) {
            return "Yesterday"
        }
        var style = Date.FormatStyle().weekday(.abbreviated).day().month(.abbreviated)
        if !calendar.isDate(date, equalTo: now, toGranularity: .year) { style = style.year() }
        style.timeZone = zone
        return date.formatted(style)
    }

    static func longDay(_ date: Date, in zone: TimeZone) -> String {
        var style = Date.FormatStyle().weekday(.wide).day().month(.wide).year()
        style.timeZone = zone
        return date.formatted(style)
    }

    static func duration(_ minutes: Int) -> String {
        if minutes < 60 { return "\(minutes) min" }
        let hours = minutes / 60
        let rest = minutes % 60
        return rest == 0 ? "\(hours) hr" : "\(hours) hr \(rest) min"
    }
}

/// A small coloured capsule: Cancelled, Past, Owner.
struct Badge: View {
    let text: String
    var tint: Color = .secondary

    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .foregroundStyle(tint)
            .background(tint.opacity(0.12), in: Capsule())
    }
}

/// An error under a form or a list, with the way out.
struct ErrorRow: View {
    let message: String
    var retry: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label(message, systemImage: "exclamationmark.triangle")
                .foregroundStyle(.red)
            if let retry {
                Button("Try again", action: retry)
            }
        }
    }
}

/// The wordmark, as the web draws it, in the right colour for the appearance.
struct Wordmark: View {
    var height: CGFloat = 26

    var body: some View {
        Image("Wordmark")
            .resizable()
            .scaledToFit()
            .frame(height: height)
            .accessibilityLabel("Meetrao")
    }
}
