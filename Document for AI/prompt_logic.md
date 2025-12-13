# Prompt Logic Documentation

## Overview
This document explains how the text prompt is selected, passed, and sent to the Nano Banana (Gemini) API.

## Logic Flow

### 1. Selection (NanoBananaScreen)
When a generation is initiated, a `finalCustomPrompt` is resolved:
- **Preset Click**: The standard preset's prompt is used (implicitly, as `presetId` is passed).
- **History Item Click**: The item's stored `prompt_text` is passed as `customPrompt`.
- **Manual Entry**: The text from the input field is passed as `customPrompt`.

**Priority Rule**: The system prioritizes the explicitly selected item's prompt (history or manual submit) over the current state of the "Custom Prompt" toggle/input field.

### 2. Resolution (NanoBananaResultScreen)
Inside `NanoBananaResultScreen`, the final `promptToUse` is determined:
1.  **Standard Preset**: If `presetId` matches a built-in preset, `selectedPreset.prompt` is used.
2.  **Custom/History**: If `presetId` is 'custom' OR a history UUID (not found in built-ins):
    -   It uses the passed `customPrompt` param.
    -   **Fallback**: If `customPrompt` is missing/empty, it defaults to `'Lego style'` (safety).

### 3. API Transmission (NanoBananaService)
The prompt is sent to the Google Gemini API:
-   **Endpoint**: `.../models/gemini-pro-vision:generateContent` (or similar configured model).
-   **Payload Structure**:
    ```json
    {
      "contents": [
        {
          "parts": [
            { "text": "<promptToUse>" },
            { "inlineData": ... } // if reference image exists
          ]
        }
      ]
    }
    ```
-   The prompt is passed as a simple text part.
