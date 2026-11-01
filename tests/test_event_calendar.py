import datetime as dt
import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from event_calendar import calendar_dates, today


class CalendarTests(unittest.TestCase):
    def test_date_ranges(self):
        self.assertEqual(calendar_dates({'date': '2027-01-25'}), ('2027-01-25', '2027-01-25'))
        self.assertEqual(calendar_dates({'date': '2027-01-25', 'endDate': '2027-01-27'}), ('2027-01-25', '2027-01-27'))
        self.assertIsNone(calendar_dates({'date': '2011-10'}))
        self.assertIsNone(calendar_dates({'date': None}))
        self.assertEqual(calendar_dates({'date': '2027-01-25', 'time': '19:30', 'endDate': '2027-01-26', 'endTime': '00:00'}), ('2027-01-25', '2027-01-25'))

    def test_invalid_dates_do_not_publish(self):
        for fields in [{'date': '2027-02-30'}, {'date': '2027-01-25', 'endDate': '2027-01-24'},
                       {'date': '2027-01-25', 'time': '25:00'}, {'date': '2027-01-25', 'endTime': '21:00'},
                       {'date': '2027-01-25', 'time': '19:00', 'endTime': '01:00'},
                       {'date': '2027-01-25', 'time': '19:00', 'endDate': '2027-01-26'},
                       {'date': '2027-03-28', 'time': '03:30'}]:
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                calendar_dates(fields)

    def test_greek_dst_repeated_hour_is_valid(self):
        self.assertEqual(calendar_dates({'date': '2027-10-31', 'time': '03:30'}), ('2027-10-31', '2027-10-31'))

    def test_cms_build_uses_one_catalogue_for_today_and_ongoing_meetings(self):
        spec = importlib.util.spec_from_file_location('build_content', ROOT / 'scripts/build-content.py')
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        originals = {p: p.read_bytes() for p in [ROOT / 'ekdiloseis.html', ROOT / 'assets/events-data.js']}
        date = today()
        prior = (dt.date.fromisoformat(date) - dt.timedelta(days=1)).isoformat()
        fixtures = [
            {'id': 'calendar-fixture-today', 'date': date, 'title': 'Συνάντηση σήμερα', 'time': '19:30', 'location': 'Λέσχη', 'description': 'Πληροφορίες'},
            {'id': 'calendar-fixture-ongoing', 'date': prior, 'endDate': date, 'title': 'Πολυήμερη συνάντηση'}]
        paths = []
        try:
            for fixture in fixtures:
                p = ROOT / 'content/events' / (fixture['id'] + '.json')
                self.assertFalse(p.exists()); p.write_text(json.dumps(fixture, ensure_ascii=False)); paths.append(p)
            module.build_events()
            s = (ROOT / 'ekdiloseis.html').read_text()
            upcoming = s.split('<!--cms:upcoming-->')[1].split('<!--/cms:upcoming-->')[0]
            archive = s.split('<!--cms:events-list-->')[1].split('<!--/cms:events-list-->')[0]
            for fixture in fixtures:
                self.assertIn(fixture['title'], upcoming); self.assertNotIn(fixture['title'], archive)
            self.assertIn('19:30', upcoming); self.assertIn('data-calendar-event=', upcoming)
            data = (ROOT / 'assets/events-data.js').read_text()
            self.assertIn('Πληροφορίες', data); self.assertIn('"location": "Λέσχη"', data)
            after = {p: p.read_bytes() for p in originals}
            module.build_events()
            self.assertEqual(after, {p: p.read_bytes() for p in originals})
        finally:
            for p in paths: p.unlink()
            for p, content in originals.items(): p.write_bytes(content)


if __name__ == '__main__':
    unittest.main()
