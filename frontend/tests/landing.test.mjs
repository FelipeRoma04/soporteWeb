// Runtime validation coverage for: landing content and process storytelling.
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

test('renders the SysPulse landing and all four workflow steps', async () => {
  const vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom'
  });

  try {
    const { default: Landing } = await vite.ssrLoadModule('/src/pages/Landing.jsx');
    const markup = renderToStaticMarkup(React.createElement(Landing, {
      onLogin: () => {},
      onRegister: () => {}
    }));

    assert.match(markup, /Cada solicitud, bajo control/);
    assert.match(markup, /id="como-funciona"/);
    assert.equal((markup.match(/data-story-step=/g) || []).length, 4);
    assert.match(markup, /Registra el problema/);
    assert.match(markup, /Organiza la solicitud/);
    assert.match(markup, /Revisa posibles soluciones/);
    assert.match(markup, /Haz seguimiento/);
    assert.equal((markup.match(/class="landing-feature-card /g) || []).length, 7);
    const benefitsMarkup = markup.match(/class="landing-benefits-copy"[\s\S]*?class="landing-organized-visual"/)?.[0];
    assert.ok(benefitsMarkup);
    assert.equal((benefitsMarkup.match(/<li>/g) || []).length, 6);
    assert.match(markup, /El equipo revisa la sugerencia antes de crear el ticket/);
    assert.match(markup, /Iniciar sesión/);
    assert.match(markup, /Registrarse/);
  } finally {
    await vite.close();
  }
});
