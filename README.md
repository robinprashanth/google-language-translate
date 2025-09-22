# Google Translate for i18n

A standalone TypeScript project for automatically translating missing i18n keys using Google Cloud Translate API.

## Setup

1. **Install dependencies:**

    ```bash
    npm install
    ```

2. **Set up Google Cloud credentials:**

    Option A - Service Account Key:

    ```bash
    export GOOGLE_APPLICATION_CREDENTIALS="path/to/your/service-account-key.json"
    ```

    Option B - Application Default Credentials:

    ```bash
    gcloud auth application-default login
    ```

3. **Copy your i18n.ts file:**
   Copy your `i18n.ts` file from your main project to the `src/` directory.

## Usage

### Test the setup (recommended first step):

```bash
npm test
# or
npm run translate:test
```

### Translate missing keys:

```bash
npm run translate:missing
```

### Build the project:

```bash
npm run build
```

### Run compiled version:

```bash
npm start
```

## Features

-   ✅ **Automatic Detection**: Finds missing translation keys compared to English
-   ✅ **Google Translate Integration**: Uses Google Cloud Translate API
-   ✅ **Rate Limiting**: Built-in delays to avoid API limits
-   ✅ **Retry Logic**: Automatic retries for failed translations
-   ✅ **Backup Creation**: Creates backup before modifying files
-   ✅ **TypeScript Support**: Full TypeScript implementation
-   ✅ **Configurable**: Easy configuration via `translate-config.ts`

## Configuration

Edit `src/translate-config.ts` to customize:

-   `apiDelay`: Delay between API calls (default: 100ms)
-   `maxRetries`: Maximum retry attempts (default: 3)
-   `verbose`: Enable detailed logging (default: true)
-   `targetLanguages`: Languages to translate to

## Supported Languages

-   Spanish (es)
-   French (fr)
-   German (de)
-   Italian (it)
-   Portuguese (pt)
-   Japanese (ja)

## Project Structure

```
google-translate/
├── src/
│   ├── i18n.ts                    # Your i18n file (copy from main project)
│   ├── translate-missing-keys.ts  # Main translation script
│   ├── translate-config.ts        # Configuration
│   ├── test-translate.ts          # Test script
│   └── index.ts                   # Entry point
├── dist/                          # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
└── README.md
```

## Workflow

1. Copy your latest `i18n.ts` from your main project to `src/`
2. Run `npm test` to see what keys are missing
3. Run `npm run translate:missing` to auto-translate
4. Review the translations in the updated `i18n.ts`
5. Copy the updated file back to your main project

## Important Notes

-   **Review Required**: Machine translations may need manual review
-   **API Costs**: Google Translate API calls may incur charges
-   **Backup**: Always creates a backup before modifying files
-   **Context**: Some translations may need adjustment for UI context
