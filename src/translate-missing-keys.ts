import * as fs from "fs";
import * as path from "path";
import { Translate } from "@google-cloud/translate/build/src/v2";
import {
    defaultConfig,
    LANGUAGE_NAMES,
    GOOGLE_TRANSLATE_CODES,
    TranslateConfig,
} from "./translate-config";
require("dotenv").config();

// Use configuration
const config: TranslateConfig = defaultConfig;

// Interface definitions
interface TranslationObject {
    [key: string]: string | TranslationObject;
}

interface Translations {
    [languageCode: string]: TranslationObject;
}

interface MissingKeys {
    [languageCode: string]: string[];
}

// Initialize Google Translate
let translate: Translate;

try {
    if (!process.env.GOOGLE_TRANSLATE_PROJECT_ID) {
        throw new Error("GOOGLE_TRANSLATE_PROJECT_ID is not set");
    }
    if (!process.env.GOOGLE_TRANSLATE_KEY) {
        throw new Error("GOOGLE_TRANSLATE_KEY is not set");
    }
    translate = new Translate({
        projectId: process.env.GOOGLE_TRANSLATE_PROJECT_ID,
        key: process.env.GOOGLE_TRANSLATE_KEY,
    });
    console.log("✅ Google Translate initialized successfully");
} catch (error) {
    console.error("❌ Error initializing Google Translate:", error);
    console.log("💡 Make sure you have set up Google Cloud credentials:");
    console.log(
        "   1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable"
    );
    console.log("   2. Or run: gcloud auth application-default login");
    console.log(
        "   3. Ensure the Translate API is enabled in your Google Cloud project"
    );
    process.exit(1);
}

function parseI18nFile(filePath: string): Translations {
    const content = fs.readFileSync(filePath, "utf8");

    // Extract the translations object using regex
    const translationsMatch = content.match(
        /const translations = ({[\s\S]*?});/
    );
    if (!translationsMatch) {
        throw new Error("Could not find translations object in file");
    }

    // Use eval to parse the object (be careful with this in production)
    // For safety, we'll parse it manually
    const translationsStr = translationsMatch[1];

    // This is a simplified parser - for production, use a proper JS parser
    const translations = eval(`(${translationsStr})`) as Translations;

    return translations;
}

function findMissingKeys(translations: Translations): MissingKeys {
    const baseLanguage = "en";
    const baseKeys = getAllKeys(translations[baseLanguage]);
    const missingKeys: MissingKeys = {};

    Object.keys(translations).forEach((lang) => {
        if (lang === baseLanguage) return;

        const langKeys = getAllKeys(translations[lang]);
        const missing = baseKeys.filter((key) => !langKeys.includes(key));

        if (missing.length > 0) {
            missingKeys[lang] = missing;
        }
    });

    return missingKeys;
}

function getAllKeys(obj: TranslationObject, prefix = ""): string[] {
    let keys: string[] = [];

    Object.keys(obj).forEach((key) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;

        if (
            typeof obj[key] === "object" &&
            obj[key] !== null &&
            !Array.isArray(obj[key])
        ) {
            keys = keys.concat(
                getAllKeys(obj[key] as TranslationObject, fullKey)
            );
        } else {
            keys.push(fullKey);
        }
    });

    return keys;
}

function getValueByPath(
    obj: TranslationObject,
    path: string
): string | undefined {
    return path
        .split(".")
        .reduce((current: any, key) => current && current[key], obj) as
        | string
        | undefined;
}

function setValueByPath(
    obj: TranslationObject,
    path: string,
    value: string
): void {
    const keys = path.split(".");
    const lastKey = keys.pop()!;
    const target = keys.reduce((current: any, key) => {
        if (!current[key]) current[key] = {};
        return current[key];
    }, obj);
    target[lastKey] = value;
}

async function translateText(
    text: string,
    targetLang: string,
    retryCount = 0
): Promise<string> {
    try {
        const googleLangCode = GOOGLE_TRANSLATE_CODES[targetLang];
        if (!googleLangCode) {
            console.warn(
                `⚠️  No Google Translate code found for language: ${targetLang}`
            );
            return `[${targetLang.toUpperCase()}] ${text}`;
        }

        if (config.verbose) {
            console.log(
                `   🔄 Translating "${text}" to ${LANGUAGE_NAMES[targetLang]}...`
            );
        }

        const [translation] = await translate.translate(text, {
            from: "en",
            to: googleLangCode,
        });

        if (config.verbose) {
            console.log(`   ✅ Translation: "${translation}"`);
        }
        return translation;
    } catch (error) {
        if (retryCount < config.maxRetries) {
            console.warn(
                `   ⚠️  Translation failed, retrying (${retryCount + 1}/${
                    config.maxRetries
                })...`
            );
            await new Promise((resolve) =>
                setTimeout(resolve, config.apiDelay * 2)
            ); // Double delay on retry
            return translateText(text, targetLang, retryCount + 1);
        }

        console.error(
            `   ❌ Translation failed for "${text}" to ${targetLang} after ${config.maxRetries} retries:`,
            error
        );
        return `[${targetLang.toUpperCase()}] ${text}`;
    }
}

async function updateTranslations(
    translations: Translations,
    missingKeys: MissingKeys
): Promise<Translations> {
    for (const lang of Object.keys(missingKeys)) {
        console.log(
            `\n🔄 Adding ${missingKeys[lang].length} missing keys for ${LANGUAGE_NAMES[lang]}:`
        );

        for (const keyPath of missingKeys[lang]) {
            const englishValue = getValueByPath(translations.en, keyPath);
            if (englishValue && typeof englishValue === "string") {
                const translatedValue = await translateText(englishValue, lang);
                setValueByPath(translations[lang], keyPath, translatedValue);
                console.log(
                    `  ✅ ${keyPath}: "${englishValue}" -> "${translatedValue}"`
                );

                // Add a small delay to avoid hitting rate limits
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
    }

    return translations;
}

function writeUpdatedTranslations(
    filePath: string,
    translations: Translations
): void {
    const content = fs.readFileSync(filePath, "utf8");

    // Create the new translations object string with proper formatting
    const translationsStr = JSON.stringify(translations, null, 4)
        .replace(/"/g, '"')
        .replace(/\n/g, "\n");

    // Replace the translations object in the file
    const updatedContent = content.replace(
        /const translations = {[\s\S]*?};/,
        `const translations = ${translationsStr};`
    );

    // Write the updated content back to the file
    fs.writeFileSync(filePath, updatedContent, "utf8");
}

async function main(): Promise<void> {
    const i18nFilePath = path.join(__dirname, "./i18n.ts");

    try {
        console.log("🔍 Analyzing i18n file for missing translations...");

        // Parse the current translations
        const translations = parseI18nFile(i18nFilePath);

        // Find missing keys
        const missingKeys = findMissingKeys(translations);

        if (Object.keys(missingKeys).length === 0) {
            console.log("✅ No missing translations found!");
            return;
        }

        console.log("\n📊 Missing translations found:");
        Object.keys(missingKeys).forEach((lang) => {
            console.log(
                `  ${LANGUAGE_NAMES[lang]} (${lang}): ${missingKeys[lang].length} missing keys`
            );
        });

        // Show which keys are missing
        console.log("\n📝 Missing keys:");
        Object.keys(missingKeys).forEach((lang) => {
            console.log(`\n  ${LANGUAGE_NAMES[lang]} (${lang}):`);
            missingKeys[lang].forEach((key) => {
                const englishValue = getValueByPath(translations.en, key);
                console.log(`    - ${key}: "${englishValue}"`);
            });
        });

        // Ask for confirmation before proceeding with translation
        console.log(
            "\n🤖 Ready to translate missing keys using Google Translate API..."
        );
        console.log(
            "⚠️  This will make API calls to Google Translate and may incur costs."
        );

        // In a real CLI, you might want to add a prompt here
        // For now, we'll proceed automatically

        // Create backup
        const backupPath = i18nFilePath + ".backup";
        fs.copyFileSync(i18nFilePath, backupPath);
        console.log(`\n💾 Backup created: ${backupPath}`);

        // Update translations using Google Translate
        console.log("\n🌐 Translating missing keys...");
        const updatedTranslations = await updateTranslations(
            translations,
            missingKeys
        );

        // Write updated file
        writeUpdatedTranslations(i18nFilePath, updatedTranslations);

        console.log("\n✅ Translation file updated successfully!");
        console.log("\n📝 Summary:");
        Object.keys(missingKeys).forEach((lang) => {
            console.log(
                `  ${LANGUAGE_NAMES[lang]}: Added ${missingKeys[lang].length} translations`
            );
        });

        console.log(
            "\n💡 Note: Please review the translations and make adjustments as needed."
        );
        console.log(
            "   Machine translations may not always be perfect for context-specific terms."
        );
    } catch (error) {
        console.error(
            "❌ Error processing translations:",
            (error as Error).message
        );
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main().catch((error) => {
        console.error("❌ Unexpected error:", error);
        process.exit(1);
    });
}

export {
    parseI18nFile,
    findMissingKeys,
    updateTranslations,
    writeUpdatedTranslations,
    translateText,
    main,
};
