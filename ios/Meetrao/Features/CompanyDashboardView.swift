import Charts
import SwiftUI

/// A company at a glance, for its owners and admins: what is booked, who is
/// next, and anybody whose handle answers with nothing.
struct CompanyDashboardView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.timeZone) private var timeZone
    let company: Company

    @State private var data = Live<CompanyAnalyticsData>()
    @State private var days = 30

    private var summary: CompanySummary? {
        data.value.map { CompanySummary($0, timeZone: timeZone) }
    }

    var body: some View {
        List {
            Section {
                Picker("Range", selection: $days) {
                    Text("7 days").tag(7)
                    Text("30 days").tag(30)
                    Text("90 days").tag(90)
                }
                .pickerStyle(.segmented)
            }
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets())

            if let failure = data.error {
                ErrorRow(message: failure.message) { data.retry() }
            } else if let summary {
                Section {
                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                        Tile(title: "Today", value: "\(summary.today)")
                        Tile(title: "Next 7 days", value: "\(summary.nextSevenDays)")
                        Tile(title: "Booked, \(days) days", value: "\(summary.booked)")
                        Tile(title: "Hours booked", value: summary.hoursBooked.formatted(.number.precision(.fractionLength(0...1))))
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
                }

                Section("Bookings per day") {
                    Chart(summary.perDay) { bucket in
                        BarMark(x: .value("Day", bucket.day, unit: .day), y: .value("Bookings", bucket.count))
                            .foregroundStyle(Color.accentColor)
                    }
                    .chartXAxis { AxisMarks(values: .automatic(desiredCount: 4)) }
                    .frame(height: 160)
                    .padding(.vertical, 6)
                    .accessibilityLabel("Bookings per day over the last \(days) days, \(summary.booked) in total")
                    if summary.cancelled > 0 {
                        Text("\(summary.cancelled) cancelled in the same \(days) days.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }

                Section("Up next") {
                    ForEach(summary.team) { entry in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(entry.member.name).font(.body.weight(.medium))
                                Text("\(company.slug)/\(entry.member.handle)").font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer()
                            if let next = entry.next {
                                VStack(alignment: .trailing, spacing: 2) {
                                    Text("\(Format.day(next.start, in: timeZone)), \(Format.time(next.start, in: timeZone))")
                                        .font(.subheadline.monospacedDigit())
                                    Text(next.guestName).font(.caption).foregroundStyle(.secondary)
                                }
                            } else {
                                Text("Nothing booked").font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                        .accessibilityElement(children: .combine)
                    }
                }

                if !summary.silent.isEmpty {
                    Section {
                        ForEach(summary.silent) { member in
                            Label(member.name, systemImage: "link.badge.plus").foregroundStyle(.orange)
                        }
                    } header: {
                        Text("No live links")
                    } footer: {
                        Text("Guests visiting these people's addresses on \(company.name) find nothing to book.")
                    }
                }
            } else {
                ProgressView().frame(maxWidth: .infinity)
            }
        }
        // The switcher above already names the company.
        .navigationTitle("Dashboard")
        .task(id: "\(company.id)-\(days)") {
            data.watch(app.client, "companyAnalytics:forCompany", ["id": company.id, "days": Double(days)])
        }
    }
}

private struct Tile: View {
    let title: String
    let value: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(value).font(.serif(34, relativeTo: .title)).monospacedDigit()
            Text(title).font(.footnote).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(14)
        .background(.background, in: .rect(cornerRadius: 16))
        .accessibilityElement(children: .combine)
    }
}
