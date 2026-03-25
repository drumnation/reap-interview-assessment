import * as React from 'react';
import type { Preview } from '@storybook/nextjs-vite';
import '../src/app/globals.css';

/**
 * Mirror the app's body styling and force light-mode CSS variables.
 *
 * The real app applies these via layout.tsx <body> and globals.css.
 * Without this, Storybook inherits the OS color scheme — if the user
 * is in dark mode, --foreground becomes #ededed (near-white) which is
 * invisible against a white component background.
 */
const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <div
        className="antialiased"
        style={{
          // Force light-mode variables regardless of OS preference
          ['--background' as string]: '#ffffff',
          ['--foreground' as string]: '#171717',
          // Match app layout
          color: '#171717',
          backgroundColor: '#f9fafb', // bg-gray-50
          maxWidth: 960,
          margin: '0 auto',
          padding: 24,
          borderRadius: 8,
          minHeight: 80,
          fontFamily: 'Arial, Helvetica, sans-serif',
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
