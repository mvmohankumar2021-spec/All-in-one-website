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
        data = {f[0]: ('2' if f[3] == 'number' else 'No' if f[3] == 'select' else 'Test details') for s in self.schema['sections'] for f in s['fields']}
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

    def test_electronics_conditional_fields(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        data = self.valid()
        data.update(services=['Mobile Store'], mobileStore='Phones and repair support')
        for key in ('radius','areas','delivery','installationDetails','extras','customPolicy','warranty'):
            data.pop(key, None)
        self.assertEqual(self.save(data)[1], 200)
        data['deliveryOffered'] = 'Yes'
        self.assertEqual(self.save(data)[1], 400)
        data.update(radius='10', areas='Service PIN codes', delivery='Charges and damage reporting')
        self.assertEqual(self.save(data)[1], 200)
        data['installationOffered'] = 'Yes'
        self.assertEqual(self.save(data)[1], 400)
        data['installationDetails'] = 'Manufacturer appointment, charges disclosed'
        self.assertEqual(self.save(data)[1], 200)
        data['deliveryOffered'] = 'invalid'
        self.assertEqual(self.save(data)[1], 400)

    def test_electronics_inactive_details_not_saved(self):
        data = self.valid()
        data.update(services=['Mobile Store'], mobileStore='Phones', computerStore='Unselected', submit=False)
        self.assertEqual(self.save(data)[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertNotIn('computerStore', details)
        self.assertNotIn('installationDetails', details)

    def test_home_store_conditions_and_draft(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        data = self.valid()
        data.update(services=['Furniture Store'], furnitureStore='Wood furniture')
        for key in ('customDetails','largeDelivery','installationDetails','radius','areas','delivery'):
            data.pop(key, None)
        self.assertEqual(self.save(data)[1], 200)
        data['customOffered'] = 'Yes'
        self.assertEqual(self.save(data)[1], 400)
        data['customDetails'] = 'Measured, approved quotation and lead time'
        self.assertEqual(self.save(data)[1], 200)
        data.update(deliveryOffered='Yes', radius='20', areas='Local PIN codes', delivery='Delivery charges')
        self.assertIn('Large-item', self.save(data)[0]['error'])
        data['largeDelivery'] = 'Lift access, floor charges and damage reporting'
        self.assertEqual(self.save(data)[1], 200)
        data['customOffered'] = 'Unknown'
        self.assertEqual(self.save(data)[1], 400)
        self.assertEqual(self.save({'services':['Mattress Store'], 'mattressStore':'Trials distinct from warranty'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        self.assertEqual(self.result[0]['details']['mattressStore'], 'Trials distinct from warranty')
        self.assertNotIn('furnitureStore', self.result[0]['details'])

    def test_clothing_tailoring_and_bridal_rental(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        data = self.valid()
        data.update(services=['Bridal Wear'], bridalWear='Appointments and fittings')
        for key in ('tailoringDetails','bridalRentalTerms','installationOffered','installationDetails','warrantyDetails','filePrivacy'):
            data.pop(key, None)
        self.assertEqual(self.save(data)[1], 200)
        data['tailoringOffered'] = 'Yes'
        self.assertIn('Tailoring', self.save(data)[0]['error'])
        data['tailoringDetails'] = 'Design approval, fittings and charges'
        self.assertEqual(self.save(data)[1], 200)
        data['bridalRentalOffered'] = 'Yes'
        self.assertIn('Bridal rental', self.save(data)[0]['error'])
        data['bridalRentalTerms'] = 'Deposit, duration, cleaning and return terms'
        self.assertEqual(self.save(data)[1], 200)
        data['bridalRentalOffered'] = 'Unknown'
        self.assertEqual(self.save(data)[1], 400)

    def test_clothing_filters_unselected_data_and_round_trip(self):
        data = self.valid()
        data.update(services=['Mens Clothing'], mensClothing='Formal and casual', bridalRentalOffered='Yes', bridalRentalTerms='Stale hidden value')
        data['submit'] = False
        self.assertEqual(self.save(data)[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['mensClothing'], 'Formal and casual')
        for key in ('bridalRentalOffered','bridalRentalTerms','installationOffered','tailoringDetails','filePrivacy'):
            self.assertNotIn(key, details)

    def test_mixed_clothing_and_hardware_keeps_applicable_fields(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        data = self.valid()
        data.update(services=['Mens Clothing','Lighting Store'], mensClothing='Clothes', lightingStore='Lighting')
        data.pop('installationOffered')
        self.assertEqual(self.save(data)[1], 400)
        data['installationOffered'] = 'No'
        self.assertEqual(self.save(data)[1], 200)

    def test_studio_conditional_visits_and_collection(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        data = self.valid()
        data.update(services=['Tailoring'], tailoringService='Stitching and alterations')
        for section in self.schema['sections']:
            if section.get('shopOnly'):
                for field in section['fields']:
                    data.pop(field[0], None)
        for key in ('collectionDetails','studioVisitDetails'):
            data.pop(key, None)
        data['agreements'] = {p[0]: True for p in self.schema['policies'] if len(p) < 4}
        self.assertEqual(self.save(data)[1], 200)
        data['collectionOffered'] = 'Yes'
        self.assertEqual(self.save(data)[1], 400)
        data['collectionDetails'] = 'Area, charges, garment receipts'
        self.assertEqual(self.save(data)[1], 200)
        data['studioVisitOffered'] = 'Yes'
        self.assertEqual(self.save(data)[1], 400)
        data['studioVisitDetails'] = 'Areas, appointment and visit fees'
        self.assertEqual(self.save(data)[1], 200)
        data['studioVisitOffered'] = 'Unknown'
        self.assertEqual(self.save(data)[1], 400)

    def test_studio_draft_and_irrelevant_fields(self):
        data = {'services':['Embroidery Service'], 'embroideryService':'Hand and machine work', 'collectionOffered':'No', 'studioVisitOffered':'No', 'collectionDetails':'Hidden stale value', 'tailoringService':'Unselected'}
        self.assertEqual(self.save(data)[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['embroideryService'], 'Hand and machine work')
        for key in ('collectionDetails','tailoringService','warranty','installationOffered'):
            self.assertNotIn(key, details)
