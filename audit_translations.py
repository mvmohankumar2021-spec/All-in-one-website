"""Inventory application-owned static copy without reading uploads or account data."""
import json
import re
import ast
from pathlib import Path
from html.parser import HTMLParser
from html import unescape

ROOT = Path(__file__).resolve().parent

class CopyParser(HTMLParser):
    def __init__(self, add):
        super().__init__(convert_charrefs=True)
        self.add = add
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.skip += 1
        if not self.skip:
            for name, value in attrs:
                if name in ('placeholder', 'aria-label', 'title', 'alt', 'data-help') and value:
                    self.add(value)

    def handle_endtag(self, tag):
        if tag in ('script', 'style') and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.add(data)

def inventory():
    strings = {}
    def add(source, filename):
        source = re.sub(r'\s+', ' ', unescape(source)).strip()
        if re.search(r'[A-Za-z]{2}', source) and not re.fullmatch(r'[\w.+-]+@[\w.-]+', source):
            strings.setdefault(source, set()).add(filename)
    for path in sorted(ROOT.glob('*.html')):
        CopyParser(lambda text: add(text, path.name)).feed(path.read_text(encoding='utf-8-sig'))
    for path in sorted(ROOT.glob('*-schema.json')):
        schema = json.loads(path.read_text(encoding='utf-8-sig'))
        for service in schema.get('services', []):
            add(service, path.name)
        fields = []
        for section in schema.get('sections', []):
            add(section['title'], path.name)
            fields.extend(section['fields'])
        fields.extend(schema.get('specific', {}).values())
        fields.extend(schema.get('waterFields', {}).values())
        for field in fields:
            add(field[1], path.name)
            add(field[4], path.name)
        for policy in schema.get('policies', []):
            add(policy[1], path.name)
    # Legacy modules embed markup instead of using the newer schemas.
    # Inventory literal labels/hints only; expressions and identifiers are not copy.
    for path in sorted(ROOT.glob('*.js')):
        if path.name.startswith(('languages', 'localization')):
            continue
        source = path.read_text(encoding='utf-8-sig')
        for match in re.finditer(r'<(?:label|h[1-6]|p|small|strong|b|button|option)\b[^>]*>([^<${}]+)', source):
            text = match.group(1).strip()
            if not any(token in text for token in ('`', '=>', '.map(', '.join(')):
                add(text, path.name)
        for match in re.finditer(r'(?:placeholder|aria-label|title|data-help)="([^"${}]+)"', source):
            add(match.group(1), path.name)
        # Older forms keep tooltip copy in literal maps rather than markup.
        # Only inspect known copy maps, never arbitrary data or identifiers.
        for mapping in re.finditer(r'const\s+(?:helpText|fieldHelpText)\s*=\s*\{([\s\S]*?)\}\s*;', source):
            for value in re.finditer(r"[\w'\"]+\s*:\s*('(?:\\.|[^'\\])*'|\"(?:\\.|[^\"\\])*\")", mapping.group(1)):
                try:
                    add(ast.literal_eval(value.group(1)), path.name)
                except (ValueError, SyntaxError):
                    pass
        for match in re.finditer(r"(?:const services\s*=\s*)(\[[^;]+\])", source):
            try:
                for service in ast.literal_eval(match.group(1)):
                    if isinstance(service, str):
                        add(service, path.name)
            except (ValueError, SyntaxError):
                pass
        for match in re.finditer(r"['\"](I (?:accept|consent|make)[^'\"\n]+)['\"]", source):
            add(match.group(1), path.name)
        for match in re.finditer(r"\.textContent\s*=\s*'([^'\n]+)'", source):
            text = match.group(1)
            # Style elements are also populated through textContent.
            if not re.search(r'\{[^}]*[\w-]+\s*:[^}]*\}', text):
                add(text, path.name)
    # Literal server responses are shown in UI alerts. Do not read account data.
    tree = ast.parse((ROOT / 'server.py').read_text(encoding='utf-8-sig'))
    for node in ast.walk(tree):
        if isinstance(node, ast.Dict):
            for key, value in zip(node.keys, node.values):
                if isinstance(key, ast.Constant) and key.value in ('error', 'message') and isinstance(value, ast.Constant) and isinstance(value.value, str):
                    add(value.value, 'server.py')
    # Audit the same policy text that the server renders; never inspect uploads.
    from server import LEGAL_DOCUMENTS, docx_preview_html
    for route, path in LEGAL_DOCUMENTS.items():
        if path.exists():
            CopyParser(lambda text: add(text, route)).feed(docx_preview_html(path))
    return {key: sorted(value) for key, value in sorted(strings.items())}

if __name__ == '__main__':
    print(json.dumps(inventory(), ensure_ascii=False, indent=2))
