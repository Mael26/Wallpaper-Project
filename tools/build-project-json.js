#!/usr/bin/env node
/*
 * Generates project.json (Wallpaper Engine) from js/schema.js.
 * Usage:  node tools/build-project-json.js
 * Groups → checkbox headers; every setting in a group gets "<group>.value == true && <own condition>".
 * Order values all have 3 digits (100, 101, …): Wallpaper Engine sorts them as text, so "11" would
 * otherwise land after "109" and settings would appear under the wrong group.
 * Panel localization: every label that has a Spanish translation in tools/panel-es.json becomes a
 * "ui_lirica_…" token with en-us / es-es strings (WE shows the user's UI language, English otherwise).
 * Labels that read the same in both languages (font names, "Karaoke"…) stay as plain text.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { SCHEMA } = require('../js/schema.js');

const out = path.join(__dirname, '..', 'project.json');
const ES = JSON.parse(fs.readFileSync(path.join(__dirname, 'panel-es.json'), 'utf8'));
const loc = { 'en-us': {}, 'es-es': {} };
/** English label → token (if it has a different Spanish text) or the label itself. */
function tr(token, en, wrap = (x) => x) {
  const es = ES[en];
  if (!es || es === en) return wrap(en);
  const t = ('ui_lirica_' + token).toLowerCase().replace(/[^a-z0-9_]/g, '_');
  loc['en-us'][t] = wrap(en);
  loc['es-es'][t] = wrap(es);
  return t;
}
const h4 = (x) => `<h4>${x}</h4>`;
const prev = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, 'utf8')) : {};

const properties = {
  schemecolor: { order: 999, text: 'ui_browse_properties_scheme_color', type: 'color', value: '0.55 0.85 1' },
};
SCHEMA.forEach((p, i) => {
  const order = 100 + i;
  if (p.type === 'group') {
    properties[p.key] = { order, text: tr(p.key, p.label, h4), type: 'bool', value: false };
    return;
  }
  const o = { order, text: tr(p.key, p.label), type: p.type, value: p.value };
  if (p.type === 'slider') { o.min = p.min; o.max = p.max; o.step = 1; o.fraction = false; o.editable = true; }
  if (p.type === 'combo') o.options = p.options.map(({ label, value }) => ({ label: tr(`${p.key}_${value}`, label), value }));
  if (p.type === 'file' && p.fileType) o.fileType = p.fileType;
  if (p.type === 'directory') o.mode = p.mode || 'ondemand';
  const conds = [];
  if (p.group) conds.push(`${p.group}.value == true`);
  if (p.condition) conds.push(p.condition);
  if (conds.length) o.condition = conds.join(' && ');
  properties[p.key] = o;
});

const project = {
  contentrating: 'Everyone',
  description: 'Synced lyrics for whatever you are playing (Spotify, YouTube Music, Apple Music…) via Windows media integration + LRCLIB. Fully customizable.',
  file: 'index.html',
  general: { localization: loc, properties },
  preview: 'preview.gif',
  tags: ['Music'],
  title: 'Lírica — synced lyrics',
  type: 'web',
  visibility: 'private',
};
if (prev.workshopid) project.workshopid = prev.workshopid;

fs.writeFileSync(out, JSON.stringify(project, null, 2) + '\n');
console.log(`project.json: ${Object.keys(properties).length} properties, ${Object.keys(loc['es-es']).length} localized strings`);
