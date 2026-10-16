import SwiftUI

/// The hours guests can book, per schedule, and the days off.
struct AvailabilityView: View {
    @Environment(AppModel.self) private var app
    @State private var screen = Live<AvailabilityScreen>()
    @State private var scheduleID: String?
    @State private var week: [DayHours] = []
    @State private var timezone = ""
    @State private var loadedFor: String?
    @State private var busy = false
    @State private var error: String?
    @State private var saved = false
    @State private var addingTimeOff = false
    @State private var naming: NamePrompt?

    struct NamePrompt: Identifiable {
        let id = UUID()
        var renaming: AvailabilityScreen.Schedule?
        var text: String
    }

    private var schedule: AvailabilityScreen.Schedule? {
        let all = screen.value?.schedules ?? []
        return all.first { $0.id == scheduleID } ?? screen.value?.defaultSchedule
    }

    private var savedWeek: [DayHours] {
        guard let schedule, let rules = screen.value?.rules else { return [] }
        return DayHours.week(from: rules, schedule: schedule.id)
    }

    private var isDirty: Bool {
        week != savedWeek || timezone != (app.profile?.timezone ?? "")
    }

    var body: some View {
        NavigationStack {
            List {
                if let failure = screen.error {
                    ErrorRow(message: failure.message) { screen.retry() }
                } else if screen.value == nil {
                    ProgressView().frame(maxWidth: .infinity)
                } else if let schedule {
                    scheduleSection(schedule)
                    weekSection
                    timeOffSection(schedule)
                }
            }
            .navigationTitle("Availability")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save).disabled(!isDirty || busy)
                }
            }
            .task { screen.watch(app.client, "availability:screen") }
            .onChange(of: screen.value) { _, _ in loadIfNeeded() }
            .onChange(of: scheduleID) { _, _ in loadedFor = nil; loadIfNeeded() }
            .sheet(isPresented: $addingTimeOff) {
                if let schedule { TimeOffEditor(scheduleID: schedule.id) }
            }
            .alert(naming?.renaming == nil ? "New schedule" : "Rename schedule", isPresented: Binding(get: { naming != nil }, set: { if !$0 { naming = nil } })) {
                TextField("Name", text: Binding(get: { naming?.text ?? "" }, set: { naming?.text = $0 }))
                Button("Cancel", role: .cancel) { naming = nil }
                Button(naming?.renaming == nil ? "Create" : "Rename") { commitName() }
            } message: {
                Text(naming?.renaming == nil ? "A new schedule starts Monday to Friday, 9 to 5." : "")
            }
            .sensoryFeedback(.success, trigger: saved)
        }
    }

    @ViewBuilder
    private func scheduleSection(_ schedule: AvailabilityScreen.Schedule) -> some View {
        Section {
            if (screen.value?.schedules.count ?? 0) > 1 {
                Picker("Schedule", selection: Binding(get: { schedule.id }, set: { scheduleID = $0 })) {
                    ForEach(screen.value?.schedules ?? []) { item in
                        Text(item.isDefault ? "\(item.name) (default)" : item.name).tag(item.id)
                    }
                }
            } else {
                LabeledContent("Schedule", value: schedule.name)
            }
            NavigationLink {
                TimezonePicker(selection: $timezone)
            } label: {
                LabeledContent("Timezone", value: Timezones.label(timezone))
            }
            Menu {
                Button("New schedule…", systemImage: "plus") { naming = NamePrompt(text: "") }
                Button("Rename…", systemImage: "pencil") { naming = NamePrompt(renaming: schedule, text: schedule.name) }
                if !schedule.isDefault {
                    Button("Make default", systemImage: "star") { run { try await app.api.setDefaultSchedule(schedule.id) } }
                    Button("Delete schedule", systemImage: "trash", role: .destructive) {
                        run {
                            try await app.api.deleteSchedule(schedule.id)
                            scheduleID = nil
                        }
                    }
                }
            } label: {
                Label("Manage schedules", systemImage: "slider.horizontal.3")
            }
        } footer: {
            let names = screen.value?.meetingNames(for: schedule) ?? []
            if !names.isEmpty { Text("Used by \(names.joined(separator: ", ")).") }
        }
    }

    private var weekSection: some View {
        Section {
            ForEach($week) { $day in
                DayHoursRow(day: $day)
            }
            if let error {
                Label(error, systemImage: "exclamationmark.circle").foregroundStyle(.red)
            }
        } header: {
            Text("Weekly hours")
        } footer: {
            Text(isDirty ? "Unsaved changes. Tap Save to publish them to your booking pages." : "Guests see these hours in their own timezone.")
        }
    }

    @ViewBuilder
    private func timeOffSection(_ schedule: AvailabilityScreen.Schedule) -> some View {
        let days = (screen.value?.overrides ?? []).filter { $0.scheduleID == schedule.id }
        Section {
            ForEach(days) { off in
                VStack(alignment: .leading, spacing: 2) {
                    Text(dayLabel(off.date)).font(.body.weight(.medium))
                    Text(off.isWholeDay ? "Unavailable all day" : off.ranges.map { "\(DayMinutes.label($0.startMinute)) – \(DayMinutes.label($0.endMinute))" }.joined(separator: ", "))
                        .font(.subheadline).foregroundStyle(.secondary)
                    if !off.note.isEmpty { Text(off.note).font(.footnote).foregroundStyle(.secondary) }
                }
                .swipeActions {
                    Button("Remove", role: .destructive) { run { try await app.api.deleteTimeOff(off.id) } }
                }
            }
            Button("Add time off", systemImage: "plus") { addingTimeOff = true }
        } header: {
            Text("Time off")
        } footer: {
            Text("A day here replaces the weekly hours for that date only.")
        }
    }

    private func dayLabel(_ key: String) -> String {
        guard let day = CalendarDay(key: key), let zone = app.profile?.timeZone else { return key }
        return Format.longDay(day.start(in: zone).addingTimeInterval(12 * 3600), in: zone)
    }

    /// Seeds the editor from the server once per schedule, so an update arriving
    /// mid-edit (from the web, say) does not wipe what somebody is typing.
    private func loadIfNeeded() {
        guard let schedule, loadedFor != schedule.id else { return }
        week = savedWeek
        timezone = app.profile?.timezone ?? "UTC"
        loadedFor = schedule.id
    }

    private func save() {
        guard let schedule else { return }
        if let problem = DayHours.problem(in: week) {
            error = problem
            return
        }
        error = nil
        run {
            try await app.api.saveWeek(schedule: schedule.id, timezone: timezone, week: week)
            loadedFor = nil
            saved.toggle()
        }
    }

    private func commitName() {
        guard let prompt = naming else { return }
        naming = nil
        let name = prompt.text.trimmingCharacters(in: .whitespaces)
        guard !name.isEmpty else { return }
        run {
            if let renaming = prompt.renaming {
                try await app.api.renameSchedule(renaming.id, to: name)
            } else {
                try await app.api.createSchedule(named: name)
            }
        }
    }

    private func run(_ work: @escaping () async throws -> Void) {
        busy = true
        Task {
            defer { busy = false }
            do { try await work() }
            catch { self.error = MeetraoError.from(error).message }
        }
    }
}

private struct DayHoursRow: View {
    @Binding var day: DayHours

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Toggle(DayHours.name(day.weekday), isOn: $day.isOn.animation())
                .font(.body.weight(.medium))
            if day.isOn {
                ForEach(day.ranges.indices, id: \.self) { index in
                    HStack {
                        MinutePicker(title: "From", minutes: $day.ranges[index].startMinute, range: 0...1410)
                        Text("–").foregroundStyle(.secondary)
                        MinutePicker(title: "To", minutes: $day.ranges[index].endMinute, range: 30...1440)
                        Spacer()
                        if day.ranges.count > 1 {
                            Button {
                                withAnimation { _ = day.ranges.remove(at: index) }
                            } label: {
                                Image(systemName: "minus.circle.fill").foregroundStyle(.secondary)
                            }
                            .buttonStyle(.borderless)
                            .accessibilityLabel("Remove these hours")
                        }
                    }
                }
                Button {
                    let last = day.ranges.last?.endMinute ?? 540
                    let start = min(last + 60, 1380)
                    withAnimation { day.ranges.append(.init(startMinute: start, endMinute: min(start + 60, 1440))) }
                } label: {
                    Label("Add hours", systemImage: "plus")
                        .font(.subheadline)
                }
                .buttonStyle(.borderless)
            }
        }
        .padding(.vertical, 4)
    }
}

private struct MinutePicker: View {
    let title: String
    @Binding var minutes: Int
    let range: ClosedRange<Int>

    var body: some View {
        Picker(title, selection: $minutes) {
            ForEach(DayMinutes.halfHours.filter { range.contains($0) } + (DayMinutes.halfHours.contains(minutes) ? [] : [minutes]), id: \.self) {
                Text(DayMinutes.label($0)).tag($0)
            }
        }
        .labelsHidden()
        .pickerStyle(.menu)
        // "9:00 AM" on one line, never "9:00 A / M" when a second range and
        // its remove button share the row.
        .fixedSize()
        .accessibilityLabel(title)
    }
}

struct TimezonePicker: View {
    @Binding var selection: String
    @Environment(\.dismiss) private var dismiss
    @State private var search = ""

    private var zones: [String] {
        let all = Timezones.sorted()
        guard !search.isEmpty else { return all }
        return all.filter { Timezones.label($0).localizedCaseInsensitiveContains(search) || $0.localizedCaseInsensitiveContains(search) }
    }

    var body: some View {
        List(zones, id: \.self) { zone in
            Button {
                selection = zone
                dismiss()
            } label: {
                HStack {
                    Text(Timezones.label(zone)).foregroundStyle(.primary).monospacedDigit()
                    Spacer()
                    if zone == selection { Image(systemName: "checkmark").foregroundStyle(Color.accentColor) }
                }
            }
        }
        .searchable(text: $search, prompt: "City or region")
        .navigationTitle("Timezone")
        .navigationBarTitleDisplayMode(.inline)
    }
}

/// One date off, or different hours for one date.
private struct TimeOffEditor: View {
    @Environment(AppModel.self) private var app
    @Environment(\.timeZone) private var timeZone
    @Environment(\.dismiss) private var dismiss
    let scheduleID: String

    @State private var date = Date.now
    @State private var wholeDay = true
    @State private var range = AvailabilityScreen.TimeOff.Range(startMinute: 540, endMinute: 1020)
    @State private var note = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                DatePicker("Date", selection: $date, in: Calendar.current.startOfDay(for: .now)..., displayedComponents: .date)
                Toggle("Unavailable all day", isOn: $wholeDay.animation())
                if !wholeDay {
                    HStack {
                        MinutePicker(title: "From", minutes: $range.startMinute, range: 0...1410)
                        Text("–").foregroundStyle(.secondary)
                        MinutePicker(title: "To", minutes: $range.endMinute, range: 30...1440)
                    }
                }
                TextField("Note to yourself (optional)", text: $note)
                if let error {
                    Label(error, systemImage: "exclamationmark.circle").foregroundStyle(.red)
                }
            }
            .navigationTitle("Time off")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) { Button("Add", action: save).disabled(busy) }
            }
        }
    }

    private func save() {
        if !wholeDay && range.endMinute <= range.startMinute {
            error = "The hours have to end after they start."
            return
        }
        busy = true
        error = nil
        Task {
            defer { busy = false }
            do {
                try await app.api.saveTimeOff(
                    schedule: scheduleID,
                    day: CalendarDay(date, in: timeZone),
                    ranges: wholeDay ? [] : [range],
                    note: note
                )
                dismiss()
            } catch {
                self.error = MeetraoError.from(error, fallback: "That day could not be saved.").message
            }
        }
    }
}
