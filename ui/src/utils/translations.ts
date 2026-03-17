export interface UITranslations {
  download_to: string;
  edit: string;
  save: string;
  cancel: string;
  paste_url: string;
  download: string;
  bulk_download: string;
  coming_soon: string;
  bulk_paste_urls: string;
  bulk_select_file: string;
  bulk_drag_drop: string;
  bulk_url_count: string;
  bulk_submit_all: string;
  bulk_submitting: string;
  bulk_clear: string;
  bulk_invalid_hint: string;
  adding: string;
  jobs: string;
  total: string;
  no_downloads: string;
  paste_hint: string;
  queued: string;
  downloading: string;
  transcribing: string;
  completed: string;
  failed: string;
  cancelled: string;
  settings: string;
  theme_mode: string;
  theme_system: string;
  theme_dark: string;
  theme_light: string;
  language: string;
  format: string;
  quality: string;
  twitter_auth: string;
  server_port: string;
  max_concurrent: string;
  api_key: string;
  webdav_servers: string;
  add: string;
  delete: string;
  name: string;
  url: string;
  username: string;
  password: string;
  no_webdav_servers: string;
  clear_history: string;
  clear_all: string;
  // WebDAV
  webdav_browser: string;
  select_remote: string;
  empty_directory: string;
  download_selected: string;
  selected_files: string;
  upload_files: string;
  new_folder: string;
  delete_remote: string;
  loading: string;
  go_to_settings: string;
  // Torrent
  torrent: string;
  torrent_hint: string;
  torrent_submit: string;
  torrent_submitting: string;
  torrent_success: string;
  torrent_not_configured: string;
  torrent_settings: string;
  torrent_client: string;
  torrent_host: string;
  torrent_test: string;
  torrent_testing: string;
  torrent_test_success: string;
  torrent_enabled: string;
  torrent_https: string;
  torrent_save_path: string;
  torrent_save_path_hint: string;
  torrent_loading: string;
  torrent_save_success: string;
  torrent_save_failed: string;
  torrent_connection_failed: string;
  torrent_default_port_transmission: string;
  torrent_default_port_qbittorrent: string;
  torrent_default_port_synology: string;
  torrent_client_transmission: string;
  torrent_client_qbittorrent: string;
  torrent_client_synology: string;
  // Toast
  download_queued: string;
  downloads_queued: string;
  optional: string;
  kuaidi100_title: string;
  kuaidi100_customer_id: string;
  telegram_title: string;
  telegram_tdata_path: string;
  telegram_tdata_path_hint: string;
  // Podcast
  podcast: string;
  podcast_search: string;
  podcast_search_hint: string;
  podcast_searching: string;
  podcast_channels: string;
  podcast_episodes: string;
  podcast_no_results: string;
  podcast_episodes_count: string;
  podcast_back: string;
  podcast_download_started: string;
  // API Token
  token_title: string;
  token_description: string;
  token_custom_payload: string;
  token_custom_payload_hint: string;
  token_generate: string;
  token_generating: string;
  token_generated: string;
  token_copy: string;
  token_copied: string;
  token_usage: string;
  token_invalid_json: string;
  // History
  history: string;
  history_title: string;
  history_empty: string;
  history_empty_hint: string;
  history_clear_all: string;
  history_stats: string;
  history_total_downloaded: string;
  // Transcribe
  voice_transcription: string;
  transcribe_to_text: string;
  transcribe_format: string;
  transcribe_desc: string;
  transcribe_file_path: string;
  transcribe_file_path_hint: string;
  transcribe_starting: string;
  transcribe_start: string;
  transcribe_how_it_works: string;
  transcribe_how_1: string;
  transcribe_how_2: string;
  transcribe_how_3: string;
  transcribe_how_4: string;
  transcribe_how_5: string;
  transcribe_task_started: string;
  transcribe_task_failed: string;
  transcribe_network_err: string;
}

export interface ServerTranslations {
  no_config_warning: string;
  run_init_hint: string;
}

export const defaultTranslations: UITranslations = {
  download_to: "Download to:",
  edit: "Edit",
  save: "Save",
  cancel: "Cancel",
  paste_url: "Paste URL to download...",
  download: "Download",
  bulk_download: "Bulk Download",
  coming_soon: "Coming Soon",
  bulk_paste_urls: "Paste URLs here (one per line)...",
  bulk_select_file: "Select File",
  bulk_drag_drop: "or drag and drop a .txt file here",
  bulk_url_count: "URLs",
  bulk_submit_all: "Download All",
  bulk_submitting: "Submitting...",
  bulk_clear: "Clear",
  bulk_invalid_hint: "Empty lines and lines starting with # are ignored",
  adding: "Adding...",
  jobs: "Jobs",
  total: "total",
  no_downloads: "No downloads yet",
  paste_hint: "Paste a URL above to get started",
  queued: "queued",
  downloading: "downloading",
  transcribing: "transcribing...",
  completed: "completed",
  failed: "failed",
  cancelled: "cancelled",
  settings: "Settings",
  theme_mode: "Theme",
  theme_system: "System",
  theme_dark: "Dark",
  theme_light: "Light",
  language: "Language",
  format: "Format",
  quality: "Quality",
  twitter_auth: "Twitter Auth",
  server_port: "Server Port",
  max_concurrent: "Max Concurrent",
  api_key: "API Key",
  webdav_servers: "WebDAV Servers",
  add: "Add",
  delete: "Delete",
  name: "Name",
  url: "URL",
  username: "Username",
  password: "Password",
  no_webdav_servers: "No WebDAV servers configured",
  clear_history: "Clear",
  clear_all: "Clear All",
  // WebDAV
  webdav_browser: "WebDAV",
  select_remote: "Select Remote",
  empty_directory: "Empty directory",
  download_selected: "Download Selected",
  selected_files: "selected",
  upload_files: "Upload Files",
  new_folder: "New Folder",
  delete_remote: "Delete",
  loading: "Loading...",
  go_to_settings: "Go to Settings",
  // Torrent
  torrent: "BT/Magnet",
  torrent_hint: "Paste magnet link or torrent URL...",
  torrent_submit: "Send",
  torrent_submitting: "Sending...",
  torrent_success: "Torrent added successfully",
  torrent_not_configured: "Torrent client not configured. Go to Settings to set up.",
  torrent_settings: "Torrent Client",
  torrent_client: "Client Type",
  torrent_host: "Host",
  torrent_test: "Test Connection",
  torrent_testing: "Testing...",
  torrent_test_success: "Connection successful",
  torrent_enabled: "Enable Torrent",
  torrent_https: "HTTPS",
  torrent_save_path: "Save Path",
  torrent_save_path_hint: "(use client default)",
  torrent_loading: "Loading...",
  torrent_save_success: "Settings saved",
  torrent_save_failed: "Failed to save",
  torrent_connection_failed: "Connection failed",
  torrent_default_port_transmission: "Default port: 9091",
  torrent_default_port_qbittorrent: "Default port: 8080",
  torrent_default_port_synology: "Default port: 5000 (HTTP) / 5001 (HTTPS)",
  torrent_client_transmission: "Transmission",
  torrent_client_qbittorrent: "qBittorrent",
  torrent_client_synology: "Synology Download Station",
  // Toast
  download_queued: "Download started. Check progress on Download page.",
  downloads_queued: "downloads started. Check progress on Download page.",
  optional: "(optional)",
  kuaidi100_title: "Kuaidi100",
  kuaidi100_customer_id: "Customer ID",
  telegram_title: "Telegram",
  telegram_tdata_path: "TData Path",
  telegram_tdata_path_hint: "Custom Telegram Desktop tdata directory path",
  // Podcast
  podcast: "Podcast",
  podcast_search: "Search",
  podcast_search_hint: "Search podcasts or episodes...",
  podcast_searching: "Searching...",
  podcast_channels: "Podcasts",
  podcast_episodes: "Episodes",
  podcast_no_results: "No results found",
  podcast_episodes_count: "episodes",
  podcast_back: "Back",
  podcast_download_started: "Download started",
  // API Token
  token_title: "API Token Generator",
  token_description: "Generate JWT tokens for external API access (Chrome extension, scripts, etc.). Tokens are signed with your configured api_key.",
  token_custom_payload: "Custom Payload (optional)",
  token_custom_payload_hint: "Add custom claims to include in the JWT token. Must be valid JSON.",
  token_generate: "Generate Token",
  token_generating: "Generating...",
  token_generated: "Generated Token",
  token_copy: "Copy",
  token_copied: "Copied!",
  token_usage: "Usage",
  token_invalid_json: "Invalid JSON",
  // History
  history: "History",
  history_title: "Download History",
  history_empty: "No download history",
  history_empty_hint: "Completed downloads will appear here",
  history_clear_all: "Clear All History",
  history_stats: "Statistics",
  history_total_downloaded: "Total Downloaded",
  // Transcribe
  voice_transcription: "Voice Transcription",
  transcribe_to_text: "Transcribe Voice to Text (AI)",
  transcribe_format: "Transcription Format",
  transcribe_desc: "Convert local or previously downloaded audio/video files to text using AI.",
  transcribe_file_path: "File Path or Upload",
  transcribe_file_path_hint: "Select a local file to upload, or provide the absolute path to a media file within the vget output directory. Supported formats: .mp3, .m4a, .wav, .mp4, .mkv, .webm, .ts. Uploaded files are saved under transcribe_uploads in the output directory.",
  transcribe_starting: "Starting Task...",
  transcribe_start: "Start Transcription",
  transcribe_how_it_works: "How it works",
  transcribe_how_1: "The transcription uses the configured FunASR model (default: SenseVoiceSmall).",
  transcribe_how_2: "It runs locally on CPU and does not send your data to external APIs.",
  transcribe_how_3: "Once started, a background job will be created that you can track in the Downloads/Jobs view.",
  transcribe_how_4: "The output transcript will be saved as an `.srt` payload next to the original file.",
  transcribe_how_5: "Expect longer processing times for large files or when running on lower-end hardware.",
  transcribe_task_started: "Transcription task started processing.",
  transcribe_task_failed: "Failed to start transcription.",
  transcribe_network_err: "Network error or server unavailable.",
};

export const defaultServerTranslations: ServerTranslations = {
  no_config_warning: "No config file found. Using default settings.",
  run_init_hint: "Run 'vget init' to configure vget interactively.",
};
