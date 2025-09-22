// Configuration for the translation script

export interface TranslateConfig {
    // Delay between API calls (in milliseconds) to avoid rate limiting
    apiDelay: number;

    // Maximum number of retries for failed translations
    maxRetries: number;

    // Whether to show detailed logging
    verbose: boolean;

    // Languages to translate to
    targetLanguages: string[];

    // Google Cloud Translate project ID (optional)
    projectId?: string;
}

export const defaultConfig: TranslateConfig = {
    apiDelay: 100, // 100ms delay between API calls
    maxRetries: 3,
    verbose: true,
    targetLanguages: ["es", "fr", "de", "it", "pt", "ja"],
    // projectId will be auto-detected from Google Cloud credentials
};

// Language display names
export const LANGUAGE_NAMES: Record<string, string> = {
    es: "Spanish (Español)",
    fr: "French (Français)",
    de: "German (Deutsch)",
    it: "Italian (Italiano)",
    pt: "Portuguese (Português)",
    ja: "Japanese (日本語)",
};

// Google Translate API language codes
export const GOOGLE_TRANSLATE_CODES: Record<string, string> = {
    es: "es",
    fr: "fr",
    de: "de",
    it: "it",
    pt: "pt",
    ja: "ja",
};
