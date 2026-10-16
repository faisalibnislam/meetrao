import SwiftUI

/// Tabs on iPhone, a sidebar on iPad.
struct MainView: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        @Bindable var router = app.router
        TabView(selection: $router.tab) {
            Tab("Today", systemImage: "house", value: Router.Tab.today) {
                TodayView()
            }
            Tab("Bookings", systemImage: "calendar", value: Router.Tab.bookings) {
                BookingsView()
            }
            Tab("Meetings", systemImage: "link", value: Router.Tab.meetings) {
                MeetingsView()
            }
            Tab("Availability", systemImage: "clock", value: Router.Tab.availability) {
                AvailabilityView()
            }
            Tab("Account", systemImage: "person.crop.circle", value: Router.Tab.account) {
                AccountView()
            }
            .badge(app.unread.value ?? 0)
        }
        .tabViewStyle(.sidebarAdaptable)
    }
}

/// Personal, or a company. Every list in the app follows it, as on the web.
struct WorkspaceMenu: View {
    @Environment(AppModel.self) private var app

    var body: some View {
        if app.companies.isEmpty {
            EmptyView()
        } else {
            Menu {
                Picker("Workspace", selection: Binding(get: { app.workspace }, set: { app.workspace = $0 })) {
                    Label("Personal", systemImage: "person").tag(Workspace.personal)
                    ForEach(app.companies) { company in
                        Label(company.name, systemImage: "building.2").tag(Workspace.company(company))
                    }
                }
            } label: {
                HStack(spacing: 4) {
                    Text(app.workspace.title).font(.subheadline.weight(.semibold)).lineLimit(1)
                    Image(systemName: "chevron.down").font(.caption2.weight(.bold))
                }
                .padding(.horizontal, 4)
            }
            .accessibilityLabel("Workspace: \(app.workspace.title)")
        }
    }
}
