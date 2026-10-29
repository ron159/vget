# Changelog

## 1.2.26 - 2026-10-29

### Added
- Integrated upstream Tailcat sharing, send/receive/push and resumable downloads.
- Display transcription tasks directly on the voice-to-text page, with live model loading, speech recognition and text-writing stages, elapsed time, cancellation and final results. Refreshing the page restores task visibility.

### Fixed
- Reset download progress when speech transcription begins and keep cancellation from being overwritten by a late process failure.
- Include transcription metadata in the jobs API so podcast/download transcription tasks appear on the transcription page too.
- Copy the current FunASR wrapper into release images even when reusing the model base image.
- Preserve configured WebDAV subpaths for nested directory operations.

### Compatibility
- Retained this fork's voice-to-text pipeline, FunASR models, site extractors, desktop app, authentication and WebDAV management; excluded upstream feature removals.
- Compose uses this fork's image to retain transcription support. Go builds require Go 1.27.1 or newer.
- The engine reports processing stages, not a precise completion percentage or remaining time.
