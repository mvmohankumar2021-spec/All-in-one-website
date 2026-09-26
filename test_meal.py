import json
from test_catering import CateringTests


class MealTests(CateringTests):
    def setUp(self):
        super().setUp()
        self.db.execute('CREATE TABLE meal_partner_onboarding(account_id INTEGER PRIMARY KEY,details_json TEXT,application_status TEXT,updated_at INTEGER)')
        self.schema = json.loads((__import__('server').ROOT / 'meal-schema.json').read_text())

    def save(self, payload):
        self.handler.read_json = lambda: payload
        self.handler.vendor_catering_onboarding(save=True, meal=True)
        return self.result

    def valid(self):
        data = {f[0]: ('2' if f[3] == 'number' else 'Test details') for s in self.schema['sections'] for f in s['fields']}
        data.update(services=['Cloud Kitchen'], cloud='Cloud kitchen details', expiry='2099-01-01', submit=True, agreements={p[0]: True for p in self.schema['policies']})
        return data

    def test_draft_round_trip(self):
        self.assertEqual(self.save({'services':['Home Food Service'], 'homeFood':'Home kitchen'})[1], 200)
        self.handler.vendor_catering_onboarding(meal=True)
        self.assertEqual(self.result[0]['details']['homeFood'], 'Home kitchen')
        self.assertEqual(self.result[0]['status'], 'Draft')

    def test_public_schema_route(self):
        self.handler.path = '/meal-schema.json'
        self.handler.do_GET()
        self.assertEqual(self.result[0]['services'], self.schema['services'])

    def test_subscription_terms_required(self):
        payload = self.valid()
        payload.update(services=['Meal Subscription'], subscription='Weekly meals', subscriptionPolicy='')
        self.assertEqual(self.save(payload)[1], 400)

    def test_capacity_and_service_rules(self):
        payload = self.valid()
        payload.update(minGuests='5', maxGuests='2')
        self.assertEqual(self.save(payload)[1], 400)
        payload = self.valid()
        payload.update(services=['Tiffin Service'])
        self.assertIn('Tiffin', self.save(payload)[0]['error'])
