/**
 * Google Translate i18n Tool
 *
 * Entry point for the translation tool.
 * This can be used to run the translation script programmatically.
 */

import { runTests } from "./test-translate";

// Export main functions for programmatic use
export {
    parseI18nFile,
    findMissingKeys,
    updateTranslations,
    writeUpdatedTranslations,
    translateText,
} from "./translate-missing-keys";

export {
    defaultConfig,
    LANGUAGE_NAMES,
    GOOGLE_TRANSLATE_CODES,
    TranslateConfig,
} from "./translate-config";

export { runTests } from "./test-translate";

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case "test":
            await runTests();
            break;
        case "translate":
            const { main: translateMain } = await import(
                "./translate-missing-keys"
            );
            await translateMain();
            break;
        default:
            console.log("Google Translate i18n Tool");
            console.log("");
            console.log("Usage:");
            console.log("  node dist/index.js test       - Run tests");
            console.log(
                "  node dist/index.js translate  - Translate missing keys"
            );
            console.log("");
            console.log("Or use npm scripts:");
            console.log("  npm test                      - Run tests");
            console.log(
                "  npm run translate:missing     - Translate missing keys"
            );
            break;
    }
}

// Run CLI if this file is executed directly
if (require.main === module) {
    main().catch((error) => {
        console.error("❌ Error:", error);
        process.exit(1);
    });
}
