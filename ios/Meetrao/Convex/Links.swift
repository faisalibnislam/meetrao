import Foundation

/// The booking link for a meeting, in the workspace it belongs to.
///
/// The same rule as src/lib/workspace-links.ts on the web, which is the only
/// other place links are built: a personal meeting lives at
/// meetrao.com/<username>/<meeting>; a company's at its verified domain, or at
/// meetrao.com/<company>/<handle>/<meeting> until it has one.
nonisolated enum Links {
    static func address(
        for meeting: String, in workspace: Workspace, username: String, host: String = MeetraoConfig.siteHost
    ) -> String {
        switch workspace {
        case .personal:
            return "\(host)/\(username)/\(meeting)"
        case .company(let company):
            if company.domainVerified, let domain = company.domain, !domain.isEmpty {
                return "\(domain)/\(company.handle)/\(meeting)"
            }
            return "\(host)/\(company.slug)/\(company.handle)/\(meeting)"
        }
    }

    static func url(for meeting: String, in workspace: Workspace, username: String) -> URL? {
        URL(string: "https://" + address(for: meeting, in: workspace, username: username))
    }

    /// A page on the website, for what only the website does.
    static func site(_ path: String) -> URL {
        MeetraoConfig.siteURL.appending(path: path)
    }
}
