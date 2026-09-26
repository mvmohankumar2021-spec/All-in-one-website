import json
import server
from test_catering import CateringTests as BaseTests


class GroceryTests(BaseTests):
    def setUp(self):
        super().setUp()
        self.db.execute('CREATE TABLE grocery_partner_onboarding(account_id INTEGER PRIMARY KEY,details_json TEXT,application_status TEXT,updated_at INTEGER)')
        self.schema = json.loads((server.ROOT / 'grocery-schema.json').read_text())

    def save(self, payload):
        self.handler.read_json = lambda: payload
        self.handler.vendor_catering_onboarding(save=True, grocery=True)
        return self.result

    def valid(self):
        data = {f[0]: ('2' if f[3] == 'number' else 'Test details') for s in self.schema['sections'] for f in s['fields']}
        data.update(services=['Supermarket'], supermarket='Departments', expiry='', submit=True, agreements={p[0]: True for p in self.schema['policies']})
        return data

    def test_draft_round_trip(self):
        self.assertEqual(self.save({'services':['Provision Store'], 'provision':'Daily essentials'})[1], 200)
        self.handler.vendor_catering_onboarding(grocery=True)
        self.assertEqual(self.result[0]['details']['provision'], 'Daily essentials')

    def test_public_schema_route(self):
        self.handler.path = '/grocery-schema.json'
        self.handler.do_GET()
        self.assertEqual(self.result[0]['services'], self.schema['services'])

    def test_empty_submission_rejected(self):
        self.assertEqual(self.save({'services':['Supermarket'], 'submit':True})[1], 400)

    def test_submit_and_account_isolation(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['services']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Service-specific details'
            self.assertEqual(self.save(data)[0]['status'], 'Application Submitted')
        self.handler.require_vendor = lambda: {'id':2}
        self.handler.vendor_catering_onboarding(grocery=True)
        self.assertEqual(self.result[0]['details'], {})

    def test_capacity_and_service_rules(self):
        data = self.valid(); data['radius'] = '-1'
        self.assertEqual(self.save(data)[1], 400)
        data = self.valid(); data['services'] = ['Organic Store']
        self.assertIn('Organic', self.save(data)[0]['error'])
        data = self.valid(); data['expiry'] = '2000-01-01'
        self.assertEqual(self.save(data)[1], 400)

    def test_all_services_together(self):
        data = self.valid(); data['services'] = self.schema['services']
        for field in self.schema['specific'].values():
            data[field[0]] = 'Relevant details'
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        self.assertEqual(self.save(data)[1], 200)
