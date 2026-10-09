#!/usr/bin/env python3
"""Local structural and preservation checks. Stdlib only; no server or network."""
from pathlib import Path
from html.parser import HTMLParser
from collections import Counter
import base64
import hashlib
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent

class Inventory(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.links = []
        self.actions = []
        self.fields = []
        self.runtime_assets = []
        self.favicon_links = []
        self.h1 = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get('id'): self.ids.append(attrs['id'])
        if tag == 'h1': self.h1 += 1
        if tag == 'a':
            self.links.append(attrs.get('href', ''))
            if 'data-apply-chapter' in attrs: self.actions.append(attrs)
        if tag == 'textarea': self.fields.append(attrs)
        if tag == 'link' and attrs.get('rel') == 'icon':
            self.favicon_links.append(attrs)
        if tag in ('script', 'img', 'iframe', 'link'):
            pointer = attrs.get('src') or (attrs.get('href') if tag == 'link' else None)
            if pointer and not (tag == 'link' and attrs.get('rel') == 'icon' and pointer.startswith('data:')):
                self.runtime_assets.append(pointer)

raw = (ROOT/'research-field-guide.html').read_bytes()
text = raw.decode('utf-8')
old = (ROOT/'tests/fixtures/pre-apply.html').read_text()
inventory = Inventory(); inventory.feed(text)
assert not [key for key, count in Counter(inventory.ids).items() if count != 1], 'Duplicate IDs'
assert all(link[1:] in inventory.ids for link in inventory.links if link.startswith('#')), 'Broken internal anchor'
assert inventory.h1 == 1 and len(inventory.fields) == 10
hero = re.search(r'<section class="intro" id="overview".*?</section>', text, re.S)[0]
assert 'Scroll to investigate' not in hero, 'Removed hero link reappeared'
assert 'Begin the guide' in hero and 'Open the notebook' in hero, 'Hero actions removed'
assert 'one working notebook' not in hero and 'hero-bottom' not in hero and 'Personal research edition / 02' not in text, 'Removed hero metadata reappeared'
assert len(inventory.actions) == 21 and not inventory.runtime_assets, 'Wrong action count or runtime dependency'
assert len(inventory.favicon_links) == 2, 'Expected embedded primary and dark-theme SVG browser icons'
for icon, filename, media in zip(inventory.favicon_links, ('groundwork-mark.svg', 'groundwork-mark-inverse.svg'), (None, '(prefers-color-scheme: dark)')):
    assert icon.get('type') == 'image/svg+xml' and icon.get('sizes') == 'any' and icon.get('media') == media, 'Browser icon declaration changed'
    assert icon['href'].startswith('data:image/svg+xml;base64,'), 'Browser icon must travel inside the HTML'
    assert base64.b64decode(icon['href'].split(',', 1)[1], validate=True) == (ROOT/'identity/groundwork'/filename).read_bytes(), 'Browser icon differs from pinned Paper SVG'
for action in inventory.actions:
    assert action['id'] == 'apply-' + action['data-apply-chapter']
    assert action['href'].startswith('#field-')
    assert action['href'][1:] in inventory.ids
assert len({action['href'] for action in inventory.actions}) == 10

pattern = r'<section class="chapter" id="([^"]+)" data-title="[^"]+" data-part="[^"]+">(.*?)</section>'
old_chapters = dict(re.findall(pattern, old, re.S))
new_chapters = dict(re.findall(pattern, text, re.S))
assert len(old_chapters) == len(new_chapters) == 21
for chapter_id, body in new_chapters.items():
    assert body.count('class="chapter-apply"') == 1
    stripped = re.sub(r'<div class="chapter-apply">.*?</div>', '', body, flags=re.S)
    assert stripped == old_chapters[chapter_id], 'Learning content changed: ' + chapter_id
for name, pattern in [('glossary', r'<dl class="glossary-list">.*?</dl>'), ('source_records', r'<ol class="sources">.*?</ol>')]:
    assert re.search(pattern, text, re.S)[0] == re.search(pattern, old, re.S)[0], name + ' changed'
assert re.findall(r'<textarea[^>]+name="([^"]+)"', text) == re.findall(r'<textarea[^>]+name="([^"]+)"', old)
assert all((ROOT/name).read_bytes() == raw for name in ('index.html', 'research-notebook.html')), 'Alias mismatch'
for pointer in re.findall(r'url\([\'"]?([^\)\'\"]+)', text):
    assert pointer.startswith('data:'), 'Nonembedded CSS asset: ' + pointer
assert 'connect-src &#39;none&#39;' in text or "connect-src 'none'" in text
manifest = json.loads((ROOT/'assets/manifest.json').read_text())
assert len(manifest) == 2 and {font['family'] for font in manifest} == {'Archivo', 'Commit Mono'}
embedded_fonts = re.findall(r'data:font/woff2;base64,([A-Za-z0-9+/=]+)', text)
assert len(embedded_fonts) == 2
assert {hashlib.sha256(base64.b64decode(font, validate=True)).hexdigest() for font in embedded_fonts} == {font['sha256'] for font in manifest}, 'Embedded font bytes do not match manifest'
notices = json.loads(re.search(r'<script type="application/json" id="font-license-notices">(.*?)</script>', text, re.S)[1])['notice']
assert notices == '\n\n'.join((ROOT/'assets'/name).read_text() for name in ('Archivo-OFL.txt', 'CommitMono-OFL.txt')), 'OFL notices changed or missing'
project_notice = json.loads(re.search(r'<script type="application/json" id="project-license-notices">(.*?)</script>', text, re.S)[1])
assert project_notice['license'] == 'MIT' and project_notice['notice'] == (ROOT/'LICENSE').read_text(), 'MIT notice missing or changed'
assert '--sans:Archivo,sans-serif' in text and "--mono:'Commit Mono',monospace" in text
build = json.loads((ROOT/'build-info.json').read_text())
assert build['typography_status'] == 'approved-free-pair' and build['exact_reference_typography_target'] is False
assert 'reference_fonts_missing' not in build, 'Commercial fonts still treated as pending delivery'
assert text.count('<span class="action-label">') == 31, 'Static underline-label coverage changed'
assert '--micro-rule:.75px' in text and 'background-clip:padding-box' in text
assert ':is(.text-button,.hero-secondary,.apply-link,.context-return,.micro-action,#resume):has(>.action-label){text-decoration:none}' in text, 'Action underline reset must outrank native hover decoration'
assert '.field textarea:focus-visible{outline:0;outline-offset:0}' in text
assert all(rule not in text for rule in ('min-height:610px', '.intro{min-height:570px}', 'min-height:550px')), 'Content-led hero reservation regressed'
assert build['product_name'] == 'Groundwork'
assert '<title>Groundwork — research field guide &amp; notebook</title>' in text
header = re.search(r'<header class="sitebar".*?</header>', text, re.S)[0]
assert 'Field guide + notebook' not in header and 'Groundwork' in header, 'Header descriptor removal regressed'
identity_markup = re.findall(r'<svg[^>]+class="identity-logo"[^>]*>.*?</svg>', text, re.S)
assert len(identity_markup) == 2, 'Identity placement count changed'
for markup, name, size in zip(identity_markup, ('groundwork-mark-inverse.svg', 'groundwork-mark.svg'), ('28', '24')):
    embedded = ET.fromstring(markup)
    source = ET.fromstring((ROOT/'identity/groundwork'/name).read_bytes())
    assert embedded.get('aria-hidden') == 'true' and embedded.get('focusable') == 'false'
    assert embedded.get('viewBox') == source.get('viewBox') and embedded.get('width') == embedded.get('height') == size
    assert [(child.tag, child.attrib) for child in embedded] == [(child.tag, child.attrib) for child in source], 'Embedded mark differs from Paper export'
assert '# Groundwork — research notebook\\n' in text and '# Groundwork — research field kit\\n' in text
result = {
    'scope': 'Stdlib structural checks against the frozen pre-Apply test fixture; no scientific or full accessibility certification',
    'status': 'passed',
    'product_name': 'Groundwork',
    'header_descriptor_removed': True,
    'paper_marks_embedded_exactly': 2,
    'embedded_svg_browser_icons_exactly': 2,
    'dark_theme_icon_declared': True,
    'branded_export_headings_with_stable_filenames': True,
    'unique_ids': len(inventory.ids),
    'internal_anchors_resolve': True,
    'chapter_content_unchanged': 21,
    'glossary_and_source_records_unchanged': True,
    'apply_actions': 21,
    'primary_destinations': 10,
    'h1': inventory.h1,
    'hero_scroll_link_removed': True,
    'other_hero_actions_preserved': True,
    'hero_metadata_removed': True,
    'notebook_fields': len(inventory.fields),
    'aliases_identical': True,
    'approved_fonts': ['Archivo', 'Commit Mono'],
    'static_micro_action_labels': 31,
    'native_micro_scrollbar_and_single_focus_edge_present': True,
    'embedded_font_hashes_match_manifest': True,
    'full_copyright_and_ofl_notices_retained': True,
    'full_mit_notice_embedded': True,
    'exact_reference_typography_target': False,
    'external_runtime_assets': inventory.runtime_assets,
    'handbook_bytes': len(raw),
    'sha256': hashlib.sha256(raw).hexdigest(),
}
(ROOT/'artifact-checks-integration.json').write_text(json.dumps(result, indent=2)+'\n')
print(json.dumps(result, indent=2))
