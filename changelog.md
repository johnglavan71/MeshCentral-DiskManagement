# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Known Issues]
- None. Please feel free to submit an issue if you find anything.

## [1.1.4] - 2026-06-24
### Fixed
- Finalized UI constraints by applying dynamic viewport calculation heights (`calc(100vh - 250px)`) to provide maximum visual clarity across all screen sizes and permanently clear the MeshCentral "Terms & Privacy" footer.

## [1.1.3] - 2026-06-24
### Fixed
- Increased CSS viewport padding to `calc(100vh - 190px)` to clear the MeshCentral "Terms & Privacy" footer overlap.

## [1.1.2] - 2026-06-24
### Fixed
- Updated CSS viewport logic to `calc(100vh - 150px)` to resolve parent container overflow constraints that were ignoring `height: 100%`.

## [1.1.1] - 2026-06-24
### Fixed
- Fixed missing scrollbar container issues by applying CSS viewport logic (`height: 100%; overflow-y: auto`) to the main datatable.

## [1.1.0] - 2026-06-24
### Fixed
- Fixed frontend UI missing-data issue by explicitly exporting the `loadDisksData` method into MeshCentral's implicit plugin router payload, bypassing the non-functional `fe_on_message` implementation.

## [1.0.9] - 2026-06-24
### Fixed
- Completely rewrote the core agent execution layer to mirror the `regedit.js` plugin's PowerShell execution strategy, leveraging Duktape's synchronous `waitExit()` process handling.

## [1.0.8] - 2026-06-24
### Changed
- Refactored `child_process.execFile` array arguments to appease the MeshAgent JavaScript Engine and injected heavy agent-side file-system trace logging to identify Duktape asynchronous callback failures.

## [1.0.7] - 2026-06-24
### Changed
- Injected filesystem debugging trace logs directly into `diskmanagement.js` server script to verify routing of the agent's response payload.

## [1.0.6] - 2026-06-24
### Fixed
- Migrated core communication away from the unstable `CreateAgentRedirect` protocol to MeshCentral's stable standard control channel (`meshserver.send`).

## [1.0.5] - 2026-06-24
### Added
- Added error handling boundaries and initial console debugging output for agent execution tracing to diagnose silent failures.

## [1.0.4] - 2026-06-24
### Fixed
- Corrected missing file system metrics in the response payload.
- Added `formatBytes` utility to the frontend to ensure proper human-readable storage size rendering.

## [1.0.3] - 2026-06-24
### Added
- Restructured frontend UI to include visual disk layout representations mimicking the native Windows diskmgmt.msc interface.
- Injected dynamic CSS table rendering.

## [1.0.2] - 2026-06-24
### Changed
- Attempted implementation of the `CreateAgentRedirect` protocol to execute raw terminal commands on the agent.

## [1.0.1] - 2026-06-24
### Added
- Implemented initial data parsing and HTML table rendering logic on the frontend.

## [1.0.0] - 2026-06-24
### Added
- Initial release of the Disk Management plugin.
- Added basic execution of `Get-Disk`, `Get-Partition`, and `Get-Volume` PowerShell commands.
- Created the foundational server-side routing mechanism and plugin UI tab registration.
