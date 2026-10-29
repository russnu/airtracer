# AirTracer — Product Requirements Document (PRD)

## 1. Product Overview

**Product Name:** AirTracer

**Product Type:** QR-enabled Progressive Web Application (PWA)

**Platform:** Responsive web application for desktop, tablet, and mobile devices

**Primary Users:** Air-conditioning equipment owners and independent technicians

**Project Status:** Under development

### 1.1 Product Description

AirTracer is a company-agnostic digital service passport platform designed to maintain a centralized, persistent service history for individual air-conditioning (AC) units throughout their operational lifecycle.

Each registered AC unit is associated with a unique QR code that links to its digital equipment passport. The passport contains equipment information and its recorded maintenance history, including service details, technician information, diagnostic measurements, findings, recommendations, and supporting photo evidence.

The platform addresses the problem of fragmented maintenance records when an AC unit is serviced by different technicians or service providers over time. Rather than keeping service information exclusively in separate company systems or disconnected records, AirTracer provides a consistent, equipment-centered record accessible to authorized users.

AirTracer is intended for residential and commercial AC equipment. It is not limited to a particular manufacturer, authorized service center, or maintenance company.

### 1.2 Product Vision

Provide equipment owners and independent technicians with a practical, accessible way to identify AC equipment, document maintenance activities, and preserve service history across multiple service providers.

### 1.3 Core Product Principles

- **Asset-centered:** Service history belongs to the equipment, not exclusively to a particular technician or service company.
- **QR-enabled:** Each registered asset has a unique QR code that leads to its digital passport.
- **Company-agnostic:** The platform supports equipment and service providers from different manufacturers and organizations.
- **Traceable:** Service records identify the technician responsible and retain relevant maintenance details.
- **Evidence-supported:** Service records can include photographs documenting equipment condition or work performed.
- **Mobile-friendly:** Technicians must be able to use the application conveniently while working on-site.
- **Accessible:** Users should be able to access the application through a supported web browser without installing a conventional native application.

---

## 2. Target Users and Roles

AirTracer has three application roles: OWNER, TECHNICIAN, and ADMIN.

### 2.1 Equipment Owner

Owners register and manage their AC equipment and access its maintenance history.

Primary needs:

- Register an AC unit and associate it with their account.
- View equipment details and its QR code.
- Access the equipment's service passport and maintenance history.
- Review service measurements, findings, recommendations, and photographs.
- Identify previous service activities and the technicians who performed them.

### 2.2 Technician

Technicians document maintenance activities and access equipment information according to the application's authorization rules.

Primary needs:

- Register for an account as a technician.
- Identify equipment using its QR code or by navigating through the application.
- View equipment information and relevant service history when authorized.
- Record maintenance activities and diagnostic measurements.
- Document findings and recommendations.
- Upload supporting photographs.
- Associate each service record with the authenticated technician.

### 2.3 Administrator

Administrators perform authorized administrative and account-management activities.

Primary needs:

- Access administrative functions explicitly supported by the system.
- Manage users or account status when permitted.
- Support platform oversight and appropriate record traceability.

Administrative capabilities must follow the implemented authorization rules. Do not assume that every administrative feature is required merely because an ADMIN role exists.

---

## 3. Scope

### 3.1 In Scope

The initial application should support:

- User registration and login.
- Role-aware access and navigation.
- Equipment registration and management.
- QR code generation and equipment identification.
- Digital equipment passports.
- Equipment maintenance and service history.
- Manual diagnostic measurement entry.
- Service findings and recommendations.
- Photo evidence uploads.
- Authorization and resource ownership checks.
- Persistent cloud-backed data storage.
- Responsive layouts and PWA installation.
- Basic caching and appropriate offline handling.
- Saving an equipment passport on a device for offline viewing (text only; photos require a connection).
- Creating service records offline, saved on the device and synchronized automatically when reconnected (see §8.3).
- Administrative functionality required by the approved requirements.

### 3.2 Out of Scope

Unless explicitly approved as a later requirement, do not implement:

- IoT sensors or automatic real-time equipment telemetry.
- Automatic measurement collection from AC equipment.
- Predictive maintenance or AI-based diagnosis.
- Automated fault detection.
- Manufacturer-specific integrations.
- Payment processing, technician marketplaces, or service booking.
- GPS tracking or continuous technician location monitoring.
- A native Android or iOS application separate from the PWA.
- Guaranteed full offline operation with automatic synchronization of every type of data. Only the offline workflows listed in §3.1 are in scope; editing records, status changes, photo uploads, and owner or administrative actions require a connection.
- Features that have no support in the PRD or explicit development instructions.

Measurements are entered manually by users. They must not be represented as automatically collected sensor readings.

---

## 4. Functional Requirements

### 4.1 Authentication and Accounts

**FR-001 — User Registration**

Users must be able to create an account by providing the required registration information.

**FR-002 — Role Selection**

Registration must support the intended OWNER and TECHNICIAN roles. Ordinary registration must never permit users to assign themselves the ADMIN role.

**FR-003 — Login**

Registered users must be able to authenticate using their credentials.

**FR-004 — Session Management**

The application must maintain authenticated state and handle expired or invalid credentials appropriately.

**FR-005 — Current User**

The frontend must retrieve the authenticated user's information from the backend and use it to determine the appropriate interface and permitted actions.

**FR-006 — Logout**

Users must be able to log out, clearing applicable authentication state.

**FR-007 — Protected Access**

Protected pages and operations must require authentication as appropriate. Backend authorization remains authoritative even when frontend routes and buttons are restricted.

### 4.2 Equipment Management

**FR-008 — Register Equipment**

Authorized owners must be able to register an AC unit with the required equipment information.

Equipment information may include:

- Equipment type.
- Manufacturer or brand.
- Model.
- Serial number, when available.
- Installation date, when available.
- Installation location or service location.
- Equipment owner.

Only fields supported by the backend data model should be submitted. Optional information must not be fabricated or required without justification.

**FR-009 — View Equipment**

Users must be able to view equipment information for assets they are authorized to access.

**FR-010 — Manage Equipment**

Owners must be able to perform supported equipment-management actions subject to backend permissions and business rules.

**FR-011 — Equipment Status**

Inactive equipment must be handled according to the backend's rules. Do not assume that inactive equipment can receive new service records.

**FR-012 — Asset Ownership**

Equipment ownership and access permissions must be enforced by the backend. A frontend user must not gain access to another user's private equipment merely by changing a URL or request parameter.

### 4.3 QR Code and Digital Passport

**FR-013 — Unique QR Code**

Each registered equipment asset must have a unique QR identifier or token.

**FR-014 — QR Code Display**

Authorized users must be able to view the equipment's QR code and use it for identification.

**FR-015 — QR Code Scanning**

Users should be able to open the application or use a supported device camera to scan an equipment QR code.

If camera access is unavailable or denied, provide an appropriate fallback, such as manually opening or entering the QR destination.

**FR-016 — Digital Passport**

The QR destination must lead to the corresponding equipment passport, subject to the application's access rules.

**FR-017 — Persistent Equipment Identity**

The equipment's passport must remain associated with the same asset identifier when different technicians or service providers record maintenance activities.

**FR-018 — Access Control**

QR possession must not automatically grant unrestricted access to private owner information or protected operations.

Publicly accessible passport information, if supported by the backend, must be limited to explicitly approved fields. Authenticated or sensitive information must remain protected.

### 4.4 Service Records

**FR-019 — Create Service Record**

Authorized technicians must be able to create a service record associated with a specific AC unit.

**FR-020 — Service Record Information**

A service record should support the fields available in the backend model, including:

- Equipment reference.
- Technician reference.
- Service date.
- Service type.
- Description of work performed.
- Diagnostic measurements.
- Findings.
- Recommendations.
- Associated photographs.

**FR-021 — Diagnostic Measurements**

The application must support manual entry of the diagnostic measurements implemented in the backend, including suction pressure, discharge pressure, electrical current, and voltage where applicable.

The interface must clearly label each measurement and its unit. Do not silently convert or mix measurement units.

Optional or inapplicable measurements should be handled appropriately rather than forcing users to enter fabricated values.

**FR-022 — Service History**

Authorized users must be able to view the service history associated with an equipment asset.

**FR-023 — Service Record Details**

Users with the appropriate permissions must be able to inspect the details of a service record, including its technician, date, measurements, findings, recommendations, and photographs when available.

**FR-024 — Record Integrity**

Service records must be associated with the correct asset and authenticated technician. Frontend-supplied identifiers must not override backend authorization or identity checks.

**FR-025 — Record Modification**

Support only the service-record editing, status updates, and deletion operations actually defined by the approved requirements and backend API. Do not assume that existing service records are editable or deletable.

### 4.5 Photo Evidence

**FR-026 — Upload Photographs**

Authorized users must be able to attach supporting photographs to service records where supported.

**FR-027 — Photo Association**

Each uploaded photograph must be associated with the correct service record.

**FR-028 — Upload Feedback**

The interface must communicate upload progress or loading state where practical, and display clear success or failure feedback.

**FR-029 — Photo Display**

Authorized users must be able to view stored photographs associated with a service record.

**FR-030 — Upload Validation**

File type, file size, storage access, and authorization must be validated according to the backend and storage configuration.

### 4.6 Dashboard and Navigation

**FR-031 — Role-Aware Dashboard**

After login, users should see a dashboard appropriate to their role.

**FR-032 — Owner Dashboard**

The owner dashboard should provide access to the owner's equipment, equipment details, QR codes, and maintenance histories.

**FR-033 — Technician Dashboard**

The technician dashboard should provide access to authorized equipment lookup, QR scanning, and service-record workflows.

**FR-034 — Navigation**

Provide clear navigation between the dashboard, equipment views, QR scanning or lookup, service history, account information, and other implemented features.

**FR-035 — Empty States**

When a user has no registered equipment, no available service records, or no search results, explain the situation and provide an appropriate next action when possible.

### 4.7 Administration

**FR-036 — Administrative Access**

Administrative interfaces and operations must be available only to authorized administrators.

**FR-037 — User Management**

Implement only the account-management capabilities approved for the project and supported by the backend.

**FR-038 — Auditability**

Where audit logging is implemented, the application must preserve the intended traceability of relevant operations and must not provide ordinary users with a way to bypass audit controls.

---

## 5. Nonfunctional Requirements

### 5.1 Usability

- Interfaces should be understandable to nontechnical equipment owners and technicians.
- Forms should use clear labels and appropriate input types.
- Validation messages should explain how to correct an error.
- Service workflows should minimize unnecessary navigation and repetitive input.
- Important actions should provide clear feedback.

### 5.2 Responsive Design

- Support mobile phones, tablets, and desktop screens.
- Prioritize mobile usability for on-site technician workflows.
- Avoid horizontal overflow and controls that are difficult to tap.
- Ensure equipment tables, service records, photographs, and forms adapt to smaller screens.

### 5.3 Performance

- Avoid unnecessarily large JavaScript bundles and excessive network requests.
- Provide loading indicators for operations that require waiting.
- Optimize photographs and avoid loading all large images unnecessarily.
- Use pagination or other appropriate strategies if service histories become large.

Do not claim specific performance targets unless they have been defined and can be tested.

### 5.4 Security

- Enforce authentication and authorization on the backend.
- Protect private equipment and owner information.
- Validate and sanitize incoming data.
- Keep credentials, tokens, and private service keys out of source control.
- Never expose server-only secrets in frontend environment variables.
- Follow secure practices for authentication, file uploads, and API requests.
- Do not trust role names or resource ownership values supplied by the client.

### 5.5 Reliability and Data Integrity

- Persist authoritative application data in the configured backend and database.
- Provide useful feedback when network requests fail.
- Avoid duplicate submissions when practical.
- Prevent service records and photographs from being associated with the wrong equipment.
- Do not silently discard user input after a failed operation.

### 5.6 PWA Requirements

- Provide a valid web app manifest and appropriate application icons.
- Support installation where supported by the browser and platform.
- Provide an app-like standalone launch experience.
- Register and configure a service worker for the intended caching strategy.
- Support caching of appropriate application resources.
- Handle service-worker updates without unexpectedly losing unsaved work.
- Provide sensible behavior when offline.
- Keep a signed-in user signed in when the app is opened offline, until the session expires.
- Never cache authenticated API responses in the service worker.

Caching application files does not mean that protected API data or write operations automatically work offline. Only the workflows described in §8.3 work offline.

### 5.7 Accessibility

- Use semantic HTML and appropriate form labels.
- Support keyboard navigation where applicable.
- Maintain readable text and sufficient contrast.
- Provide visible focus indicators.
- Avoid relying on color alone to communicate status or errors.

---

## 6. User Workflows

### 6.1 Owner Workflow

1. The owner opens AirTracer through a browser or installed PWA.
2. The owner registers or logs in.
3. The owner reaches the owner dashboard.
4. The owner registers an AC unit or selects an existing asset.
5. The owner views equipment information and its QR code.
6. The owner scans the QR code when needed to return to the equipment passport.
7. The owner reviews service history, diagnostic information, findings, recommendations, and photographs.
8. The owner logs out when finished.

### 6.2 Technician Workflow

1. The technician opens AirTracer through a browser or installed PWA.
2. The technician registers or logs in.
3. The technician reaches the technician dashboard.
4. The technician locates equipment through QR scanning or supported equipment lookup.
5. The system verifies that the technician is authorized to access the relevant information.
6. The technician reviews relevant equipment information and previous service records.
7. The technician records the service activity and applicable diagnostic measurements.
8. The technician adds findings, recommendations, and supporting photographs.
9. The technician submits the record.
10. The system validates and persists the record and associated evidence.
11. The technician receives confirmation or actionable error feedback.

Equipment registration and ownership assignment must follow the approved registration and authorization process. Technicians must not automatically become equipment owners merely because they create a service record.

### 6.3 QR Passport Access Workflow

1. A user scans an equipment QR code using a device camera or opens its destination.
2. AirTracer resolves the QR token to the corresponding equipment.
3. The application displays the information the user is permitted to access.
4. Protected information and actions require the appropriate authentication and authorization.
5. Authorized users can navigate to the relevant service history or service-record workflow.

### 6.4 Authentication Workflow

1. The user opens the login page.
2. The user submits their credentials.
3. The frontend sends the request to the existing authentication API.
4. The backend validates credentials and returns the documented response.
5. The frontend establishes authenticated state using the approved token-handling strategy.
6. The user is directed to the appropriate page according to their role.
7. Invalid credentials, expired authentication, and server errors are handled clearly.

---

## 7. User Interface and Design Direction

### 7.1 Overall Design

The interface should feel professional, clean, practical, and trustworthy. AirTracer is a maintenance-record platform, so information clarity and efficient workflows are more important than decorative visual effects.

Use a consistent design system for:

- Typography.
- Spacing.
- Colors.
- Buttons.
- Form controls.
- Cards.
- Tables or lists.
- Status indicators.
- Dialogs and notifications.
- Loading and empty states.

### 7.2 Layout

- Use a responsive layout suited to desktop and mobile.
- Use navigation appropriate to the screen size and the user's role.
- Keep key actions easy to find.
- Display service history in a readable chronological format.
- Organize measurement values into clearly labeled groups.
- Display photographs in a practical gallery or evidence section.
- Use reusable components rather than duplicating interface patterns.

### 7.3 Forms

- Mark required fields clearly.
- Group related equipment and service fields logically.
- Use suitable numeric inputs for measurements.
- Prevent invalid values where validation rules are defined.
- Preserve entered values when safe to do so after recoverable errors.
- Show field-specific validation messages when available.

### 7.4 Interface States

Important screens must account for:

- Initial loading.
- Successful data retrieval.
- Empty data.
- Validation errors.
- Network failures.
- Unauthorized access.
- Expired sessions.
- File upload failures.
- Offline or degraded connectivity.

Do not make every screen appear populated with invented equipment or service records. If demonstration data is necessary during development, identify it as mock data and keep it separate from real application data.

---

## 8. Technical Boundaries and Existing Architecture

The application is being developed in a pnpm workspace monorepo.

- `apps/api/` — existing NestJS backend.
- `apps/pwa/` — React frontend built with Vite and TypeScript.
- `docs/` — product and technical documentation.

The existing backend uses Prisma and PostgreSQL. Supabase Storage is the intended cloud storage provider for service photographs.

The frontend must integrate with the existing backend rather than independently recreating business logic or accessing the database directly.

### 8.1 API Integration

Before implementing a frontend feature:

1. Inspect the relevant backend controller and service.
2. Inspect the DTOs, authentication guards, authorization rules, and response shape.
3. Confirm the actual HTTP method, endpoint, request payload, and response.
4. Implement frontend types and API calls to match the verified contract.
5. Report discrepancies between the API implementation, Pand PRD rather than silently inventing behavior.

The documented product workflows describe intended behavior; they do not prove that every backend endpoint or feature already exists.

### 8.2 State Management

Use local React state for simple component-level state. Introduce shared state or server-state libraries only where the application's complexity justifies them.

Server data should be handled consistently, including loading states, error states, and invalidation or refresh after mutations.

### 8.3 Offline Behavior

The PWA supports appropriate resource caching and graceful handling of connectivity loss, plus two approved offline workflows.

**Offline passports.** A signed-in user can save a passport on the device. Saved copies contain only the public passport fields and service history text; photos are shown only online. Saved copies are refreshed when the device is online and labelled with when they were last updated. If the QR code is deactivated or regenerated, the saved copy is deleted. Saved copies belong to the user who saved them and are removed on logout or when another account signs in.

**Offline service records.** A technician can create a service record without a connection. The record is saved on the device first, then sent to the API automatically when the connection returns. Rules:

- Service records are append-only, so offline creation cannot overwrite another user's work. There is no conflict resolution beyond this.
- Each record carries a client-generated idempotency key, so a retried upload is stored once.
- The API re-checks authentication, authorization, and asset eligibility when the record arrives. A record the API rejects is kept on the device and shown to the technician, who can correct and retry it or discard it explicitly. Records are never discarded automatically.
- Records sync only for the account that created them. Another account on the same device sees only a count.
- Logging out with unsynced records is blocked until they are synced or explicitly discarded.
- An expired session must be renewed by signing in before records can sync.
- The device-reported capture time is recorded in the audit log for information; the server does not trust the device clock.

Photo uploads, record edits, status changes, and other write operations remain online-only. Do not extend the offline queue to them without an approved requirement.

### 8.4 Dependencies

Prefer the libraries already installed and established in the repository. Before adding dependencies or changing major versions, inspect the current package manifests and workspace configuration.

---

## 9. Acceptance Criteria

The following criteria describe intended product behavior. They should be verified against the implemented application before a feature is considered complete.

### Authentication

- Users can register using permitted roles and log in.
- Authentication errors are handled clearly.
- Protected operations reject unauthorized requests.
- Ordinary users cannot grant themselves administrative privileges.

### Equipment

- Authorized owners can register and view equipment.
- Equipment information persists after refresh and a new session.
- Unauthorized users cannot access private equipment by manipulating identifiers.
- QR codes resolve to the intended equipment passport.

### Service History

- Authorized technicians can create service records for eligible equipment.
- Service records are associated with the correct equipment and authenticated technician.
- Applicable measurements, findings, recommendations, and photographs are stored and displayed correctly.
- Existing records follow the approved modification and deletion rules.

### PWA

- The application has a valid manifest and icons.
- The app can be installed on supported platforms.
- The production build registers the service worker as configured.
- Cached application resources behave as intended without a network connection.
- Offline limitations are communicated or handled gracefully.

### User Experience

- The application is usable on mobile and desktop.
- Important operations show appropriate loading, success, empty, and error states.
- Forms provide understandable validation feedback.
- Navigation reflects the user's role and permissions.

### Security and Integrity

- Backend authorization is enforced independently of frontend visibility.
- Private credentials and server secrets are not exposed in client-side code.
- File uploads follow the configured validation and authorization rules.
- Service records and photographs maintain their correct relationships.

---

## 10. Implementation Guidance for the Development Agent

When implementing AirTracer, follow these rules:

1. Inspect the existing repository before modifying files.
2. Read the project's agent instructions, package manifests, and relevant backend code.
3. Implement the product incrementally, completing and verifying one workflow at a time.
4. Prioritize functional correctness, data integrity, security, and usability over visual polish alone.
5. Reuse existing API functionality when it meets the requirement.
6. Do not fabricate backend endpoints, database fields, response formats, or business rules.
7. Do not replace the existing technology stack without explicit approval.
8. Do not implement out-of-scope features simply because they appear useful.
9. Run relevant checks after changes and report which checks passed or could not be completed.
10. Identify missing requirements or architectural decisions before making consequential assumptions.

### Suggested implementation order

1. Inspect the existing monorepo
2. Initialize and configure the React + TypeScript frontend.
3. Configure Tailwind CSS and establish the base design system.
4. Add PWA manifest, icons, service worker, and caching configuration.
5. Implement routing, layouts, and authentication.
6. Implement equipment listing, registration, and detail views.
7. Implement QR code display, scanning, and passport access.
8. Implement service history and service-record creation.
9. Implement photo uploads and evidence display.
10. Add administrative capabilities that are explicitly required.
11. Verify authorization, responsive behavior, error handling, and PWA functionality.

This sequence is a recommendation, not a claim that these features are already implemented.

---

## 11. Requirement Clarification

When a requirement is ambiguous, contradictory, or unsupported by the existing backend:

- Explain what is unclear.
- Identify the affected workflow or API contract.
- Inspect relevant source code and documentation.
- Ask for clarification when the decision affects security, data integrity, ownership, or major architecture.
- Prefer the smallest safe implementation that satisfies the confirmed requirement.

Do not silently treat planned functionality as completed functionality.

## 12. Definition of Product Completion

AirTracer is considered ready for its intended evaluation when the approved functional workflows are implemented, the frontend and backend operate together correctly, equipment and service history remain consistent, access controls are enforced, and the PWA behaves as documented.

Completion must be based on verified implementation and testing, not on the existence of screens or a successful frontend build alone.
