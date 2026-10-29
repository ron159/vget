# Upstream synchronization policy

This fork retains voice-to-text transcription, including the FunASR runtime,
podcast/download transcription, local uploads, transcript formats and web UI.
Upstream changes must not remove those features.

## 2026-10-29

Integrated upstream `99469160151f3ac7129eab013ecf67235045b451`:

- Added Tailcat library sharing, send/receive/push, relay and identity commands.
- Added resumable transfers and transport support to the download engine.
- Retained the fork's WebDAV subpath handling, upload/delete/mkdir management,
  web authentication, transcription, existing site extractors and desktop app.
- Updated the Go build toolchain to match Tailcat's Go 1.27 requirement.

The upstream feature-removal commits `f04ae3a`, `514c7fc`, `e7efeb4` and
`798b070` were deliberately not applied. Positioning documents and upstream
version changes that describe that reduced feature set were also omitted.
The unused-style cleanup in `560ddd8` is not applicable: the retained browser
extractor still uses that style. The merge records the upstream tip as a parent
so future syncs can start from this reviewed integration point.

Validation: full Go tests, Web UI production build, and an HTTP WebDAV regression
covering a configured endpoint subpath, nested directories, upload, read and delete.
