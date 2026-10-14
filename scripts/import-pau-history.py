"""Build five-year cutoff history from pinned official public sources. No personal data.
Existing PAU catalogue is read, never rewritten. Empty source cells remain null.
"""
import argparse
import hashlib
import json
import re
import urllib.request
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
URL = 'https://universitats.gencat.cat/web/.content/02_preinscripcio/enllac-documents/notes-de-tall/Notes-de-tall-via-PAU-CFGS_2021_2025.pdf'
YEARS = [2022, 2023, 2024, 2025, 2026]

def clean(value):
    return re.sub(r'\s+', ' ', value or '').strip()

def mark(value):
    value = clean(value)
    if not value:
        return None
    assert re.fullmatch(r'\d{1,2},\d{3}', value), ('Unexpected numeric cell', value)
    result = int(value.replace(',', ''))
    assert 5000 <= result <= 14000, result
    return result / 1000

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--download', action='store_true')
    args = parser.parse_args()
    fixture = ROOT / 'tests/fixtures/pau/sources/history-2021-2025.pdf'
    private = ROOT / 'output/pau-history/sources/history-2021-2025.pdf'
    private.parent.mkdir(parents=True, exist_ok=True)
    if args.download or not (fixture.exists() or private.exists()):
        with urllib.request.urlopen(URL, timeout=60) as response:
            data = response.read(20_000_001)
        assert data.startswith(b'%PDF-') and len(data) <= 20_000_000
        private.write_bytes(data)
    path = private if args.download or not fixture.exists() else fixture
    records, text_codes = {}, set()
    with pdfplumber.open(path) as pdf:
        for page_number, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ''
            assert 'Anys 2021 fins a 2025' in text
            text_codes.update(re.findall(r'(?m)^([1-9]\d{4})\b', text))
            tables = page.extract_tables()
            assert len(tables) == 1, (page_number, 'Unexpected table count')
            for row in tables[0]:
                code = clean(row[0])
                if not re.fullmatch(r'\d{5}', code):
                    continue
                assert len(row) == 14 and code not in records, (page_number, code, row)
                # Four identity columns, then five pairs (2021..2025). Discard 2021.
                all_marks = [mark(value) for value in row[4:]]
                records[code] = dict(name=clean(row[1]), university=clean(row[3]), town=clean(row[2]),
                    first=all_marks[2::2]+[None], latest=all_marks[3::2]+[None], pages=[page_number, None, None])
        pages = len(pdf.pages)
    assert set(records) == text_codes, ('Text/table code mismatch', sorted(set(records)^text_codes))
    assert len(records) >= 500
    catalogue = json.loads((ROOT/'public/data/pau.json').read_text(encoding='utf8'))
    assert catalogue['cutoffYear'] == 2026
    current_codes = set()
    for degree in catalogue['degrees']:
        code = degree['code']
        assert code not in current_codes
        current_codes.add(code)
        record = records.setdefault(code, dict(name=degree['name'], university=degree['university'],
            town=degree.get('campus', ''), first=[None]*5, latest=[None]*5, pages=[None,None,None]))
        for kind, field, page_field, position in [('first','firstCutoff','firstCutoffPage',1),('latest','cutoff','cutoffPage',2)]:
            value = degree.get(field)
            assert value is None or 5 <= value <= 14
            record[kind][-1] = value
            record['pages'][position] = degree.get(page_field)
    sources = {'history-2021-2025':dict(url=URL, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), pages=pages,
        years=[2021,2022,2023,2024,2025], session='juny', route='PAU/CFGS', rounds=['first','final'])}
    for key in ['cutoffs-2026-first','cutoffs-2026-latest']:
        metadata = catalogue['sources'][key]
        pinned = ROOT/'tests/fixtures/pau/sources'/f'{key}.pdf'
        assert hashlib.sha256(pinned.read_bytes()).hexdigest() == metadata['sha256']
        sources[key] = metadata
    result = dict(schema=1, checkedAt='2026-10-14', years=YEARS, session='juny', route='PAU/CFGS',
        latestYearProvisional=True, latestYearRound=catalogue['cutoffRound'], latestYearDate=catalogue['cutoffDate'],
        sources=sources, degrees=dict(sorted(records.items())))
    audit = dict(sourceRows=len(text_codes), allTextCodesMatched=True, totalCodes=len(records), currentCodes=len(current_codes),
        matchedCurrentHistoricalCodes=sum(records[c]['pages'][0] is not None for c in current_codes),
        newCurrentCodes=sorted(c for c in current_codes if records[c]['pages'][0] is None),
        historicalOnlyCodes=sorted(set(records)-current_codes),
        coverage={str(y):{kind:sum(r[kind][i] is not None for r in records.values()) for kind in ['first','latest']} for i,y in enumerate(YEARS)},
        sources=sources, matching='Exact official code only; no fuzzy names or inferred missing values.')
    (ROOT/'public/data/pau-history.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf8')
    (ROOT/'output/pau-history/data-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(audit,ensure_ascii=True,indent=2))

if __name__ == '__main__':
    main()
