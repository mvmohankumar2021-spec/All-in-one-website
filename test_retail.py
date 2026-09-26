import json
import server
from test_catering import CateringTests as BaseTests


class RetailTests(BaseTests):
    def setUp(self):
        super().setUp()
        self.db.execute('CREATE TABLE retail_partner_onboarding(account_id INTEGER PRIMARY KEY,details_json TEXT,application_status TEXT,updated_at INTEGER)')
        self.schema = json.loads((server.ROOT / 'retail-schema.json').read_text())

    def save(self, payload):
        self.handler.read_json = lambda: payload
        self.handler.vendor_catering_onboarding(save=True, retail_store=True)
        return self.result

    def valid(self):
        data = {f[0]: ('2' if f[3] == 'number' else 'Test details') for s in self.schema['sections'] for f in s['fields']}
        data.update(services=['Department Store'], department='Departments', expiry='', submit=True, agreements={p[0]: True for p in self.schema['policies']})
        return data

    def test_draft_round_trip(self):
        self.assertEqual(self.save({'services':['Gift Shop'], 'gift':'Daily essentials'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        self.assertEqual(self.result[0]['details']['gift'], 'Daily essentials')

    def test_public_schema_route(self):
        self.handler.path = '/retail-schema.json'
        self.handler.do_GET()
        self.assertEqual(self.result[0]['services'], self.schema['services'])

    def test_empty_submission_rejected(self):
        self.assertEqual(self.save({'services':['Department Store'], 'submit':True})[1], 400)

    def test_submit_and_account_isolation(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['services']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Service-specific details'
            data['listingRole'] = 'Individual shop'
            self.assertEqual(self.save(data)[0]['status'], 'Application Submitted')
        self.handler.require_vendor = lambda: {'id':2}
        self.handler.vendor_catering_onboarding(retail_store=True)
        self.assertEqual(self.result[0]['details'], {})

    def test_capacity_and_service_rules(self):
        data = self.valid(); data['radius'] = '-1'
        self.assertEqual(self.save(data)[1], 400)
        data = self.valid(); data['services'] = ['Toy Shop']
        self.assertIn('Toy', self.save(data)[0]['error'])
        data = self.valid(); data['expiry'] = '2000-01-01'
        self.assertEqual(self.save(data)[1], 400)

    def test_all_services_together(self):
        data = self.valid(); data['services'] = self.schema['services']
        data['listingRole'] = 'Centre operator'
        for field in self.schema['specific'].values():
            data[field[0]] = 'Relevant details'
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        self.assertEqual(self.save(data)[1], 200)


    def test_centre_operator_without_shop_fields(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        data = self.valid()
        data.update(services=['Shopping Centre'], centre='Directory and authority', listingRole='Centre operator')
        for section in self.schema['sections']:
            if section.get('shopOnly'):
                for field in section['fields']:
                    data.pop(field[0], None)
        data['agreements'].pop('safety')
        data['agreements'].pop('servicePolicy')
        self.assertEqual(self.save(data)[1], 200)
        data['agreements']['operator'] = False
        self.assertEqual(self.save(data)[1], 400)

    def test_individual_shop_without_operator_declaration(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        data = self.valid()
        data.update(services=['Shopping Centre'], centre='Tenant shop', listingRole='Individual shop')
        data['agreements'].pop('operator')
        self.assertEqual(self.save(data)[1], 200)
        data['listingRole'] = ''
        self.assertEqual(self.save(data)[1], 400)
        data['listingRole'] = 'Unknown'
        self.assertEqual(self.save(data)[1], 400)
