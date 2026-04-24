import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import FormErrorAlert from '../FormErrorAlert';

describe('FormErrorAlert', () => {
  it('renders alert semantics and message', () => {
    const html = renderToStaticMarkup(
      React.createElement(FormErrorAlert, { message: 'Validation failed' }),
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
    expect(html).toContain('Validation failed');
  });
});
