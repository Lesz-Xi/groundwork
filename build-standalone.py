#!/usr/bin/env python3
"""Build one unified offline guide + notebook from local authored sources. No network."""
from pathlib import Path
from html import escape, unescape
import argparse
import base64
import hashlib
import json
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--pilot', action='store_true', help='Build only the Prior art handoff into .qa/pilot.html; leave shipped entries untouched.')
PILOT = parser.parse_args().pilot
FONT_MANIFEST = json.loads((ROOT/'assets/manifest.json').read_text())
SOURCES = json.loads((ROOT/'sources.json').read_text())
CSS = (ROOT/'styles.css').read_text()
JS = (ROOT/'app.js').read_text()
assert len(FONT_MANIFEST) == 2 and {font['family'] for font in FONT_MANIFEST} == {'Archivo', 'Commit Mono'}, 'The approved final pairing is Archivo + Commit Mono'
for font in FONT_MANIFEST:
    raw=(ROOT/'assets'/font['file']).read_bytes()
    assert hashlib.sha256(raw).hexdigest()==font['sha256']
    CSS=CSS.replace('assets/'+font['file'],'data:font/woff2;base64,'+base64.b64encode(raw).decode())
assert 'fonts.gstatic.com' not in CSS and "url('assets/" not in CSS
LICENSES='\n\n'.join((ROOT/'assets'/name).read_text() for name in ('Archivo-OFL.txt','CommitMono-OFL.txt'))
PROJECT_LICENSE = (ROOT/'LICENSE').read_text()
CONTRACT='''<!-- THESIS: An inspectable path from question to warranted claim, not a dashboard of learning scores.
OWN-WORLD: Forgis cool grey #dde0e0, blue-black #122128, orange #ff9030; grotesque headings, mono annotations, thin-rule navigation. Chief-approved final free pairing: Archivo for headings, prose and controls; Commit Mono for annotations, code and note fields. Exact reference-font reproduction is not a delivery target.
STORY: Read the guide, inspect its sources, write into the same document, export an honest research record.
FIRST VIEWPORT: Dark sans-serif opening, orange actions, left navigation, right reading path. Grey three-column reading body; orange notebook handoff.
FORM: User-pinned Forgis reference supersedes concept seed 183d3ae4. One file, native document scroll, no trail line; 300ms source-ease link feedback.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
-->'''
ARROW='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6"/></svg>'

# Native Paper exports are the identity source. Pin bytes before inlining them;
# never require a sibling SVG, font, network request or raster at runtime.
IDENTITY_ROOT = ROOT/'identity/groundwork'
IDENTITY = json.loads((IDENTITY_ROOT/'provenance.json').read_text())
SVG_NS = '{http://www.w3.org/2000/svg}'
ET.register_namespace('', SVG_NS[1:-1])
MARKS = {}
assert {mark['file'] for mark in IDENTITY['marks']} == {'groundwork-mark.svg', 'groundwork-mark-inverse.svg', 'groundwork-mark-mono.svg'}
for mark in IDENTITY['marks']:
    raw = (IDENTITY_ROOT/mark['file']).read_bytes()
    assert hashlib.sha256(raw).hexdigest() == mark['sha256'], 'Paper mark hash mismatch: '+mark['file']
    node = ET.fromstring(raw)
    assert node.tag == SVG_NS+'svg' and node.get('viewBox') == '0 0 96 96'
    assert set(node.attrib) <= {'width', 'height', 'viewBox', 'style'}
    assert len(node) == 2 and all(path.tag == SVG_NS+'path' for path in node)
    assert all(set(path.attrib) <= {'d', 'fill', 'stroke', 'stroke-width', 'stroke-linecap'} for path in node)
    assert all(path.get('fill') == 'none' and path.get('stroke-width') == '8' for path in node)
    assert all(not len(path) and not (path.text or '').strip() and path.get('stroke', '').lower() in {'#122128', '#dde0e0', '#ff9030'} for path in node)
    MARKS[mark['file']] = raw

def inline_mark(filename, size):
    node = ET.fromstring(MARKS[filename])
    node.set('width', str(size)); node.set('height', str(size))
    node.set('style', f'width:{size}px;height:{size}px;flex-shrink:0;display:block')
    node.set('class', 'identity-logo'); node.set('aria-hidden', 'true'); node.set('focusable', 'false')
    return ET.tostring(node, encoding='unicode')

def document(title, body):
    return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="An extensive, source-linked research learning guide with intuition, technical nuance and practical templates."><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; script-src \'unsafe-inline\'; font-src data:; img-src data:; connect-src \'none\'; base-uri \'none\'; form-action \'none\'"><title>'+escape(title)+'</title><style>'+CSS+'</style></head><body>'+CONTRACT+'\n'+body+'<script>'+JS+'</script><script type="application/json" id="font-license-notices">'+json.dumps({'notice':LICENSES},ensure_ascii=False).replace('<','\\u003c')+'</script><script type="application/json" id="project-license-notices">'+json.dumps({'license':'MIT','notice':PROJECT_LICENSE},ensure_ascii=False).replace('<','\\u003c')+'</script></body></html>'

fields=[
('question','The question','What do you want to find out? State the answer type, object, context and why it matters.','Main question:\nAnswer type:\nWhy this matters:'),
('scope','Scope & stopping rule','Define important inclusions, exclusions, source channels, time window and what will count as enough for this phase.','Included:\nExcluded:\nSearch/review type:\nStopping rationale:\nKnown access limits:'),
('prior','Closest prior work','Compare the strongest relevant predecessors. A gap is not yet proof of novelty or usefulness.','Source/version:\nShared problem and mechanism:\nOur precise difference:\nEvidence for that difference:\nUnresolved neighbors:'),
('method','Method & assumptions','Explain why this method can answer the question. Distinguish plans from procedures already performed.','Design:\nUnit of analysis:\nSample/context:\nComparison:\nMeasures/materials:\nAssumptions:\nWhat this cannot establish:'),
('search','Search log','Record exact platform/query/date/filter/coverage. Enter counts only if observed.','Date and platform:\nExact query:\nFilters and scope:\nObserved returned/exported counts:\nChanges and reasons:\nAccess failures:'),
('source','Source-reading note','Keep the source’s claim separate from your interpretation. Record how much you actually read.','Identity/version:\nInspected pages/sections:\nExact consequential claim:\nEvidence/argument:\nAssumptions/limits:\nMy interpretation:\nCounter-position:'),
('claims','Claim & support ledger','For each consequential statement, name support, current status and unresolved obligations.','Claim ID and exact wording:\nStatus: proposed / reported / observed / conditional / scoped check\nSource IDs/locations:\nNecessary support:\nChecks actually performed:\nFailures/stale evidence:\nNext obligation:'),
('ethics','Ethics, rights & data','Check permissions, participant protections, privacy, ownership, retention and tool boundaries before collecting or sharing.','People/data at risk:\nConsent/review requirements:\nAccess and sharing permission:\nRetention/deletion policy:\nExternal-tool restrictions:\nAuthorship/contributions:'),
('synthesis','Synthesis & alternatives','Explain the relationship among sources instead of only listing their summaries.','Where evidence converges:\nWhere it conflicts and why:\nImportant dependence/bias:\nAlternative explanations:\nWhat would change my view:\nWhat remains unknown:'),
('handoff','Resume & communicate','Leave an honest next action and a bounded manuscript claim.','Completed artifacts/versions:\nStrongest warranted conclusion:\nChecks not run:\nCurrent blockers:\nNext concrete action:\nWho must review what:')]
chapter_fields = {
    'research':'question', 'questions':'question',
    'scope':'scope', 'reviews':'scope', 'selection':'scope',
    'prior-art':'prior', 'assumptions':'method', 'methods':'method',
    'measurement':'method', 'causality':'method', 'statistics':'method', 'qualitative':'method',
    'search':'search', 'reading':'source', 'synthesis':'synthesis',
    'formal':'claims', 'architecture':'claims', 'reproducibility':'claims',
    'ethics':'ethics', 'writing':'handoff', 'long-arc':'handoff',
}
# Notebook is in-page. The separate original remains in legacy-before-forgis/.
notebook_uri='#notebook'

content=(ROOT/'chapters-1.html').read_text()+'\n'+(ROOT/'chapters-2.html').read_text()
content=content.replace('<div class="table-wrap">','<div class="table-wrap" tabindex="0" role="region" aria-label="Comparison table; scroll horizontally on narrow screens">')
chapters=re.findall(r'<section class="chapter" id="([^"]+)" data-title="([^"]+)" data-part="([^"]+)">',content)
assert len(chapters)==21 and len({c[0] for c in chapters})==len(chapters)
valid_sources={s['id'] for s in SOURCES}
def cite(match):
    sid=match.group(1);assert sid in valid_sources,sid
    return f'<a class="cite" href="#source-{sid}" aria-label="Source {sid}">[{sid}]</a>'
content=re.sub(r'\[(S\d+)\]',cite,content)
for i,(cid,title,part) in enumerate(chapters,1):
    marker=f'<section class="chapter" id="{cid}" data-title="{title}" data-part="{part}">'
    content=content.replace(marker,marker+f'<span class="chapter-index">Chapter {i:02d} / {escape(part)}</span>')
nav='';mobile='';prior=None
for i,(cid,title,part) in enumerate(chapters,1):
    if part!=prior:nav+=f'<p class="nav-group">{escape(part)}</p>';prior=part
    nav+=f'<a href="#{cid}"><span>{i:02d}</span><span>{escape(title)}</span></a>'
    mobile+=f'<a href="#{cid}">{i:02d} · {escape(title)}</a>'

gloss=[]
for line in (ROOT/'glossary.txt').read_text().splitlines():
    if not line.strip():continue
    term,definition,chapter=line.split('|')
    assert chapter in {c[0] for c in chapters}
    slug=re.sub(r'[^a-z0-9]+','-',term.lower()).strip('-')
    gloss.append((term,definition,chapter,slug))
assert len({g[3] for g in gloss})==len(gloss)
glossary='<section class="chapter" id="glossary" data-title="Glossary"><h2>A vocabulary for careful thinking.</h2><p class="intuition">'+str(len(gloss))+' terms to revisit. Use these as entry points, not definitions detached from their methods. The chapter links restore context.</p><dl class="glossary-list">'
for term,definition,chapter,slug in gloss:
    glossary+=f'<div class="glossary-entry" id="term-{slug}"><dt><dfn>{escape(term)}</dfn></dt><dd>{escape(definition)}<br><a href="#{chapter}">Read in context</a></dd></div>'
glossary+='</dl></section>'
# Count the unchanged learning text before inserting interface controls.
words=len(re.findall(r'\b[\w’]+\b',re.sub(r'<[^>]+>',' ',content+glossary)))
assert set(chapter_fields) == {c[0] for c in chapters}, 'Every chapter must have exactly one destination'
field_labels={fid:label for fid,label,_,_ in fields}
assert set(chapter_fields.values()) == set(field_labels), 'Mappings must cover the existing ten fields'
applications=[{'chapterId':cid,'title':unescape(title),'number':i,'fieldId':chapter_fields[cid]}
              for i,(cid,title,_) in enumerate(chapters,1) if not PILOT or cid == 'prior-art']
for item in applications:
    cid=item['chapterId'];fid=item['fieldId']
    action=f'<div class="chapter-apply"><a class="apply-link" id="apply-{cid}" href="#field-{fid}" data-apply-chapter="{cid}">Apply this chapter {ARROW}</a><span>In the notebook: {escape(field_labels[fid])}</span></div>'
    pattern=r'(<section class="chapter" id="'+re.escape(cid)+r'"[^>]*>)(.*?)(</section>)'
    content,count=re.subn(pattern,lambda m:m[1]+m[2]+action+m[3],content,flags=re.S)
    assert count == 1, cid
form=''
for fid,label,helptext,placeholder in fields:
    related=[item for item in applications if item['fieldId']==fid]
    returns=''
    if related:
        returns='<details class="no-js-returns"><summary>Related chapters — return to reading</summary><nav aria-label="Related chapters for '+escape(label)+'">'
        for item in related:
            returns+=f'<a href="#apply-{item["chapterId"]}">{item["number"]:02d} / {escape(item["title"])}</a>'
        returns+='</nav><p>These are related guide links, not attached evidence. Context attachment and export require JavaScript.</p></details>'
    form+=f'<div class="field" id="field-{fid}" tabindex="-1" role="group" aria-labelledby="label-{fid}"><label id="label-{fid}" for="note-{fid}">{escape(label)}</label><p id="help-{fid}">{escape(helptext)}</p><div class="guide-context js-only" id="context-{fid}" hidden></div><textarea id="note-{fid}" name="{fid}" aria-describedby="help-{fid}" placeholder="{escape(placeholder)}"></textarea><div class="print-value" id="note-{fid}-print" aria-hidden="true"></div>{returns}</div>'
application_json=json.dumps(applications,ensure_ascii=False).replace('<','\\u003c')
application_config='<script type="application/json" id="guide-application-map">'+application_json+'</script>'
kit='<section class="chapter field-kit" id="field-kit" data-title="Field kit"><h2>A field kit, not more paperwork.</h2><p class="intuition">Use the smallest record that preserves the question, the support and the next obligation. These are blank scaffolds—not completed research.</p><div class="intro-actions"><a class="primary" href="'+notebook_uri+'" >Open the working notebook '+ARROW+'</a><button type="button" class="text-button js-only" id="download-kit">Download these templates (.md)</button></div>'
for _,label,helptext,placeholder in fields:
    kit+=f'<details><summary>{escape(label)}</summary><p>{escape(helptext)}</p><pre>{escape(placeholder)}</pre></details>'
kit+='<p class="takeaway"><strong>Before calling a phase complete:</strong> can another person recover the exact question, source/material version, inference, checks performed, excluded stronger claim and next unresolved obligation?</p></section>'
sources='<section class="chapter" id="sources" data-title="Sources"><h2>Sources, scope, and where to go deeper.</h2><div class="source-note"><p>This handbook is an original educational synthesis built with focused Firecrawl searches and selected primary-page reads. It is not an exhaustive literature review. General explanations, glossary definitions and synthetic examples are authored teaching material; linked sources support specific distinctions, not every sentence or a universal method.</p><p>Source checks: 8 October 2026. Some responses were cached. Coverage below distinguishes full page text, selected passages, metadata and partial PDF reading. Automated extraction was not treated as infallible: overbroad PRISMA, FAIR-access and experiment-only causal phrasing was rejected or checked against the underlying text/specialist source.</p><p>The original learning text is retained. This edition uses Chief’s selected Forgis capture for visual direction; the capture’s tokens, section screenshots and hover evidence were inspected locally. Origin scripts, foundry media, logos and commercial claims are excluded. The original edition’s public editorial guidance from <a href="https://tubikstudio.com/blog/media-editorial-website-design/" target="_blank" rel="noopener noreferrer">Tubik</a> was text-only; no Details MCP retrieval is claimed.</p></div><ol class="sources">'
for source in SOURCES:
    assert source['url'].startswith('https://')
    sources+=f'<li id="source-{source["id"]}"><span class="source-id">{source["id"]} / {escape(source["publisher"])}</span><h3><a href="{escape(source["url"])}" target="_blank" rel="noopener noreferrer">{escape(source["title"])}</a></h3><p>{escape(source["use"])}</p><p class="coverage">Reading scope: {escape(source["coverage"])}</p></li>'
sources+='</ol><p class="endnote">The aim is not to sound certain.<br>It is to know what your answer can bear.</p><footer class="page-footer"><span>Research field guide · educational edition 01</span><a class="micro-action" href="#top">Return to the beginning</a></footer><p class="coverage" style="font-size:14px;color:var(--muted)">Archivo and Commit Mono are the deliberately selected final free font pairing, embedded under the SIL Open Font License 1.1; full copyright and license notices are included in this file’s source. This is a Forgis-informed design, not an exact-font reproduction. No trackers or external runtime dependencies. Source links require internet access.</p></section>'
# Replace the inherited atlas shell, preserving every chapter/glossary/source record.
header=f'''<a class="skip" href="#main">Skip to reading</a><header class="sitebar" id="top"><a class="brand identity-brand" href="#top">{inline_mark("groundwork-mark-inverse.svg", 28)}Groundwork</a><nav class="toplinks" aria-label="Reference navigation"><a href="#main">The guide</a><a href="#notebook">Notebook</a><a href="#sources">Sources</a><button class="text-button print-button js-only" type="button" data-print>Print all</button></nav></header>'''
intro=f'''<section class="intro" id="overview" aria-labelledby="guide-title"><h1 id="guide-title">Research,<br>made intelligible.</h1><p class="lede">From a good question to a claim you can defend. An extensive guide to the methods, words and judgments that make inquiry rigorous.</p><div class="intro-actions"><a class="primary" href="#research">Begin the guide {ARROW}</a><a class="hero-secondary" href="#notebook">Open the notebook {ARROW}</a></div></section>'''
route=[('research','Frame the inquiry','Question & scope'),('reviews','Find the evidence','Search & close reading'),('methods','Design & reason','Method & inference'),('synthesis','Build the claim','Support & alternatives'),('ethics','Communicate','Ethics & continuity'),('notebook','Keep a record','Your working notebook')]
path='<aside class="reading-path" aria-labelledby="path-title"><h2 id="path-title">The reading path</h2><nav aria-label="Reading path">'
for n,(anchor,title,desc) in enumerate(route,1):
    path+=f'<a href="#{anchor}"><span class="path-index">{n:02d}</span><span>{escape(title)}<small>{escape(desc)}</small></span></a>'
path+='<a class="path-source" href="#sources">Inspect the sources '+ARROW+'</a></nav><p>Location, not completion.<br>Read in any order.</p></aside>'
notebook_section=f'''<section class="chapter notebook" id="notebook" data-title="Working notebook" aria-labelledby="notebook-title"><div class="notebook-heading"><h2 id="notebook-title">Make the inquiry<br>inspectable.</h2><p class="intuition">A small set of records for a substantial piece of research. Fill only what your question needs.</p><a class="micro-action" href="#field-kit">Refer to the field kit {ARROW}</a></div><p class="notebook-privacy">Nothing is uploaded or automatically saved. Export before closing, and keep sensitive personal or confidential material out of an unsecured browser page. Empty fields are open obligations, not completed work.</p><noscript><p>JavaScript is disabled. You can type and select your notes, but exports need JavaScript. Keep a separate saved copy.</p></noscript><p class="guide-context-explanation">Use Apply at the end of a chapter to connect it to a field. Guide context is instructional—not research evidence. Notes and context are exported only when you request it; relative guide links resolve when this HTML accompanies the Markdown.</p><form id="research-notebook">{form}<div class="notebook-actions js-only"><button type="button" class="primary" id="export-notebook">Export notes as Markdown {ARROW}</button><button type="button" class="text-button" id="print-notebook">Print notes only</button><button type="button" class="text-button" id="confirm-export">I have saved my copy</button></div><p id="notebook-status" class="notebook-status" role="status" aria-live="polite">No autosave. Your notes stay only in this open page until you export them.</p></form></section>'''
mobile_links=mobile+'<a href="#glossary">Glossary</a><a href="#field-kit">Field kit</a><a href="#notebook">Working notebook</a><a href="#sources">Sources</a>'
mobile_nav='<details class="mobile-contents"><summary>Contents / 21 chapters + notebook</summary><nav aria-label="Mobile chapter navigation">'+mobile_links+'</nav></details>'
search_ui='''<div class="search-wrap js-only" style="flex-direction:column"><label for="concept-search" class="search-label">Find a concept</label><input id="concept-search" type="search" placeholder="e.g. prior art" autocomplete="off" aria-controls="search-results"><div class="search-results" id="search-results" hidden></div><span id="search-status" class="sr-only" role="status" aria-live="polite"></span></div>'''
rail='<aside class="toc" aria-label="Navigation and search"><a class="rail-home identity-rail" href="#top">'+inline_mark('groundwork-mark.svg', 24)+'Groundwork / Index</a><div class="rail-links"><a href="#main">The guide</a><a href="#notebook">Working notebook '+ARROW+'</a></div>'+search_ui+'<nav aria-label="Chapter navigation">'+nav+'</nav><div class="toc-footer"><a href="#glossary">Glossary</a><a href="#field-kit">Field kit</a><a href="#sources">Sources</a></div></aside>'
tools='''<div class="reader-tools js-only"><label><input type="checkbox" id="essentials">Intuition only</label><button type="button" class="text-button" id="bookmark">Save my place</button><a id="resume" href="#top" hidden>Go to saved place</a><p class="status" id="reader-status" role="status" aria-live="polite">No account or tracking. Bookmarks stay on this browser; they do not measure learning.</p></div>'''
orientation='<div class="orientation"><p>Start with the plain-language layer. Stay for the technical distinctions. Return for the field kit.</p><p>This is a broad foundation, not a promise to cover every discipline or replace specialist statistical, ethical or methodological advice.</p><a class="micro-action" href="#prior-art">Start with prior art '+ARROW+'</a></div>'
body=header+intro+mobile_nav+'<div class="book-layout">'+rail+'<main id="main" tabindex="-1">'+orientation+tools+'<noscript><p>All learning content and the notebook are visible without JavaScript. Use the contents or your browser’s Find function.</p></noscript>'+content+glossary+kit+notebook_section+sources+'</main>'+path+'</div>'+application_config
# Wrap only action labels, keeping native anchors/buttons and their exact text.
# Inline source/glossary prose links retain native micro underlines.
def wrap_action_label(match):
    tag, attrs, label = match.groups()
    classes = re.search(r'class="([^"]*)"', attrs)
    names = set(classes[1].split()) if classes else set()
    if not names.intersection({'text-button', 'hero-secondary', 'apply-link', 'micro-action'}) and 'id="resume"' not in attrs:
        return match[0]
    trimmed = label.rstrip()
    return f'<{tag}{attrs}><span class="action-label">{trimmed}</span>{label[len(trimmed):]}'
body = re.sub(r'<(a|button)(\s[^>]*?)>([^<]+)', wrap_action_label, body)
html=document('Groundwork — research field guide & notebook',body)
# The pilot never overwrites delivered entries; full builds keep aliases identical.
outputs = ('.qa/pilot.html',) if PILOT else ('research-field-guide.html','index.html','research-notebook.html')
for filename in outputs:
    target=ROOT/filename;target.parent.mkdir(parents=True,exist_ok=True);target.write_text(html)
info=ROOT/('.qa/pilot-build-info.json' if PILOT else 'build-info.json')
info.write_text(json.dumps({'product_name':'Groundwork','identity_source':'Paper SVG exports, embedded inline','chapters':len(chapters),'glossary_terms':len(gloss),'learning_words':words,'sources':len(SOURCES),'notebook_fields':len(fields),'apply_actions':len(applications),'handbook_bytes':len(html.encode()),'unified_notebook':True,'offline_runtime':True,'source_links_external':True,'reference':'www.forgis.com--2026-10-06-0127','embedded_fonts':['Archivo','Commit Mono'],'typography_status':'approved-free-pair','exact_reference_typography_target':False,'reference_fonts_not_used':['At Hauss','PP Fraktion Mono'],'pilot':PILOT},indent=2)+'\n')
print(info.read_text())
