# AirTracer — Agent Instructions

## 1. Your Role

Act as a software engineering agent working on AirTracer, a QR-enabled digital service passport platform for air-conditioning equipment.

Your responsibilities include understanding the existing codebase, implementing requirements, maintaining code quality, identifying inconsistencies, and verifying changes.

Work incrementally. Prioritize correctness, security, maintainability, and usability over unnecessary complexity.

Do not assume that planned functionality has already been implemented.

## 2. Required Documentation

Before making substantial changes, consult:

- `docs/PRD.md` — product scope, user roles, workflows, and functional requirements.
- `AGENTS.md` — these repository-wide instructions.

Also inspect the relevant source code, package manifests, configuration files, DTOs, and database schema.

If the documentation and implementation disagree, investigate the discrepancy. Explain material conflicts before making consequential decisions. Do not silently invent behavior to resolve them.

## 3. Repository Structure

AirTracer is a pnpm workspace monorepo.

- `apps/api/` — existing NestJS REST API.
- `apps/pwa/` — React frontend and Progressive Web App.
- `docs/` — shared project documentation.
- `package.json` — root workspace scripts and configuration.
- `pnpm-workspace.yaml` — workspace package configuration.

Keep frontend and backend responsibilities separate.

The frontend must communicate with the backend through the API. It must not connect directly to PostgreSQL or access server-side database credentials.

Before creating, moving, or deleting files, inspect the existing structure. Follow established project conventions unless there is a clear reason to change them.

## 4. Technology Constraints

### Frontend

The intended frontend stack is:

- React
- TypeScript
- Vite
- Tailwind CSS
- Progressive Web App capabilities

Use the dependencies and versions already established in `apps/pwa/`. Inspect its `package.json` before adding packages.

Use React components and hooks appropriately. Keep components focused and reusable, but avoid creating abstractions for one-off operations without a clear benefit.

### Backend

The existing backend uses:

- Node.js
- TypeScript
- NestJS
- Prisma ORM
- PostgreSQL
- JWT authentication
- Argon2 password hashing

The repository has previously used Prisma 7 with `@prisma/adapter-pg`, a generated Prisma client, and TypeScript 5.9.3.

Treat these versions as existing project context, not permission to upgrade or downgrade packages. Verify the current manifests, lockfile, Prisma configuration, and source code before modifying them.

### Storage

Supabase Storage is the intended cloud storage provider for service photographs.

Inspect the existing storage abstraction and configuration before changing upload or storage behavior.

### General Rules

- Preserve the current technology stack unless a change is explicitly requested or technically necessary.
- Do not introduce a second framework or redundant library for an existing capability.
- Avoid unnecessary dependency upgrades, especially major-version upgrades.
- Do not modify workspace configuration merely to solve an unrelated application issue.

## 5. Product Context

AirTracer maintains a persistent, equipment-centered maintenance history for AC units.

The main roles are:

- `OWNER`
- `TECHNICIAN`
- `ADMIN`

Core workflows include account authentication, equipment registration, QR identification, digital equipment passports, service records, diagnostic measurements, findings, recommendations, and supporting photographs.

AirTracer is company-agnostic. Equipment should not be restricted to a single manufacturer or service provider.

Measurements are manually entered by users. Do not implement or claim real-time IoT telemetry, automatic diagnosis, predictive maintenance, or other out-of-scope capabilities without explicit approval.

Refer to the PRD for the complete product requirements.

## 6. Implementation Workflow

For each task, follow this process:

1. **Understand:** Identify the requested behavior and the relevant requirements.
2. **Inspect:** Read the affected files and their dependencies before editing.
3. **Plan:** Identify the smallest coherent change and any API, database, security, or UI implications.
4. **Implement:** Follow existing patterns and make focused changes.
5. **Verify:** Run relevant tests, linting, type checks, and builds where available.
6. **Report:** Summarize changes, checks performed, and unresolved issues.

Do not begin by rewriting large sections of the codebase when a smaller change will satisfy the requirement.

For tasks involving multiple independent features, implement and verify them in manageable stages.

If a task requires a consequential decision about security, ownership, data integrity, or architecture and the intended behavior cannot be established from the documentation or code, ask for clarification.

## 7. Coding Standards

### TypeScript

- Preserve the existing TypeScript configuration and strictness.
- Prefer explicit, meaningful types.
- Avoid `any` unless genuinely necessary.
- Reuse existing types and interfaces where appropriate.
- Do not use type assertions to hide an unresolved type error.
- Handle nullable and optional values explicitly.

### Naming and Organization

- Follow the naming and file organization conventions of the affected application.
- Use descriptive names for variables, functions, components, and types.
- Keep business logic separate from presentation and HTTP handling where appropriate.
- Avoid duplicated business rules across frontend and backend.
- Keep changes focused and remove temporary debugging code before finishing.

### Error Handling

- Handle expected failures explicitly.
- Provide useful error messages without exposing sensitive information.
- Do not silently swallow exceptions.
- Avoid showing raw server stack traces or internal database errors to users.
- Distinguish validation failures, authentication failures, authorization failures, and unexpected server errors when the API contract supports it.

### Dependencies

Before adding a dependency:

1. Check whether the functionality already exists in the project.
2. Consider whether native platform or existing library capabilities are sufficient.
3. Prefer established, maintained packages that fit the current stack.
4. Explain the need for the dependency when it materially affects architecture or security.

## 8. Frontend Rules

### React

- Use functional components and hooks.
- Keep UI components focused on presentation and interaction.
- Extract reusable components when doing so improves consistency or maintainability.
- Avoid unnecessary global state.
- Do not duplicate server state in multiple places without a clear reason.
- Follow the routing, form, API-client, and data-fetching conventions already established in `apps/pwa/`.

### User Interface

The interface should be professional, clean, responsive, and practical for maintenance work performed on-site.

Prioritize:

- Clear navigation.
- Mobile-friendly layouts.
- Readable equipment and service information.
- Accessible forms and controls.
- Consistent spacing, typography, and colors.
- Appropriate loading, empty, success, and error states.
- Useful validation feedback.
- Keyboard accessibility and visible focus states.

Avoid unnecessary animations, excessive decoration, oversized dashboards, or visual complexity that interferes with the main workflows.

Do not invent production data. If mock data is needed for development, identify it clearly and keep it separate from real API data.

### API Integration

Before writing or modifying an API request:

1. Inspect the actual NestJS controller and route.
2. Inspect the relevant DTO and service.
3. Verify authentication and authorization requirements.
4. Confirm the request payload and response structure.
5. Reuse the project's API client and error-handling patterns.

Do not invent endpoint paths, field names, status codes, or response properties.

Keep frontend types consistent with the verified backend contract.

### Environment Variables

Use Vite environment variables only for values intended to be public in the browser, such as the API base URL.

Never expose:

- Database credentials.
- JWT signing secrets.
- Supabase service-role keys.
- Private storage credentials.
- Other server-side secrets.

Environment variables prefixed with `VITE_` must be treated as publicly accessible to client-side code.

## 9. Backend Rules

### NestJS

- Keep controllers focused on HTTP request handling.
- Place business logic in services.
- Use DTOs and the existing validation conventions for incoming requests.
- Follow the established module, guard, decorator, and dependency-injection patterns.
- Use appropriate HTTP exceptions and status codes.
- Do not bypass authentication or authorization guards to make an endpoint easier to use.

### Authentication and Authorization

The backend uses JWT authentication and Argon2 password hashing.

Respect the existing authentication implementation, including its public-route decorators, role decorators, guards, and authenticated-user handling.

- Never store plaintext passwords.
- Never allow ordinary registration to assign the `ADMIN` role.
- Enforce authorization on the backend, not only in React.
- Validate resource access on every protected operation.
- Do not trust a client-supplied user ID, role, owner ID, or technician ID as proof of identity.
- Use the authenticated principal for identity-sensitive operations where appropriate.
- Handle invalid, expired, and missing credentials consistently with existing API behavior.

### Prisma and Database Changes

Before changing database-related code, inspect the Prisma schema, generated client configuration, migration history, and existing service queries.

- Preserve established relationships and constraints.
- Use the repository's existing Prisma 7 configuration.
- Follow the established migration workflow.
- Avoid manually editing generated client output.
- Do not reset, drop, or destructively modify a database without explicit authorization.
- Consider existing records and migration compatibility before changing a field or relationship.
- Do not rename or remove fields simply to match a preferred naming convention without evaluating the impact.

## 10. Equipment and Service-Record Integrity

Equipment passports and service histories are central to AirTracer.

- Associate each service record with the correct equipment and authenticated technician.
- Verify asset existence and eligibility before creating a service record.
- Enforce the existing asset ownership and access rules.
- Preserve historical records according to the approved requirements.
- Do not add editing or deletion capabilities that conflict with the intended record-integrity rules.
- Preserve the association between photographs and their service records.
- Use measurement units consistently with the existing API contract.
- Do not silently change stored measurements or convert units without explicit rules.
- Follow existing audit-logging and data-integrity mechanisms.

Do not assume a QR token grants unrestricted access to private equipment information.

## 11. PWA and Offline Behavior

AirTracer is a Progressive Web App built with React and Vite.

Follow these principles:

- Maintain a valid web app manifest and appropriate icons.
- Configure the service worker and caching through the existing PWA setup.
- Keep the application responsive and installable on supported platforms.
- Handle camera permission denial and QR-scanning failures gracefully.
- Provide an appropriate fallback when scanning is unavailable.
- Handle network failures without silently losing user input.
- Avoid caching sensitive authenticated API responses unless an explicit, secure caching policy has been established.
- Ensure service-worker updates do not unexpectedly discard unsaved work.

Cloud persistence is required. Limited caching may support offline access, but full offline writes, background synchronization, and conflict resolution are not automatically in scope.

Do not claim that the application works fully offline unless the relevant workflows have been implemented and verified.

## 12. File Uploads and Photographs

Service photographs may contain equipment details, location information, or other potentially sensitive content.

- Follow existing backend upload validation and authorization.
- Respect configured file type and size restrictions.
- Do not expose private storage credentials in the frontend.
- Use the established storage abstraction.
- Handle upload failures and retries appropriately.
- Ensure photographs are associated with the correct service record.
- Avoid logging sensitive file contents or unnecessary personal information.

Do not replace the current storage provider or architecture without an explicit requirement.

## 13. Testing and Verification

After making changes, run the checks relevant to the affected application.

Use the scripts defined in the current package manifests. Do not assume that a script exists without checking.

Where available, verify:

- TypeScript compilation.
- Linting.
- Relevant automated tests.
- Frontend production build.
- Backend build.
- API request and response behavior.
- Authentication and authorization.
- Database migration validity.
- Important UI loading and error states.
- PWA manifest and service-worker behavior.

If a check fails, investigate whether the failure was caused by your changes. Do not hide or work around unrelated failures without reporting them.

Never claim a test passed if it was not run or its result was not verified.

## 14. Git and Change Management

- Avoid overwriting unrelated user changes.
- Inspect the working tree before performing potentially destructive operations.
- Do not discard, reset, or revert user changes without explicit authorization.
- Do not commit or push changes unless requested.
- Avoid broad formatting or refactoring changes unrelated to the task.
- Keep changes reviewable and logically grouped.

## 15. Documentation Maintenance

Update documentation when a change materially affects product behavior, architecture, API contracts, setup instructions, or development workflows.

Keep the following responsibilities separate:

- `docs/PRD.md`: what the product should do.
- `docs/TRD.md`: how the system is designed.
- `docs/api-contract.md`: verified API endpoints, payloads, responses, and authorization requirements.
- `AGENTS.md`: instructions for agents working in the repository.

Do not copy entire documents into `AGENTS.md`. Keep agent instructions actionable and maintainable.

When implementation diverges from documentation, identify the discrepancy and update the appropriate document when the intended behavior is confirmed.

## 16. Working Autonomously

You may independently handle routine, reversible implementation decisions that follow the established codebase patterns.

Examples include:

- Creating a reusable component for an existing design pattern.
- Adding appropriate loading and empty states.
- Fixing a clear TypeScript error.
- Improving responsive behavior without changing product functionality.
- Adding tests for existing, documented behavior.

Seek clarification before making consequential assumptions about:

- Authentication or authorization policy.
- Equipment ownership and transfer.
- Public versus private QR passport information.
- Editing or deleting historical service records.
- Database changes that may affect existing data.
- Major dependencies or architectural replacements.
- Features outside the approved product scope.

When requirements are unclear, explain the ambiguity and recommend a practical solution rather than silently inventing behavior.

## 17. Final Response Format

After completing a task, provide a concise summary containing:

1. **Changes made** — important files and behaviors changed.
2. **Implementation notes** — relevant decisions or constraints.
3. **Verification** — checks actually run and their results.
4. **Remaining work** — unresolved issues, missing requirements, or necessary follow-up.

Be direct and technically precise. Distinguish implemented functionality from planned functionality and verified results from assumptions.
