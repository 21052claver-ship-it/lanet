"""Rebuild the public catalogue from official, pinned Gencat PDFs (no personal data).
Run with the bundled Python runtime; requires pdfplumber. --download refreshes source bytes.
Every row and weight retains its source page; unexpected cells fail the import.
"""
import argparse, hashlib, json, re, urllib.request
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
SOURCES = {
    'cutoffs-2026-latest': ('https://universitats.gencat.cat/web/.content/02_preinscripcio/enllac-documents/notes-de-tall/Notes-tall-6a-assignacio_juny_2026.pdf', '2026-10-07'),
    'cutoffs-2026-first': ('https://universitats.gencat.cat/web/.content/02_preinscripcio/enllac-documents/notes-de-tall/Notes-tall-1a-assignacio_juny_2026.pdf', '2026-07-10'),
    'weights-2027': ('https://universitats.gencat.cat/web/.content/02_preinscripcio/enllac-documents/Ponderacions-2027_v2.pdf', '2026-05-28'),
    'weights-2026': ('https://universitats.gencat.cat/web/.content/02_preinscripcio/enllac-documents/Ponderacions-2026_v7.pdf', '2026-05-28'),
}
# Order checked against the rotated column headings, not extracted text order.
SUBJECTS = [
    ('analysis', 'Anàlisi Musical'), ('performing', 'Arts Escèniques'), ('biology', 'Biologia'),
    ('general-science', 'Ciències Generals'), ('choir', 'Cor i Tècnica Vocal'),
    ('art-drawing', 'Dibuix Artístic'), ('technical-drawing', 'Dibuix Tècnic'),
    ('design-drawing', 'Dibuix Tècnic Aplicat a les Arts Plàstiques i al Disseny'),
    ('design', 'Disseny'), ('physics', 'Física'), ('art-foundations', 'Fonaments Artístics'),
    ('business', 'Funcionament de l’Empresa i Disseny de Models de Negoci'), ('geography', 'Geografia'),
    ('geology', 'Geologia i Ciències Ambientals'), ('music-history', 'Història de la Música i de la Dansa'),
    ('art-history', 'Història de l’Art'), ('spanish-literature', 'Literatura Castellana'),
    ('catalan-literature', 'Literatura Catalana'), ('drama', 'Literatura Dramàtica'),
    ('greek', 'Llengua i Cultura Gregues'), ('latin', 'Llengua i Cultura Llatines'),
    ('math', 'Matemàtiques'), ('social-math', 'Matemàtiques Aplicades a les Ciències Socials'),
    ('cultural-movements', 'Moviments Culturals i Artístics'), ('chemistry', 'Química'),
    ('graphic-expression', 'Tècniques d’Expressió Graficoplàstica'), ('technology', 'Tecnologia i Enginyeria'),
]
def clean(value):
    return re.sub(r'\s+', ' ', value or '').strip()

def load(name, download):
    path = ROOT / 'output/pau/sources' / (name + '.pdf')
    path.parent.mkdir(parents=True, exist_ok=True)
    if download or not path.exists():
        with urllib.request.urlopen(SOURCES[name][0], timeout=90) as response:
            data = response.read(20_000_001)
        assert data.startswith(b'%PDF-') and len(data) <= 20_000_000
        path.write_bytes(data)
    return path

def main():
    args = argparse.ArgumentParser()
    args.add_argument('--download', action='store_true')
    download = args.parse_args().download
    catalogue, sources, audits, normalized = {}, {}, {}, []
    for name, (url, date) in SOURCES.items():
        path = load(name, download)
        count, codes, duplicates, text_codes = 0, set(), [], set()
        with pdfplumber.open(path) as pdf:
            sources[name] = dict(url=url, date=date, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), pages=len(pdf.pages))
            for page_no, page in enumerate(pdf.pages, 1):
                text_codes.update(re.findall(r'(?m)^([1-9]\d{4})\b', page.extract_text() or ''))
                tables = page.extract_tables()
                assert len(tables) == 1, (name, page_no, 'Unexpected table count')
                rows = tables[0]
                for row in rows:
                    code = clean(row[0])
                    if not re.fullmatch(r'\d{5}', code):
                        assert not re.match(r'^\d{5}', code), (name, page_no, row)
                        continue
                    count += 1
                    record = catalogue.setdefault(code, dict(code=code, weights={}, weightPages={}))
                    label, university = clean(row[1]), clean(row[2])
                    if name.startswith('weights'):
                        assert len(row) == 30, (name, page_no, code, len(row))
                        values = [clean(v).replace("'", ',') for v in row[3:]]
                        for subject, original, value in zip(SUBJECTS, row[3:], values):
                            if clean(original) != value:
                                normalized.append(dict(source=name, page=page_no, code=code, subject=subject[0], original=original, normalized=value))
                        assert all(v in ('', '0,1', '0,2') for v in values), (name, code, values)
                        weights = {s[0]: float(v.replace(',', '.')) for s, v in zip(SUBJECTS, values) if v}
                        year = name[-4:]
                        if year in record['weights']:
                            if record['weights'][year] != weights:
                                record.setdefault('weightConflicts', {}).setdefault(year, []).append(dict(page=page_no, weights=weights, name=label))
                            duplicates.append(code)
                        else:
                            record['weights'][year] = weights
                            record['weightPages'][year] = page_no
                        record.setdefault('name', label)
                        record.setdefault('university', university)
                    else:
                        assert code not in codes, ('Duplicate cutoff', code)
                        assert len(row) == 7 and re.fullmatch(r'\d{1,2},\d{3}', clean(row[3])), (name, code, row)
                        cutoff = float(clean(row[3]).replace(',', '.'))
                        assert 5 <= cutoff <= 14
                        field = 'cutoff' if name.endswith('latest') else 'firstCutoff'
                        record[field] = cutoff
                        record[field+'Page'] = page_no
                        if name.endswith('latest') or 'name' not in record:
                            record['name'], record['university'] = label, university
                    codes.add(code)
        assert codes == text_codes, (name, 'Text/table code mismatch', sorted(codes ^ text_codes))
        audits[name] = dict(rows=count, uniqueCodes=len(codes), duplicateAliases=duplicates, allTextCodesMatched=True)
    for r in catalogue.values():
        assert r['name'] and r['university']
        for year in r.get('weightConflicts', {}):
            r['weightConflicts'][year].insert(0, dict(page=r['weightPages'][year], weights=r['weights'][year]))
            del r['weights'][year]
        # Strip location/teaching qualifiers for the career selector. Double degrees remain separate.
        r['career'] = clean(re.sub(r'\([^)]*\)|"[^"]*"', '', r['name']))
        r['campus'] = re.findall(r'\(([^()]*)\)', r['name'])[-1] if ('cutoff' in r or 'firstCutoff' in r) and '(' in r['name'] else ''
    degrees = sorted(catalogue.values(), key=lambda r: (r['name'].casefold(), r['university'], r['code']))
    data = dict(schema=1, checkedAt='2026-10-11', cutoffYear=2026, cutoffDate='2026-10-07', cutoffRound='6a assignació · juny',
                firstCutoffDate='2026-07-10', weightYears=[2026, 2027], defaultYear=2027,
                subjects=[dict(id=s[0], label=s[1]) for s in SUBJECTS], sources=sources, degrees=degrees)
    audit = dict(sources=audits, totalDegrees=len(degrees), cutoffDegrees=sum('cutoff' in r for r in degrees),
                 missingWeights={str(y):[r['code'] for r in degrees if 'cutoff' in r and str(y) not in r['weights']] for y in [2026,2027]},
                 noCutoff=[r['code'] for r in degrees if 'cutoff' not in r],
                 ambiguousWeights={r['code']: r['weightConflicts'] for r in degrees if r.get('weightConflicts')},
                 normalizedNumericCells=normalized,
                 sourceNote='El PDF oficial de ponderacions 2027 té la capçalera 2027 i el peu 2028. Es fa servir el document enllaçat com a 2027 per Canal Universitats. No es modifica ni s’infereix cap coeficient.')
    assert audit['cutoffDegrees'] >= 450 and len(degrees) >= 450, 'Incomplete source import'
    (ROOT/'public/data').mkdir(exist_ok=True)
    (ROOT/'public/data/pau.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
    (ROOT/'output/pau/data-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(audit,ensure_ascii=True,indent=2))

if __name__ == '__main__':
    main()
