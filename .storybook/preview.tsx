import * as React from 'react';
import type { Preview } from '@storybook/nextjs-vite';
import '../src/app/globals.css';

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
        style={{
          maxWidth: 960,
          margin: '0 auto',
          padding: 24,
          backgroundColor: '#ffffff',
          borderRadius: 8,
          minHeight: 80,
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
