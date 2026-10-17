import SwiftUI

struct MeetingsView: View {
    @Environment(AppModel.self) private var app
    @State private var meetings = Live<[Meeting]>()
    @State private var creating = false
    @State private var error: String?
    @State private var copied: String?

    /// Only this workspace's meetings, as on the web: a personal meeting shown
    /// under a company would look published on the company's domain.
    private var mine: [Meeting] {
        (meetings.value ?? []).filter { $0.companyID == app.workspace.companyID }
    }

    var body: some View {
        NavigationStack {
            List {
                if let error {
                    Label(error, systemImage: "exclamationmark.circle").foregroundStyle(.red)
                }
                if let failure = meetings.error {
                    ErrorRow(message: failure.message) { meetings.retry() }
                } else if meetings.isLoading {
                    ProgressView().frame(maxWidth: .infinity)
                } else if mine.isEmpty {
                    ContentUnavailableView {
                        Label("No meetings yet", systemImage: "link")
                    } description: {
                        Text(app.workspace == .personal
                             ? "A meeting is what guests book: a name, a length and where it happens."
                             : "Meetings made here are booked at \(app.workspace.title)'s address.")
                    } actions: {
                        Button("Create a meeting") { creating = true }.buttonStyle(.borderedProminent)
                    }
                    .listRowBackground(Color.clear)
                } else if let profile = app.profile {
                    ForEach(mine) { meeting in
                        MeetingRow(meeting: meeting, username: profile.username, copied: $copied) { active in
                            setActive(meeting, active)
                        }
                    }
                }
            }
            .navigationTitle("Meetings")
            .groundBackground()
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { WorkspaceMenu() }
                ToolbarItem(placement: .primaryAction) {
                    Button { creating = true } label: { Label("New meeting", systemImage: "plus") }
                }
            }
            .sheet(isPresented: $creating) {
                MeetingEditorView(meeting: nil, existingSlugs: Set((meetings.value ?? []).map(\.slug)))
            }
            .task { meetings.watch(app.client, "meetingTypes:listOwn") }
            .sensoryFeedback(.success, trigger: copied)
        }
    }

    private func setActive(_ meeting: Meeting, _ active: Bool) {
        error = nil
        Task {
            do { try await app.api.setMeetingActive(meeting.id, active) }
            catch { self.error = MeetraoError.from(error, fallback: "That meeting could not be updated.").message }
        }
    }
}

private struct MeetingRow: View {
    @Environment(AppModel.self) private var app
    let meeting: Meeting
    let username: String
    @Binding var copied: String?
    var onToggle: (Bool) -> Void

    private var address: String { Links.address(for: meeting.slug, in: app.workspace, username: username) }

    var body: some View {
        NavigationLink {
            MeetingEditorView(meeting: meeting, existingSlugs: [])
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(meeting.name).font(.headline)
                    if !meeting.isActive { Badge(text: "Off") }
                }
                Label("\(Format.duration(meeting.durationMinutes)) · \(MeetingLocation(raw: meeting.location).label)\(meeting.seats > 1 ? " · \(meeting.seats) seats" : "")",
                      systemImage: MeetingLocation(raw: meeting.location).symbol)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text(address)
                    .font(.footnote)
                    .foregroundStyle(meeting.isActive ? Color.accentColor : .secondary)
                    .lineLimit(1)
                    .truncationMode(.middle)
            }
            .padding(.vertical, 2)
        }
        .swipeActions(edge: .leading) {
            if let url = Links.url(for: meeting.slug, in: app.workspace, username: username) {
                ShareLink(item: url) { Label("Share", systemImage: "square.and.arrow.up") }
                    .tint(.accentColor)
            }
        }
        .swipeActions(edge: .trailing) {
            Button {
                UIPasteboard.general.string = "https://" + address
                copied = meeting.id
            } label: { Label("Copy link", systemImage: "doc.on.doc") }
            .tint(.gray)
            Button {
                onToggle(!meeting.isActive)
            } label: {
                Label(meeting.isActive ? "Switch off" : "Switch on", systemImage: meeting.isActive ? "pause.circle" : "play.circle")
            }
            .tint(meeting.isActive ? .orange : .green)
        }
        .contextMenu {
            if let url = Links.url(for: meeting.slug, in: app.workspace, username: username) {
                ShareLink(item: url) { Label("Share link", systemImage: "square.and.arrow.up") }
                Button {
                    UIPasteboard.general.string = url.absoluteString
                    copied = meeting.id
                } label: { Label("Copy link", systemImage: "doc.on.doc") }
                Link(destination: url) { Label("Open booking page", systemImage: "safari") }
            }
        }
    }
}

struct MeetingEditorView: View {
    @Environment(AppModel.self) private var app
    @Environment(\.dismiss) private var dismiss
    let meeting: Meeting?
    let existingSlugs: Set<String>

    @State private var draft: MeetraoAPI.MeetingDraft
    @State private var schedules = Live<AvailabilityScreen>()
    @State private var busy = false
    @State private var error: String?
    @State private var confirmingDelete = false

    init(meeting: Meeting?, existingSlugs: Set<String>) {
        self.meeting = meeting
        self.existingSlugs = existingSlugs
        _draft = State(initialValue: meeting.map(MeetraoAPI.MeetingDraft.init) ?? MeetraoAPI.MeetingDraft())
    }

    var body: some View {
        let form = Form {
            Section {
                TextField("Name, e.g. 30 minute intro call", text: $draft.name)
                TextField("What it's for (optional)", text: $draft.description, axis: .vertical)
                    .lineLimit(2...5)
                Toggle("Taking bookings", isOn: $draft.isActive)
            }

            Section("Length and place") {
                Picker("Length", selection: $draft.duration) {
                    ForEach(MeetingChoices.durations(including: draft.duration), id: \.self) { Text(Format.duration($0)).tag($0) }
                }
                Picker("Where", selection: $draft.location) {
                    ForEach(MeetingLocation.allCases) { Label($0.label, systemImage: $0.symbol).tag($0) }
                }
                if let prompt = draft.location.detailPrompt {
                    TextField(prompt, text: $draft.locationDetail, axis: .vertical)
                }
                Stepper(value: $draft.seats, in: 1...100) {
                    LabeledContent("Guests per slot", value: draft.seats == 1 ? "One-to-one" : "\(draft.seats)")
                }
            }

            Section {
                Picker("Hours", selection: $draft.scheduleID) {
                    Text(schedules.value?.defaultSchedule.map { "Default (\($0.name))" } ?? "Default schedule").tag(String?.none)
                    ForEach((schedules.value?.schedules ?? []).filter { !$0.isDefault }) { schedule in
                        Text(schedule.name).tag(Optional(schedule.id))
                    }
                }
                Picker("Minimum notice", selection: $draft.notice) {
                    ForEach(MeetingChoices.notices, id: \.self) { Text(MeetingChoices.minutesLabel($0)).tag($0) }
                }
                Picker("Book up to", selection: $draft.window) {
                    ForEach(MeetingChoices.windows, id: \.self) { Text("\($0) days ahead").tag($0) }
                }
                Picker("Buffer after", selection: $draft.buffer) {
                    ForEach(MeetingChoices.buffers, id: \.self) { Text(MeetingChoices.minutesLabel($0)).tag($0) }
                }
            } header: {
                Text("When guests can book")
            }

            if let error {
                Section { Label(error, systemImage: "exclamationmark.circle").foregroundStyle(.red) }
            }

            if meeting != nil {
                Section {
                    Button("Delete meeting", role: .destructive) { confirmingDelete = true }
                        .confirmationDialog("Delete \(meeting?.name ?? "this meeting")?", isPresented: $confirmingDelete, titleVisibility: .visible) {
                            Button("Delete", role: .destructive, action: delete)
                        } message: {
                            Text("Bookings already made stay; nobody is cancelled or told.")
                        }
                } footer: {
                    Text("Bookings already made stay on your calendar; nobody is cancelled. The link stops working.")
                }
            }
        }
        .navigationTitle(meeting == nil ? "New meeting" : "Edit meeting")
        .groundBackground()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if meeting == nil {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            ToolbarItem(placement: .confirmationAction) {
                Button(meeting == nil ? "Create" : "Save", action: save).disabled(busy || draft.problem != nil)
            }
        }
        .task { schedules.watch(app.client, "availability:screen") }

        if meeting == nil {
            NavigationStack { form }
        } else {
            form
        }
    }

    private func save() {
        if let problem = draft.problem {
            error = problem
            return
        }
        busy = true
        error = nil
        Task {
            defer { busy = false }
            do {
                if let meeting {
                    try await app.api.updateMeeting(meeting.id, draft)
                } else {
                    let slug = MeetingChoices.uniqueSlug(for: draft.name, taken: existingSlugs)
                    _ = try await app.api.createMeeting(draft, in: app.workspace, slug: slug)
                }
                dismiss()
            } catch {
                self.error = MeetraoError.from(error, fallback: "That meeting could not be saved.").message
            }
        }
    }

    private func delete() {
        guard let meeting else { return }
        busy = true
        Task {
            defer { busy = false }
            do {
                try await app.api.deleteMeeting(meeting.id)
                dismiss()
            } catch {
                self.error = MeetraoError.from(error, fallback: "That meeting could not be deleted.").message
            }
        }
    }
}
