import { Torrent } from "../components/Torrent";
import { useApp } from "../context/AppContext";

export function TorrentPage() {
  const { isConnected, torrentEnabled } = useApp();

  return (
    <div className="max-w-3xl mx-auto">
      <Torrent isConnected={isConnected} torrentEnabled={torrentEnabled} />
    </div>
  );
}
