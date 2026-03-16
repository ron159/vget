export const supportedLanguages = ["en", "zh"] as const;

export type SupportedLanguage = (typeof supportedLanguages)[number];

export function isSupportedLanguage(
  language: string | null | undefined
): language is SupportedLanguage {
  return supportedLanguages.includes((language ?? "") as SupportedLanguage);
}

export function normalizeLanguage(
  language: string | null | undefined
): SupportedLanguage {
  return isSupportedLanguage(language) ? language : "en";
}
