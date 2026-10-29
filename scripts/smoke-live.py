#!/usr/bin/env python3
"""Read-only live integration smoke test. Never records personal balances, coupons or credentials."""
import http.cookiejar
import json
import sys
import time
import urllib.request
from pathlib import Path

base = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4318'
jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
session = json.load(opener.open(base + '/api/session'))
if session.get('mode') != 'live':
    sys.exit('Expected a live server; refusing to call this a live test.')

def call(name, args):
    start = time.monotonic()
    body = json.dumps({'args': args}).encode()
    req = urllib.request.Request(base + '/api/tools/' + name, body, {'Content-Type': 'application/json', 'x-session-token': session['csrf']})
    try:
        with opener.open(req, timeout=45) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        # The server already redacts credentials; avoid dumping any raw upstream body.
        message = json.load(error).get('error', 'Request failed')
        raise RuntimeError(f'{name}: {message}') from None
    return result, round((time.monotonic() - start) * 1000)

checks = []
context = {'storeCode': '1450713', 'beType': 1, 'orderType': 1}
for name, args in [
    ('now-time-info', {}),
    ('query-nearby-stores', {'beType': 1, 'city': '上海市', 'keyword': '人民广场', 'searchType': 2}),
    ('query-meals', context),
    ('query-meal-detail', {**context, 'code': '1100'}),
    ('list-nutrition-foods', {}),
    ('calculate-price', {**context, 'items': [{'productCode': '1100', 'quantity': 1}]}),
    ('query-my-account', {}),
    ('query-my-coupons', {'page': '1', 'pageSize': '20'}),
    ('query-lottery-info', {}),
    ('mall-points-products', {'catRuleIds': '1>4'}),
    ('campaign-calendar', {}),
]:
    result, elapsed = call(name, args)
    assert result['meta']['mode'] == 'live'
    data = result.get('result')
    if name == 'query-meals':
        assert isinstance(data.get('meals'), dict) and data['meals']
    if name == 'calculate-price':
        assert isinstance(data.get('price'), int)
    checks.append({'tool': name, 'passed': True, 'durationMs': elapsed, 'traceId': result['meta'].get('traceId')})
    print(f'PASS {name} ({elapsed} ms)', flush=True)
report = {'executedAt': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'transport': 'Application HTTP API → official MCP SDK → https://mcp.mcd.cn', 'mode': 'live', 'readOnly': True, 'privatePayloadsRecorded': False, 'checks': checks}
Path('docs/live-verification.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
