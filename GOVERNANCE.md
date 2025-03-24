# ACIP Governance

This document describes the governance model for the Adaptive Contextual Intelligence Protocol (ACIP) project. It outlines how decisions are made, how contributors can become maintainers, and the overall organizational structure.

## Principles

ACIP governance is guided by the following principles:

1. **Openness**: Transparent decision-making and processes
2. **Community-Driven**: Decisions reflect the needs and interests of the community
3. **Meritocracy**: Leadership based on demonstrated contributions and expertise
4. **Decentralization**: Distributed authority and responsibility
5. **Inclusivity**: Welcoming diverse perspectives and participants
6. **Sustainability**: Building for long-term project health

## Project Structure

### Organizational Structure

ACIP is organized into the following bodies:

1. **Core Team**: Responsible for day-to-day development and maintenance
2. **Technical Steering Committee (TSC)**: Guides technical direction and standards
3. **Community Council**: Represents community interests and guides non-technical matters
4. **Working Groups**: Focused teams addressing specific areas (documentation, security, etc.)
5. **Contributors**: Everyone who contributes to the project

### Roles and Responsibilities

#### Contributors

- Anyone who contributes to the project
- Contributions include code, documentation, testing, design, community support, etc.
- No formal responsibilities beyond following the code of conduct and contribution guidelines

#### Committers

- Regular contributors with write access to repositories
- Responsibilities:
  - Review and merge pull requests
  - Triage issues
  - Mentor new contributors
  - Participate in technical discussions
- Requirements for becoming a committer:
  - Consistent contributions over time
  - Demonstrated technical knowledge
  - Familiarity with project guidelines and standards
  - Nomination by an existing maintainer and approval by the Core Team

#### Core Team

- Experienced committers responsible for project maintenance and development
- Responsibilities:
  - Guide overall project development
  - Approve significant architectural changes
  - Mentor committers
  - Manage releases
  - Address security issues
  - Enforce code of conduct
- Requirements for joining the Core Team:
  - Extensive contribution history
  - Deep technical knowledge
  - Leadership skills
  - Nomination by an existing Core Team member and unanimous approval by Core Team

#### Technical Steering Committee (TSC)

- Guides technical direction and makes final technical decisions
- Consists of 5-9 members, elected from Core Team and community
- Responsibilities:
  - Define technical roadmap
  - Make decisions on technical disputes
  - Approve significant architectural changes
  - Ensure technical excellence
- Election process:
  - TSC members serve 2-year terms
  - Elections held annually for half the seats
  - Candidates nominated from Core Team and active committers
  - Voting open to all committers and Core Team members

#### Community Council

- Represents community interests and makes decisions on non-technical matters
- Consists of 5-7 members, elected from the community
- Responsibilities:
  - Community building and engagement
  - Marketing and outreach
  - Events and programs
  - Fundraising and resource allocation
  - Conflict resolution
- Election process:
  - Council members serve 2-year terms
  - Elections held annually for half the seats
  - Any community member can stand for election
  - Voting open to all contributors with at least one merged contribution

#### Working Groups

- Focused teams addressing specific areas of the project
- Each Working Group has a charter defining its scope and objectives
- Led by a Working Group Chair, elected by Working Group members
- Responsibilities:
  - Execute on specific initiatives within their domain
  - Report progress to TSC and community
  - Produce specifications, code, or documentation
- Current Working Groups:
  - Documentation Working Group
  - Security Working Group
  - Interoperability Working Group
  - Edge Computing Working Group
  - Privacy and Data Governance Working Group

## Decision-Making Process

ACIP uses a multi-tiered decision-making process:

### Types of Decisions

1. **Routine Decisions**: Day-to-day decisions related to specific components
2. **Significant Technical Decisions**: Major changes to architecture, API, etc.
3. **Project-Wide Decisions**: Decisions affecting the entire project
4. **Governance Decisions**: Changes to governance structure or processes

### Decision-Making Methods

ACIP employs several decision-making methods depending on the type and impact of the decision:

1. **Lazy Consensus**: Default method for routine decisions
   - Proposal is considered approved if no objections after a defined period
   - Typically used for small to medium changes
   - Objections must be substantive and include reasoning

2. **Explicit Consensus**: Used for significant technical decisions
   - Requires explicit approval from relevant team members
   - Discussion period followed by approval period
   - Strong preference for consensus building rather than voting

3. **Voting**: Used when consensus cannot be reached or for major decisions
   - +1: Support
   - 0: Neutral or abstain
   - -1: Object (with reason)
   - Varies by decision type:
     - TSC decisions: 2/3 majority of TSC members
     - Community Council decisions: 2/3 majority of Council members
     - Working Group decisions: Simple majority of WG members

4. **Executive Decision**: In rare cases, the TSC can make executive decisions
   - Used only when urgent action is required
   - Must be documented with reasoning
   - Subject to post-decision review

### Decision Workflow

1. **Proposal**: Anyone can propose a change through appropriate channels
2. **Discussion**: Community discusses the proposal, refines it
3. **Decision**: Appropriate decision-making method applied
4. **Implementation**: Approved proposals are implemented
5. **Review**: Periodic review of implemented decisions

## Communication Channels

Official communication channels include:

1. **GitHub**: Primary platform for code, issues, and pull requests
2. **Discord**: Real-time chat for community discussions
3. **Mailing Lists**: 
   - announce@acip.org: Announcements only
   - dev@acip.org: Development discussions
   - community@acip.org: Community discussions
4. **Community Forum**: Web-based discussion forum
5. **Regular Meetings**:
   - TSC meetings: Bi-weekly
   - Community Council meetings: Monthly
   - Working Group meetings: Determined by each WG
   - Community calls: Monthly

All official meetings are recorded and minutes published for transparency.

## Project Resources

### Official Resources

- **GitHub Organization**: [github.com/acip](https://github.com/acip)
- **Website**: [acip.org](https://acip.org)
- **Documentation**: [docs.acip.org](https://docs.acip.org)
- **Community Forum**: [community.acip.org](https://community.acip.org)
- **Discord**: [discord.gg/acip](https://discord.gg/acip)

### Resource Management

1. **GitHub Access**: Managed by the Core Team
2. **Website & Docs**: Managed by Documentation Working Group
3. **Social Media**: Managed by Community Council
4. **Financial Resources**: Managed by Community Council with transparency

## Code of Conduct Enforcement

The Code of Conduct Committee (CoCC) is responsible for enforcing the Code of Conduct:

- Consists of 3 members appointed by the Community Council
- Investigates Code of Conduct violations
- Makes decisions on appropriate responses
- Reports anonymized incidents to the community

## Amendment Process

This governance document can be amended through the following process:

1. Proposal submitted to the TSC and Community Council
2. 30-day public comment period
3. Revision based on community feedback
4. Joint vote by TSC and Community Council (requires 2/3 majority in both)
5. Publication of amended governance document

## Conflict Resolution

In case of conflicts or disputes:

1. Parties attempt to resolve directly
2. If unsuccessful, mediation by an uninvolved maintainer
3. If still unresolved, escalation to TSC or Community Council
4. Final decision by joint TSC and Community Council session

## Project Lifecycle

### Versioning

- The project follows semantic versioning (MAJOR.MINOR.PATCH)
- Major releases require TSC approval
- Minor releases require Core Team approval
- Patch releases can be approved by Release Managers

### Long-term Support (LTS)

- Selected releases are designated as LTS versions
- LTS versions receive security updates for 2 years
- LTS designation decided by TSC

## Exit Plan/Succession

To ensure project sustainability:

1. Core Team members are expected to mentor potential successors
2. TSC maintains a succession plan for key roles
3. If a maintainer becomes inactive, responsibilities are reassigned
4. If the project needs to be transitioned:
   - Options include transition to foundation, sunset, or handoff
   - Decided by joint TSC and Community Council decision

## Foundation Relationship

ACIP is an independent open source project that may consider foundation relationship in the future:

1. Any foundation relationship requires:
   - Thorough evaluation of alignment with project values
   - Community discussion period
   - 2/3 majority vote from both TSC and Community Council

---

This governance document is effective as of [DATE] and will be reviewed annually. 
