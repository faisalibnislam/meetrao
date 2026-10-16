import SwiftUI

/// The company's morning screen, in the web's order and with the web's
/// numbers (src/components/app/company-dashboard.tsx): what is happening now,
/// then what to do about it, then who is doing it, then the shape of the
/// window. For owners and admins.
struct CompanyDashboardView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.timeZone) private var timeZone
    let company: Company

    @State private var data = Live<CompanyAnalyticsData>()
    @State private var days = 30

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Picker("Range", selection: $days) {
                    Text("7 days").tag(7)
                    Text("30 days").tag(30)
                    Text("90 days").tag(90)
                }
                .pickerStyle(.segmented)

                if let failure = data.error {
                    DashboardCard { ErrorRow(message: failure.message) { data.retry() } }
                } else if let value = data.value {
                    DashboardContent(summary: CompanySummary(value, timeZone: timeZone), names: names(value))
                } else {
                    ProgressView().frame(maxWidth: .infinity).padding(.top, 40)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 32)
        }
        // The switcher above already names the company.
        .navigationTitle("Dashboard")
        .groundBackground()
        .task(id: "\(company.id)-\(days)") {
            data.watch(app.client, "companyAnalytics:forCompany", ["id": company.id, "days": Double(days)])
        }
    }

    private func names(_ value: CompanyAnalyticsData) -> [String: String] {
        Dictionary(value.members.map { ($0.userID, $0.name) }, uniquingKeysWith: { a, _ in a })
    }
}

private struct DashboardContent: View {
    @Environment(\.timeZone) private var timeZone
    let summary: CompanySummary
    let names: [String: String]

    var body: some View {
        metrics

        if !summary.flags.isEmpty {
            DashboardSection("Worth a look") {
                DashboardCard {
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(summary.flags) { flag in
                            Label {
                                Text("\(Text(flag.who).fontWeight(.semibold)) · \(Text(flag.detail).foregroundStyle(.secondary))")
                            } icon: {
                                Image(systemName: flag.kind == .noLinks ? "exclamationmark.circle" : "questionmark.circle")
                                    .foregroundStyle(flag.kind == .noLinks ? Palette.amber.ink : .secondary)
                            }
                            .font(.subheadline)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
        }

        DashboardSection("Up next") {
            if summary.upNext.isEmpty {
                EmptyCard(title: "Nothing booked",
                          text: "When somebody books one of this company's links it appears here, whoever it belongs to.")
            } else {
                DashboardCard(padding: 0) {
                    VStack(spacing: 0) {
                        ForEach(Array(summary.upNext.enumerated()), id: \.offset) { index, row in
                            if index > 0 { Divider().padding(.leading, 14) }
                            upNextRow(row)
                        }
                    }
                }
            }
        }

        DashboardSection("People") {
            DashboardCard(padding: 0) {
                VStack(spacing: 0) {
                    ForEach(Array(summary.members.enumerated()), id: \.element.id) { index, load in
                        if index > 0 { Divider().padding(.leading, 14) }
                        PersonRow(load: load)
                    }
                }
            }
        }

        DashboardSection("Meetings a day") {
            DashboardCard { MeetingsADay(days: summary.perDay) }
        }

        DashboardSection("What gets booked") {
            DashboardCard { WhatGetsBooked(meetings: summary.byMeeting) }
        }

        DashboardSection("When people book") {
            DashboardCard { WhenPeopleBook(weekdays: summary.byWeekday, hours: summary.byHour) }
        }

        if let notice = summary.window.medianNoticeHours {
            Text("Typically booked \(Text(noticeText(notice)).fontWeight(.semibold)) ahead, measured across the meetings that were kept. Times are \(timeZone.identifier.replacingOccurrences(of: "_", with: " ")).")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
    }

    private var metrics: some View {
        let today = summary.today
        let window = summary.window
        return LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
            MetricCard(icon: "calendar", tone: .accent, value: "\(today.total)", label: "On today",
                       note: today.total == 0 ? "Nothing booked today."
                           : "\(today.remaining) still to come · \(CompanySummary.hours(today.minutes))")
            MetricCard(icon: "clock", tone: .slate, value: "\(summary.next7)", label: "Next seven days",
                       note: summary.next7 == 0 ? "The week ahead is empty." : "Booked across everyone.")
            MetricCard(icon: "checkmark", tone: .plain, value: "\(window.held)", label: "Held in \(summary.days) days",
                       note: "\(CompanySummary.hours(window.minutes)) · \(window.people) \(window.people == 1 ? "person" : "people")")
            MetricCard(icon: "exclamationmark", tone: window.cancelRate >= 0.2 ? .amber : .plain,
                       value: "\(Int((window.cancelRate * 100).rounded()))%", label: "Cancelled",
                       note: window.cancelled == 0 ? "Nothing cancelled."
                           : "\(window.cancelled) of \(window.held + window.cancelled) booked")
        }
    }

    private func upNextRow(_ row: CompanySummary.Row) -> some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(row.meetingName).font(.subheadline.weight(.semibold))
                Text("\(names[row.hostID] ?? "Somebody") · with \(row.guestName)")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            Spacer(minLength: 8)
            VStack(alignment: .trailing, spacing: 2) {
                Text(Format.day(row.start, in: timeZone)).font(.subheadline.weight(.semibold))
                Text("\(Format.time(row.start, in: timeZone)) · \(row.durationMinutes) min")
                    .font(.footnote.monospacedDigit()).foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .accessibilityElement(children: .combine)
    }

    private func noticeText(_ hours: Double) -> String {
        hours >= 48 ? "\(Int((hours / 24).rounded())) days" : "\(Int(hours.rounded())) hours"
    }
}

// MARK: - People

private struct PersonRow: View {
    @Environment(\.timeZone) private var timeZone
    let load: CompanySummary.Load

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 7) {
                Text(load.member.name).font(.subheadline.weight(.semibold))
                if load.member.role != "member" {
                    Badge(text: load.member.role == "owner" ? "Owner" : "Admin", tint: .accentColor)
                }
                Text("/\(load.member.handle)").font(.footnote).foregroundStyle(.secondary)
                Spacer(minLength: 0)
            }
            HStack(alignment: .firstTextBaseline, spacing: 0) {
                stat("Next") {
                    if let next = load.next {
                        Text("\(Format.day(next.start, in: timeZone)) \(Format.time(next.start, in: timeZone))")
                    } else {
                        Text("Nothing booked").foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                stat("Held") {
                    Text("\(load.held)\(load.cancelled > 0 ? Text(" · \(load.cancelled) off").foregroundStyle(Palette.amber.ink) : Text(""))")
                }
                .frame(width: 64, alignment: .leading)
                stat("Hours") { Text(CompanySummary.hours(load.minutes)) }
                    .frame(width: 64, alignment: .leading)
                stat("Links") {
                    if load.member.activeLinks == 0 {
                        Text("None").fontWeight(.semibold).foregroundStyle(Palette.amber.ink)
                    } else {
                        Text("\(load.member.activeLinks)")
                    }
                }
                .frame(width: 48, alignment: .leading)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 12)
        .accessibilityElement(children: .combine)
    }

    private func stat(_ title: String, @ViewBuilder value: () -> some View) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title.uppercased())
                .font(.caption2.weight(.semibold)).tracking(0.6)
                .foregroundStyle(.secondary)
            value().font(.footnote.monospacedDigit())
        }
    }
}

// MARK: - Charts

/// One bar a day, the whole window and a fortnight ahead, on one scale.
/// Ahead of today is lighter: bookings held, not work done.
private struct MeetingsADay: View {
    @Environment(\.timeZone) private var timeZone
    let days: [CompanySummary.Day]

    var body: some View {
        let peak = max(1, days.map(\.count).max() ?? 1)
        let firstFuture = days.firstIndex(where: \.future)
        let todayIndex = firstFuture.map { $0 - 1 } ?? days.count - 1

        VStack(spacing: 8) {
            HStack(alignment: .bottom, spacing: days.count > 60 ? 1 : 2) {
                ForEach(days) { day in
                    RoundedRectangle(cornerRadius: 1.5)
                        .fill(day.count == 0 ? Palette.line : day.future ? Palette.accent.line : Color.accentColor)
                        .frame(maxWidth: .infinity)
                        .frame(height: max(day.count == 0 ? 3 : 8, 90 * Double(day.count) / Double(peak)))
                }
            }
            .frame(height: 90, alignment: .bottom)

            GeometryReader { proxy in
                let x = proxy.size.width * (Double(todayIndex) + 0.5) / Double(max(days.count, 1))
                ZStack(alignment: .topLeading) {
                    Text(label(days.first?.day)).frame(maxWidth: .infinity, alignment: .leading)
                    Text(label(days.last?.day)).frame(maxWidth: .infinity, alignment: .trailing)
                    Text("Today").fixedSize().position(x: x, y: 7)
                }
            }
            .frame(height: 14)
            .font(.caption2)
            .foregroundStyle(.secondary)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Meetings a day, \(days.filter { !$0.future }.map(\.count).reduce(0, +)) held and \(days.filter(\.future).map(\.count).reduce(0, +)) ahead")
    }

    private func label(_ date: Date?) -> String {
        guard let date else { return "" }
        var style = Date.FormatStyle().day().month(.abbreviated)
        style.timeZone = timeZone
        return date.formatted(style)
    }
}

private struct WhatGetsBooked: View {
    let meetings: [CompanySummary.MeetingCount]

    var body: some View {
        if meetings.isEmpty {
            Text("Nothing held in this window.")
                .font(.subheadline).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        } else {
            let top = max(1, meetings[0].count)
            VStack(spacing: 12) {
                ForEach(meetings.prefix(6)) { meeting in
                    VStack(alignment: .leading, spacing: 5) {
                        HStack(alignment: .firstTextBaseline) {
                            Text(meeting.name).lineLimit(1)
                            Spacer(minLength: 8)
                            Text("\(meeting.count) · \(CompanySummary.hours(meeting.minutes))")
                                .foregroundStyle(.secondary).monospacedDigit()
                        }
                        .font(.subheadline)
                        Capsule().fill(Palette.fill2)
                            .frame(height: 5)
                            .overlay(alignment: .leading) {
                                GeometryReader { proxy in
                                    Capsule().fill(Color.accentColor)
                                        .frame(width: proxy.size.width * Double(meeting.count) / Double(top))
                                }
                            }
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
}

private struct WhenPeopleBook: View {
    let weekdays: [Int]
    let hours: [Int]
    private let letters = ["S", "M", "T", "W", "T", "F", "S"]
    private let names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    var body: some View {
        let dayPeak = max(1, weekdays.max() ?? 1)
        let hourPeak = max(1, hours.max() ?? 1)
        VStack(alignment: .leading, spacing: 8) {
            caption("By day")
            HStack(alignment: .bottom, spacing: 6) {
                ForEach(0..<7, id: \.self) { i in
                    VStack(spacing: 4) {
                        bar(weekdays[i], peak: dayPeak, height: 52, empty: 4, least: 10)
                            .frame(height: 52, alignment: .bottom)
                        Text(letters[i]).font(.caption2).foregroundStyle(.secondary)
                    }
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("\(names[i]), \(weekdays[i])")
                }
            }

            caption("By hour").padding(.top, 8)
            HStack(alignment: .bottom, spacing: 2) {
                ForEach(0..<24, id: \.self) { h in
                    bar(hours[h], peak: hourPeak, height: 44, empty: 5, least: 12)
                        .accessibilityLabel("\(h):00, \(hours[h])")
                }
            }
            .frame(height: 44, alignment: .bottom)
            HStack {
                Text("00"); Spacer(); Text("12"); Spacer(); Text("23")
            }
            .font(.caption2).foregroundStyle(.secondary)
        }
    }

    private func caption(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.caption2.weight(.semibold)).tracking(0.6)
            .foregroundStyle(.secondary)
    }

    /// Percentages of the height, as the web draws them, with a floor so an
    /// empty slot still reads as a slot.
    private func bar(_ n: Int, peak: Int, height: Double, empty: Double, least: Double) -> some View {
        let share = max(n == 0 ? empty : least, 100 * Double(n) / Double(peak))
        return RoundedRectangle(cornerRadius: 2)
            .fill(n == 0 ? Palette.line : Color.accentColor)
            .frame(maxWidth: .infinity)
            .frame(height: height * share / 100)
    }
}

// MARK: - Building blocks

private struct MetricCard: View {
    enum Tone { case accent, slate, amber, plain }

    let icon: String
    let tone: Tone
    let value: String
    let label: String
    let note: String

    private var colors: Palette.Tone {
        switch tone {
        case .accent: Palette.accent
        case .slate: Palette.slate
        case .amber: Palette.amber
        case .plain: Palette.plain
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            Image(systemName: icon)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(colors.ink)
                .frame(width: 30, height: 30)
                .background(Palette.surface, in: .rect(cornerRadius: 8))
            VStack(alignment: .leading, spacing: 3) {
                Text(value)
                    .font(.system(size: 28, weight: .semibold)).tracking(-0.5)
                    .monospacedDigit()
                    .foregroundStyle(colors.ink)
                Text(label).font(.subheadline.weight(.semibold))
                Text(note).font(.caption).foregroundStyle(.secondary)
                    .lineLimit(2, reservesSpace: true)
            }
        }
        .frame(maxWidth: .infinity, alignment: .topLeading)
        .padding(14)
        .background(colors.soft, in: .rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(colors.line))
        .accessibilityElement(children: .combine)
    }
}

private struct DashboardSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    init(_ title: String, @ViewBuilder content: () -> Content) {
        self.title = title
        self.content = content()
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            Text(title).font(.headline).accessibilityAddTraits(.isHeader)
            content
        }
    }
}

private struct DashboardCard<Content: View>: View {
    var padding: CGFloat = 14
    @ViewBuilder let content: Content

    init(padding: CGFloat = 14, @ViewBuilder content: () -> Content) {
        self.padding = padding
        self.content = content()
    }

    var body: some View {
        content
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Palette.surface, in: .rect(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.line))
    }
}

private struct EmptyCard: View {
    let title: String
    let text: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title).font(.subheadline.weight(.semibold))
            Text(text).font(.subheadline).foregroundStyle(.secondary)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 22)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Palette.surface, in: .rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(Palette.lineStrong, style: StrokeStyle(lineWidth: 1, dash: [4, 3])))
    }
}

/// The web's tokens (globals.css) for this screen. The web has no dark
/// theme, so the dark values are this app's own.
private enum Palette {
    struct Tone {
        let soft: Color
        let line: Color
        let ink: Color
    }

    static let accent = Tone(soft: Color(light: 0xE4EDEA, dark: 0x18302A), line: Color(light: 0xC2D6D0, dark: 0x2D4A42), ink: .accentColor)
    static let slate = Tone(soft: Color(light: 0xEAEFF3, dark: 0x1B242B), line: Color(light: 0xD3DEE6, dark: 0x2E3D49), ink: Color(light: 0x2F4C63, dark: 0x9DB7CB))
    static let amber = Tone(soft: Color(light: 0xF7EFDD, dark: 0x2B2315), line: Color(light: 0xE5D6B4, dark: 0x4A3B1F), ink: Color(light: 0x7D5406, dark: 0xE2B765))
    static let plain = Tone(soft: Color(light: 0xF4F3EE, dark: 0x1C1C1E), line: Color(light: 0xE0DDD4, dark: 0x2C2C2E), ink: Color(light: 0x575550, dark: 0xD1D1D6))

    static let surface = Color(light: 0xFFFFFF, dark: 0x1C1C1E)
    static let line = Color(light: 0xE0DDD4, dark: 0x2C2C2E)
    static let lineStrong = Color(light: 0xCFCBC0, dark: 0x3A3A3C)
    static let fill2 = Color(light: 0xEAE8E1, dark: 0x2C2C2E)
}

private extension Color {
    init(light: UInt32, dark: UInt32) {
        func ui(_ hex: UInt32) -> UIColor {
            UIColor(red: CGFloat((hex >> 16) & 0xFF) / 255, green: CGFloat((hex >> 8) & 0xFF) / 255,
                    blue: CGFloat(hex & 0xFF) / 255, alpha: 1)
        }
        self.init(uiColor: UIColor { $0.userInterfaceStyle == .dark ? ui(dark) : ui(light) })
    }
}
