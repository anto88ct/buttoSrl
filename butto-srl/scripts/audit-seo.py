"""Validate generated HTML and discovery files after npm run build (standard library only)."""
from pathlib import Path
from html.parser import HTMLParser
import json
import xml.etree.ElementTree as ET

ROOT = Path('dist')
SITE = 'https://buttocarmelo.it'
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.canonicals=[]; self.h1=0; self.description=[]; self.robots=''; self.schemas=[]; self.schema=False
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if tag=='h1': self.h1+=1
        if tag=='meta' and a.get('name')=='description': self.description.append(a.get('content',''))
        if tag=='meta' and a.get('name')=='robots': self.robots=a.get('content','')
        if tag=='link' and a.get('rel')=='canonical': self.canonicals.append(a.get('href'))
        if tag=='script' and a.get('type')=='application/ld+json': self.schema=True
    def handle_endtag(self, tag):
        if tag=='script': self.schema=False
    def handle_data(self, data):
        if self.schema: self.schemas.append(json.loads(data))

urls=set(); descriptions=set()
for f in ROOT.rglob('*.html'):
    page=Page(); page.feed(f.read_text())
    assert page.h1==1, (f,'Expected one h1',page.h1)
    assert len(page.description)==1 and page.description[0], (f,'Missing description')
    assert page.description[0] not in descriptions, (f,'Duplicate description')
    descriptions.add(page.description[0])
    route='/' if f.relative_to(ROOT).as_posix()=='index.html' else '/'+f.parent.relative_to(ROOT).as_posix()
    if f.name=='404.html':
        assert 'noindex' in page.robots
        continue
    assert page.canonicals==[SITE+route], (f,page.canonicals,route)
    assert page.schemas, (f,'Missing structured data')
    urls.add(SITE+route)
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
sitemap=set()
for f in ROOT.glob('sitemap-*.xml'):
    sitemap.update(SITE+'/' if n.text == SITE else n.text for n in ET.parse(f).findall('s:url/s:loc',ns))
assert urls==sitemap, ('Sitemap mismatch',urls ^ sitemap)
assert '/api/' not in '\n'.join(sitemap)
assert (ROOT/'llms.txt').read_text().startswith('# Buttò')
assert f'Sitemap: {SITE}/sitemap-index.xml' in (ROOT/'robots.txt').read_text()
print(f'SEO audit passed: {len(urls)} pages; unique descriptions, canonical URLs, one H1, JSON-LD, sitemap and discovery files.')
