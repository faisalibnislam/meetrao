import Foundation

/// companies:mine. Every company this person is in, owned or added to.
nonisolated struct CompaniesResponse: Decodable, Equatable, Sendable {
    let companies: [Company]
}

nonisolated struct Company: Decodable, Equatable, Sendable, Identifiable, Hashable {
    let id: String
    let name: String
    let slug: String
    /// Who this person is inside the company: the middle of its links.
    let handle: String
    let role: Role
    let domain: String?
    let domainVerified: Bool
    let avatarURL: String?
    let brandColor: String?
    let memberCount: Int

    enum Role: String, Decodable, Sendable {
        case owner, admin, member

        var label: String {
            switch self {
            case .owner: "Owner"
            case .admin: "Admin"
            case .member: "Member"
            }
        }
    }

    enum CodingKeys: String, CodingKey {
        case id, name, slug, handle, role, domain
        case domainVerified = "domain_verified"
        case avatarURL = "avatar_url"
        case brandColor = "brand_color"
        case memberCount = "member_count"
    }

    /// Owners and admins can see the company dashboard; members see their own work.
    var canManage: Bool { role != .member }
}

/// Personal, or one of the companies. Every screen is scoped to one, as on the web.
nonisolated enum Workspace: Hashable, Sendable {
    case personal
    case company(Company)

    var companyID: String? {
        if case .company(let company) = self { company.id } else { nil }
    }

    var title: String {
        switch self {
        case .personal: "Personal"
        case .company(let company): company.name
        }
    }
}
