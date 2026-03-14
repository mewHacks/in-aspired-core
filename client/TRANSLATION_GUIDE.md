# Translation Guide for In-Aspired

This guide provides a step-by-step process for translating new or remaining components in the In-Aspired application using the `react-i18next` library.

## Overview
The application uses `react-i18next` to support multiple languages. 
Our current supported languages are located in `client/src/locales/`:
- **English**: `en`
- **Simplified Chinese**: `zh`
- **Malay**: `ms`
- **Tamil**: `ta`

The translation strings are stored in `translation.json` within each language directory.

## Step 1: Add Keys to Translation Dictionaries

When you find a hardcoded string that needs translation, you first need to add it to the JSON dictionaries for **ALL** supported languages.

For example, if you want to translate a new banner saying "Welcome to the new platform!":

**1. Open `client/src/locales/en/translation.json`:**
```json
{
  "welcomeBanner": {
    "title": "Welcome to the new platform!"
  }
}
```

**2. Open `client/src/locales/zh/translation.json` (Repeat for `ms` and `ta`):**
```json
{
  "welcomeBanner": {
    "title": "欢迎来到新平台！"
  }
}
```

## Step 2: Implement `useTranslation` Hook in the Component

Now, go to the React component (`.tsx` file) where the hardcoded string is located.

**1. Import the hook:**
```tsx
import { useTranslation } from 'react-i18next';
```

**2. Initialize the hook inside the functional component:**
```tsx
const YourComponent: React.FC = () => {
    const { t } = useTranslation();
    // ... rest of the component
}
```

**3. Replace hardcoded strings with the `t` function:**
Use the path to the key you defined in the JSON file. It is best practice to provide an English fallback string as the second argument.

*Before:*
```tsx
<h1>Welcome to the new platform!</h1>
```

*After:*
```tsx
<h1>{t('welcomeBanner.title', 'Welcome to the new platform!')}</h1>
```

## Step 3: Handling Variables and Interpolation

Sometimes strings have dynamic values, like a username or a counter.

**1. Define the string with placeholders in the JSON:**
```json
{
  "userGreeting": "Hello, {{username}}!"
}
```

**2. Pass the variables as an object in the component:**
```tsx
const username = "Alex";
<h1>{t('userGreeting', 'Hello, {{username}}!', { username })}</h1>
```

## Step 4: Translating Arrays or Lists (e.g. Select Dropdowns)

If you have an array of options used for mapping UI elements, you can translate them dynamically.

```tsx
// Using a dynamic key inside a map
{myOptions.map(option => (
  <option key={option.id} value={option.value}>
    {t(`options.${option.id}`, option.label)}
  </option>
))}
```

## Step 5: Verify Changes

After implementing the translations:
1. Start the development server (`npm run dev`).
2. Navigate to Settings and change the application language.
3. Validate that the modified component correctly updates its text to the selected language.
4. Run `npm run build` locally to ensure there are no missing types or TypeScript compilation errors.
