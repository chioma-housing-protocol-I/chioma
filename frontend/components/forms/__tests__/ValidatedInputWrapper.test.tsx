import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import axe from 'axe-core';
import {
  FieldValidationFeedback,
  ValidatedInputWrapper,
} from '../FormValidationFeedback';

describe('ValidatedInputWrapper error association (#2194)', () => {
  it('links the error message to the input with a matching aria-describedby id', async () => {
    const { container } = render(
      <ValidatedInputWrapper
        label="Email address"
        id="email"
        error="Enter a valid email address"
      >
        <input id="email" type="email" />
      </ValidatedInputWrapper>,
    );

    const input = screen.getByLabelText(/email address/i);
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('aria-describedby', 'email-feedback');

    const feedback = document.getElementById('email-feedback');
    expect(feedback).not.toBeNull();
    expect(feedback).toHaveTextContent('Enter a valid email address');

    const results = await axe.run(container, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
    expect(
      results.violations,
      results.violations.map((v) => v.id).join(', '),
    ).toHaveLength(0);
  });

  it('associates hints too, without marking a valid field invalid', () => {
    render(
      <ValidatedInputWrapper
        label="Username"
        id="username"
        hint="At least 3 characters"
      >
        <input id="username" />
      </ValidatedInputWrapper>,
    );

    const input = screen.getByLabelText(/username/i);
    expect(input).toHaveAttribute('aria-describedby', 'username-feedback');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(document.getElementById('username-feedback')).toHaveTextContent(
      'At least 3 characters',
    );
  });

  it('preserves an existing aria-describedby on the field', () => {
    render(
      <ValidatedInputWrapper label="Password" id="password" error="Too short">
        <input id="password" aria-describedby="password-policy" />
      </ValidatedInputWrapper>,
    );

    expect(screen.getByLabelText(/password/i)).toHaveAttribute(
      'aria-describedby',
      'password-policy password-feedback',
    );
  });

  it('does not reference an id when there is no feedback to render', () => {
    render(
      <ValidatedInputWrapper label="City" id="city">
        <input id="city" />
      </ValidatedInputWrapper>,
    );

    const input = screen.getByLabelText(/city/i);
    expect(input).not.toHaveAttribute('aria-describedby');
    expect(document.getElementById('city-feedback')).toBeNull();
  });

  it('FieldValidationFeedback applies a supplied id to its live region', () => {
    render(<FieldValidationFeedback id="standalone-error" error="Required" />);
    expect(document.getElementById('standalone-error')).toHaveAttribute(
      'role',
      'alert',
    );
  });
});
