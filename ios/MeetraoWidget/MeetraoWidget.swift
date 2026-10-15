import SwiftUI
import WidgetKit

@main
struct MeetraoWidgets: WidgetBundle {
    var body: some Widget {
        NextMeetingWidget()
    }
}

nonisolated struct NextMeetingEntry: TimelineEntry, Sendable {
    let date: Date
    let item: WidgetSnapshot.Item?
    /// False until the app has written a snapshot (never opened, or signed out).
    let hasSnapshot: Bool
    /// How many more meetings later today, after this one.
    let laterToday: Int
}

/// Builds the timeline from the snapshot the app wrote. A new entry at every
/// start and end, so "next" moves on by itself without the app running.
nonisolated struct NextMeetingProvider: TimelineProvider {
    func placeholder(in context: Context) -> NextMeetingEntry {
        NextMeetingEntry(date: .now, item: .init(id: "sample", guest: "Sam Rivera", meeting: "Intro call",
                                                 startsAt: .now.addingTimeInterval(1800), endsAt: .now.addingTimeInterval(3600), joinURL: nil),
                         hasSnapshot: true, laterToday: 2)
    }

    func getSnapshot(in context: Context, completion: @escaping @Sendable (NextMeetingEntry) -> Void) {
        completion(context.isPreview ? placeholder(in: context) : entry(at: .now, from: WidgetSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping @Sendable (Timeline<NextMeetingEntry>) -> Void) {
        let snapshot = WidgetSnapshot.load()
        let now = Date.now
        let points = [now] + (snapshot?.changePoints(after: now).prefix(20) ?? [])
        let entries = points.map { entry(at: $0, from: snapshot) }
        // After the last change, check again in a few hours in case the app has news.
        let refresh = (points.last ?? now).addingTimeInterval(3 * 3600)
        completion(Timeline(entries: entries, policy: .after(refresh)))
    }

    func entry(at date: Date, from snapshot: WidgetSnapshot?) -> NextMeetingEntry {
        guard let snapshot else { return NextMeetingEntry(date: date, item: nil, hasSnapshot: false, laterToday: 0) }
        let current = snapshot.current(at: date)
        let calendar = Calendar.current
        let later = snapshot.items.filter {
            $0.id != current?.id && $0.startsAt > date && calendar.isDate($0.startsAt, inSameDayAs: date)
        }.count
        return NextMeetingEntry(date: date, item: current, hasSnapshot: true, laterToday: later)
    }
}

struct NextMeetingWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NextMeeting", provider: NextMeetingProvider()) { entry in
            NextMeetingView(entry: entry)
                .containerBackground(for: .widget) { Color("WidgetBackground") }
        }
        .configurationDisplayName("Next meeting")
        .description("Who you're meeting next, and when.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryInline])
    }
}

struct NextMeetingView: View {
    @Environment(\.widgetFamily) private var family
    let entry: NextMeetingEntry

    private var inProgress: Bool {
        guard let item = entry.item else { return false }
        return item.startsAt <= entry.date && item.endsAt > entry.date
    }

    var body: some View {
        switch family {
        case .accessoryInline:
            if let item = entry.item {
                Text("\(item.guest) · \(item.startsAt, style: .time)")
            } else {
                Text("No meetings coming up")
            }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                if let item = entry.item {
                    Text(inProgress ? "Now" : item.startsAt.formatted(date: .omitted, time: .shortened))
                        .font(.headline)
                    Text(item.guest).lineLimit(1)
                    Text(item.meeting).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                } else {
                    Text("Meetrao").font(.headline)
                    Text(entry.hasSnapshot ? "Nothing booked" : "Open Meetrao").foregroundStyle(.secondary)
                }
            }
            .widgetURL(entry.item.flatMap { URL(string: "meetrao://booking/\($0.id)") })
        default:
            content
                .widgetURL(entry.item.flatMap { URL(string: "meetrao://booking/\($0.id)") })
        }
    }

    @ViewBuilder
    private var content: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 6) {
                Image("Mark").resizable().scaledToFit().frame(width: 16, height: 16)
                Text(inProgress ? "NOW" : "NEXT")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(Color.accentColor)
                Spacer()
            }
            if let item = entry.item {
                Spacer(minLength: 0)
                Text(item.guest)
                    .font(.custom("InstrumentSerif-Regular", size: family == .systemSmall ? 24 : 28, relativeTo: .title))
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
                Text(item.meeting).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                HStack {
                    Text(item.startsAt, style: .time).font(.headline.monospacedDigit())
                    if !Calendar.current.isDate(item.startsAt, inSameDayAs: entry.date) {
                        Text(item.startsAt, format: .dateTime.weekday(.abbreviated).day())
                            .font(.subheadline).foregroundStyle(.secondary)
                    }
                    Spacer()
                    if family == .systemMedium, entry.laterToday > 0 {
                        Text("+\(entry.laterToday) later today").font(.caption).foregroundStyle(.secondary)
                    }
                }
            } else {
                Spacer(minLength: 0)
                Text(entry.hasSnapshot ? "Nothing booked" : "Open Meetrao")
                    .font(.custom("InstrumentSerif-Regular", size: 24, relativeTo: .title))
                Text(entry.hasSnapshot ? "Share a link and bookings appear here." : "Sign in to see your next meeting.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        }
    }
}

#Preview(as: .systemMedium) {
    NextMeetingWidget()
} timeline: {
    NextMeetingEntry(date: .now, item: .init(id: "1", guest: "Sam Rivera", meeting: "Intro call",
                                             startsAt: .now.addingTimeInterval(1800), endsAt: .now.addingTimeInterval(3600), joinURL: nil),
                     hasSnapshot: true, laterToday: 2)
}
