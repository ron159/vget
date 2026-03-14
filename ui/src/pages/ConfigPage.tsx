import { useApp } from "../context/AppContext";
import { ConfigEditor, type ConfigValues } from "../components/ConfigEditor";
import { TorrentSettings } from "../components/TorrentSettings";

export function ConfigPage() {
  const {
    isConnected,
    t,
    configLang,
    configFormat,
    configQuality,
    serverPort,
    maxConcurrent,
    apiKey,
    kuaidi100Key,
    kuaidi100Customer,
    telegramTdataPath,
    webdavServers,
    saveConfig,
    addWebDAV,
    deleteWebDAV,
  } = useApp();

  const handleSaveConfig = async (values: ConfigValues) => {
    await saveConfig(values);
  };

  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-4">
      <ConfigEditor
        isConnected={isConnected}
        t={t}
        initialLang={configLang}
        initialFormat={configFormat}
        initialQuality={configQuality}
        initialMaxConcurrent={maxConcurrent}
        initialApiKey={apiKey}
        initialKuaidi100Key={kuaidi100Key}
        initialKuaidi100Customer={kuaidi100Customer}
        initialTelegramTdataPath={telegramTdataPath}
        serverPort={serverPort}
        webdavServers={webdavServers}
        onSave={handleSaveConfig}
        onCancel={() => {}}
        onAddWebDAV={addWebDAV}
        onDeleteWebDAV={deleteWebDAV}
      />

      <TorrentSettings isConnected={isConnected} />
    </div>
  );
}
