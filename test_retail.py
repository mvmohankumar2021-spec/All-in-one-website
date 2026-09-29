import json
import server
from test_catering import CateringTests as BaseTests


class RetailTests(BaseTests):
    def setUp(self):
        super().setUp()
        self.db.execute('CREATE TABLE retail_partner_onboarding(account_id INTEGER PRIMARY KEY,details_json TEXT,application_status TEXT,updated_at INTEGER)')
        self.db.execute('CREATE TABLE vendor_profiles(account_id INTEGER PRIMARY KEY,approval_status TEXT,service_type TEXT)')
        self.schema = json.loads((server.ROOT / 'retail-schema.json').read_text())

    def save(self, payload):
        self.handler.read_json = lambda: payload
        self.handler.vendor_catering_onboarding(save=True, retail_store=True)
        return self.result

    def valid(self):
        data = {f[0]: ('2' if f[3] == 'number' else 'No' if f[3] == 'select' else 'Test details') for s in self.schema['sections'] for f in s['fields']}
        data.update(services=['Department Store'], department='Departments', expiry='', submit=True, agreements={p[0]: True for p in self.schema['policies']})
        data['healthDeclaration'] = 'Yes'
        return data

    def test_draft_round_trip(self):
        self.assertEqual(self.save({'services':['Gift Shop'], 'gift':'Daily essentials'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        self.assertEqual(self.result[0]['details']['gift'], 'Daily essentials')

    def test_device_services_and_options(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['deviceServices']:
            data = self.valid(); data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Device service details'
            if 'Sales' not in service: data['deviceSalesTerms'] = ''
            if 'Repair' not in service: data['deviceRepairTerms'] = ''
            self.assertEqual(self.save(data)[1], 200)
            for key in ['devicePickup','deviceOnsite','deviceRemote','devicePartner','deviceBulk']:
                data[key] = 'Yes'; data[key+'Details'] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[key+'Details'] = 'Service terms'
                self.assertEqual(self.save(data)[1], 200)

    def test_freelance_options(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['freelanceServices']:
            data = self.valid(); data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Provider details'
            self.assertEqual(self.save(data)[1], 200)
            for key in ['freeOnsite','freeTeam','freeRights','freeData','freeRegulated']:
                data[key] = 'Yes'; data[key+'Details'] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[key+'Details'] = 'Offering terms and safeguards'
                self.assertEqual(self.save(data)[1], 200)

    def test_job_category_onboarding(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['jobServices']:
            data = self.valid(); data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Job category details'
            self.assertEqual(self.save(data)[1], 200)
            data['jobPay'] = ''
            self.assertEqual(self.save(data)[1], 400)
        data = self.valid(); data['services'] = ['IT Jobs','Part-Time Jobs','Work From Home Jobs']
        for service in data['services']:
            data[self.schema['specific'][service][0]] = 'Relevant details'
        self.assertEqual(self.save(data)[1], 200)

    def test_recruitment_options(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['recruitmentServices']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Recruitment details'
            self.assertEqual(self.save(data)[1], 200)
            for key in ['recruitOverseas','recruitChecks','recruitPayroll','recruitBulk']:
                data[key] = 'Yes'; data[key+'Details'] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[key+'Details'] = 'Offering terms and safeguards'
                self.assertEqual(self.save(data)[1], 200)

    def test_online_learning_options(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['onlineLearningServices']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Online learning details'
            for key in ['eduTransport','eduMeals','eduHostel','eduOnline','eduExtended']:
                data[key] = ''
            self.assertEqual(self.save(data)[1], 200)
            for key in ['digitalSubscription','digitalThirdParty']:
                data[key] = 'Yes'; data[key+'Details'] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[key+'Details'] = 'Offering terms and responsibilities'
                self.assertEqual(self.save(data)[1], 200)

    def test_practical_training_options(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['practicalTrainingServices']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Training details'
            self.assertEqual(self.save(data)[1], 200)
            for key in ['practicalHome','practicalRental','practicalEvents','practicalPlacement']:
                data[key] = 'Yes'; data[key+'Details'] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[key+'Details'] = 'Offering terms and safeguards'
                self.assertEqual(self.save(data)[1], 200)

    def test_language_training_options(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['languageServices']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Language course details'
            self.assertEqual(self.save(data)[1], 200)
            for key in ['languageHome','languageExam','languageCorporate']:
                data[key] = 'Yes'; data[key+'Details'] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[key+'Details'] = 'Offering terms'
                self.assertEqual(self.save(data)[1], 200)

    def test_it_training_options(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['itTrainingServices']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Training details'
            self.assertEqual(self.save(data)[1], 200)
            for key in ['itCorporate','itCertification','itPlacement']:
                data[key] = 'Yes'; data[key+'Details'] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[key+'Details'] = 'Offering terms and evidence'
                self.assertEqual(self.save(data)[1], 200)

    def test_coaching_options(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['coachingServices']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Course details'
            self.assertEqual(self.save(data)[1], 200)
            for key in ['coachHome','coachTests']:
                data[key] = 'Yes'; data[key+'Details'] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[key+'Details'] = 'Service terms'
                self.assertEqual(self.save(data)[1], 200)

    def test_education_facility_validation(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['educationServices']:
            if service in self.schema['onlineLearningServices']:
                continue  # Online-only facility exclusions are tested separately.
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Institution details'
            self.assertEqual(self.save(data)[1], 200)
            for key in ['eduTransport','eduMeals','eduHostel','eduOnline','eduExtended']:
                data[key] = 'Yes'; data[key+'Details'] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[key+'Details'] = 'Facility terms and safeguards'
                self.assertEqual(self.save(data)[1], 200)

    def test_wellness_conditional_fields_and_scope(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['wellnessServices']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Service scope'
            self.assertEqual(self.save(data)[1], 200)
            for choice, detail in [('wellHomeOffered','wellHomeDetails'),('wellOnlineOffered','wellOnlineDetails'),('wellRetreatOffered','wellRetreatDetails')]:
                data[choice] = 'Yes'; data[detail] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[detail] = 'Coverage, terms and safeguards'
                self.assertEqual(self.save(data)[1], 200)
            data['wellClinical'] = 'Yes'
            self.assertEqual(self.save(data)[1], 400)
            data['submit'] = False
            self.assertEqual(self.save(data)[1], 200)

    def test_salon_home_service_validation(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['salonServices']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Selected salon service details'
            data['salonHomeDetails'] = ''
            self.assertEqual(self.save(data)[1], 200)
            data['salonHomeOffered'] = 'Yes'
            self.assertEqual(self.save(data)[1], 400)
            data['salonHomeDetails'] = 'Coverage, charges, equipment and cleanup'
            self.assertEqual(self.save(data)[1], 200)
            data['salonSafety'] = ''
            self.assertEqual(self.save(data)[1], 400)

    def test_medical_supply_rental_requirements(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        data = self.valid()
        data.update(services=['Medical Equipment'], medicalEquipment='Equipment details', equipmentRentalOffered='Yes', equipmentRentalTerms='')
        self.assertEqual(self.save(data)[1], 400)
        data['equipmentRentalTerms'] = 'Deposit and maintenance terms'
        self.assertEqual(self.save(data)[1], 200)
        data.update(services=['Pharmacy'], pharmacy='Pharmacist and prescription controls', equipmentRentalTerms='')
        self.assertEqual(self.save(data)[1], 200)
        data['medicalSupplySafety'] = ''
        self.assertEqual(self.save(data)[1], 400)

    def test_care_services_and_nonclinical_elder_scope(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['careServices']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Service details'
            self.assertEqual(self.save(data)[1], 200)
            data['careSafeguards'] = ''
            self.assertEqual(self.save(data)[1], 400)
        data = self.valid()
        data.update(services=['Elder Care'], elderCare='Non-clinical daily support', clinicians='')
        for key in ['emergencyOffered', 'teleOffered', 'healthVisitOffered', 'healthFacilities', 'healthAppointments', 'healthFees']:
            data[key] = ''
        self.assertEqual(self.save(data)[1], 200)
        data['services'].append('Home Nursing')
        data['homeNursing'] = 'Nursing visits'
        self.assertEqual(self.save(data)[1], 400)

    def test_diagnostic_collection_validation(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['diagnosticServices']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Service details'
            data['sampleCollectionDetails'] = ''
            self.assertEqual(self.save(data)[1], 200)
            data['sampleCollectionOffered'] = 'Yes'
            self.assertEqual(self.save(data)[1], 400)
            data['sampleCollectionDetails'] = 'Areas, charges and safe collection arrangements'
            self.assertEqual(self.save(data)[1], 200)
            data['diagnosticQuality'] = ''
            self.assertEqual(self.save(data)[1], 400)

    def test_vision_and_hearing_requirements(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in ['Eye Hospital', 'Optical Store', 'Eye Checkup', 'ENT Clinic', 'Hearing Aid Centre']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Service information'
            self.assertEqual(self.save(data)[1], 200)
            if service == 'Optical Store':
                self.assertNotIn('clinicians', self.result[0].get('details', {}))
                data['healthDeclaration'] = 'No'
                self.assertEqual(self.save(data)[1], 200)
            else:
                data['healthDeclaration'] = 'No'
                self.assertEqual(self.save(data)[1], 400)
                data['healthDeclaration'] = 'Yes'
            if service in ['Optical Store', 'Hearing Aid Centre']:
                data['visionDeliveryOffered'] = 'Yes'
                data['visionDelivery'] = ''
                self.assertEqual(self.save(data)[1], 400)
                data['visionDelivery'] = 'Local delivery, fees and times'
                self.assertEqual(self.save(data)[1], 200)

    def test_dental_safety_and_selected_service_validation(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['dentalServices']:
            self.assertIn(service, self.schema['healthServices'])
            data = self.valid()
            data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Provider service information'
            data['dentalSafety'] = ''
            self.assertEqual(self.save(data)[1], 400)
            data['dentalSafety'] = 'Sterilisation, consent and aftercare arrangements'
            self.assertEqual(self.save(data)[1], 200)
            data[key] = ''
            self.assertEqual(self.save(data)[1], 400)

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

    def test_accessory_delivery_and_warranty(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        data = self.valid()
        data.update(services=['Watches'], watchStore='Analogue and digital watches')
        for key in ('installationOffered','installationDetails','radius','areas','delivery'):
            data.pop(key, None)
        self.assertEqual(self.save(data)[1], 200)
        data['deliveryOffered'] = 'Yes'
        self.assertEqual(self.save(data)[1], 400)
        data.update(radius='10', areas='PIN codes', delivery='Charges and timelines')
        self.assertEqual(self.save(data)[1], 200)
        data.pop('warrantyDetails')
        self.assertEqual(self.save(data)[1], 400)

    def test_accessory_draft_excludes_unselected_and_installation(self):
        self.assertEqual(self.save({'services':['Footwear'], 'footwearStore':'Sizes and fitting', 'watchStore':'Unselected', 'installationOffered':'Yes'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['footwearStore'], 'Sizes and fitting')
        self.assertNotIn('watchStore', details)
        self.assertNotIn('installationOffered', details)

    def test_healthcare_conditions_and_consent(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        data = self.valid()
        data.update(services=['General Physician'], physician='Scope and referrals')
        for key in ('emergencyDetails','teleDetails','healthVisitDetails','expiry','registration','evidence'):
            data.pop(key, None)
        self.assertEqual(self.save(data)[1], 200)
        for choice, detail in [('emergencyOffered','emergencyDetails'),('teleOffered','teleDetails'),('healthVisitOffered','healthVisitDetails')]:
            data[choice] = 'Yes'
            self.assertEqual(self.save(data)[1], 400)
            data[detail] = 'Verified scope, hours, fees and arrangements'
            self.assertEqual(self.save(data)[1], 200)
        data['healthDeclaration'] = 'No'
        self.assertEqual(self.save(data)[1], 400)

    def test_healthcare_review_gate_and_invalidation(self):
        import hashlib
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        self.db.execute("INSERT INTO vendor_profiles VALUES (1,'Approved','General Physician')")
        data = self.valid(); data.update(services=['General Physician'], physician='Scope')
        self.assertEqual(self.save(data)[1], 200)
        self.assertEqual(self.db.execute('SELECT approval_status FROM vendor_profiles').fetchone()[0], 'Submitted')
        self.assertFalse(self.handler.verify_healthcare_review(self.db, 1, 'General Physician', {}, 9))
        raw = self.db.execute('SELECT details_json FROM retail_partner_onboarding').fetchone()[0]
        token = hashlib.sha256(raw.encode()).hexdigest()
        self.assertFalse(self.handler.verify_healthcare_review(self.db, 1, 'General Physician', {'healthcareCredentialsVerified':True, 'healthcareReviewToken':'stale'}, 9))
        self.assertTrue(self.handler.verify_healthcare_review(self.db, 1, 'General Physician', {'healthcareCredentialsVerified':True, 'healthcareReviewToken':token}, 9))
        self.assertEqual(json.loads(self.db.execute('SELECT details_json FROM retail_partner_onboarding').fetchone()[0])['healthcareReview']['reviewedBy'], 9)
        self.assertEqual(self.save({'services':['General Physician'], 'physician':'Changed credentials'})[1], 200)
        self.assertFalse(self.handler.verify_healthcare_review(self.db, 1, 'General Physician', {'healthcareCredentialsVerified':True, 'healthcareReviewToken':token}, 9))

    def test_computer_equipment_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in ('Computer Accessories', 'Networking Equipment', 'Printers & Peripherals'):
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Product range and compatibility'
            self.assertEqual(self.save(data)[1], 200)
            data[key] = ''
            self.assertEqual(self.save(data)[1], 400)
            data[key] = 'Product range and compatibility'
            data['installationOffered'] = 'Yes'; data['installationDetails'] = ''
            self.assertEqual(self.save(data)[1], 400)
            data['installationDetails'] = 'Setup scope and charges'
            self.assertEqual(self.save(data)[1], 200)

    def test_vehicle_parts_and_accessories(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in ('Car Spare Parts', 'Bike Spare Parts', 'Car Accessories', 'Bike Accessories'):
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Range and compatibility'
            self.assertEqual(self.save(data)[1], 200)
            data[key] = ''
            self.assertEqual(self.save(data)[1], 400)
            data[key] = 'Range and compatibility'
            data['installationOffered'] = 'Yes'; data['installationDetails'] = ''
            self.assertEqual(self.save(data)[1], 400)
            data['installationDetails'] = 'Approved fitting and charges'
            self.assertEqual(self.save(data)[1], 200)

    def test_hotel_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['hotelServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Hotel scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'hotelRooms', 'hotelBooking', 'hotelSafety'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_rental_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['rentalServices']:
            data = self.valid(); data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Rental scope'
            self.assertEqual(self.save(data)[1], 200)
            data['rentalTerms'] = ''
            self.assertEqual(self.save(data)[1], 400)

    def test_travel_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['travelServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Travel scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'travelProfile', 'travelTerms', 'travelSupport'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_travel_draft_scope(self):
        self.assertEqual(self.save({'services':['Flight Booking'], 'flightBooking':'Routes', 'trainBooking':'Unselected', 'roadTerms':'Irrelevant'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['flightBooking'], 'Routes')
        self.assertNotIn('trainBooking', details)
        self.assertNotIn('roadTerms', details)

    def test_road_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['roadServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Service scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'roadProfile', 'roadTerms', 'roadSafety'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_road_draft_scope(self):
        self.assertEqual(self.save({'services':['Driving School'], 'drivingSchool':'Lessons', 'towingService':'Unselected', 'workshopScope':'Irrelevant'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['drivingSchool'], 'Lessons')
        self.assertNotIn('towingService', details)
        self.assertNotIn('workshopScope', details)

    def test_vehicle_repairs(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['vehicleRepairServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Workshop scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'workshopScope', 'workshopEstimate', 'workshopHandover'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_vehicle_dealers(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['vehicleDealerServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Dealer scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'vehicleSalesTerms', 'warrantyDetails'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value
        self.assertEqual(self.schema['services'].count('Notary'), 1)

    def test_legal_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['legalServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Practice scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'legalCredentials', 'legalEngagement', 'legalPrivacy'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_legal_draft_scope(self):
        self.assertEqual(self.save({'services':['Civil Lawyer'], 'civilLawyer':'Practice details', 'familyLawyer':'Unselected', 'investmentFees':'Irrelevant'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['civilLawyer'], 'Practice details')
        self.assertNotIn('familyLawyer', details)
        self.assertNotIn('investmentFees', details)

    def test_investment_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['investmentServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Provider scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'investmentAuthority', 'investmentProcess', 'investmentFees', 'investmentSafety'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_investment_draft_scope(self):
        self.assertEqual(self.save({'services':['Financial Planner'], 'financialPlanner':'Planning', 'stockBroker':'Unselected', 'insuranceAuthority':'Irrelevant'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['financialPlanner'], 'Planning')
        self.assertNotIn('stockBroker', details)
        self.assertNotIn('insuranceAuthority', details)

    def test_insurance_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['insuranceServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Provider scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'insuranceAuthority', 'insuranceDisclosure', 'insuranceSupport', 'insurancePrivacy'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_insurance_draft_scope(self):
        self.assertEqual(self.save({'services':['Health Insurance'], 'healthInsurance':'Cover guidance', 'lifeInsurance':'Unselected', 'loanTerms':'Irrelevant'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['healthInsurance'], 'Cover guidance')
        self.assertNotIn('lifeInsurance', details)
        self.assertNotIn('loanTerms', details)

    def test_loan_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['loanServices']:
            data = self.valid(); data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Provider product scope'
            self.assertEqual(self.save(data)[1], 200)
            data['loanTerms'] = ''
            self.assertEqual(self.save(data)[1], 400)

    def test_banking_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['bankingServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Provider scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'bankAuthority', 'bankLocation', 'bankCharges', 'bankSafety'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_banking_draft_scope(self):
        self.assertEqual(self.save({'services':['ATM'], 'atmService':'Public location', 'bankService':'Unselected', 'officeTerms':'Irrelevant'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['atmService'], 'Public location')
        self.assertNotIn('bankService', details)
        self.assertNotIn('officeTerms', details)

    def test_office_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['officeServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Office service scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'officeFacilities', 'officeTerms', 'officeAccess'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_office_draft_scope(self):
        self.assertEqual(self.save({'services':['Virtual Office'], 'virtualOffice':'Mail forwarding', 'coworkingSpace':'Unselected', 'consultingExpertise':'Irrelevant'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['virtualOffice'], 'Mail forwarding')
        self.assertNotIn('coworkingSpace', details)
        self.assertNotIn('consultingExpertise', details)

    def test_consulting_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['consultingServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Consulting scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'consultingExpertise', 'consultingDelivery', 'consultingTerms', 'consultingEthics'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_consulting_draft_scope(self):
        self.assertEqual(self.save({'services':['HR Consultant'], 'hrConsultant':'Policies', 'strategyConsultant':'Unselected', 'registrationScope':'Irrelevant'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['hrConsultant'], 'Policies')
        self.assertNotIn('strategyConsultant', details)
        self.assertNotIn('registrationScope', details)

    def test_registration_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['registrationServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Registration scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'registrationScope', 'registrationProcess', 'registrationFees', 'registrationHandover'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_registration_draft_scope(self):
        self.assertEqual(self.save({'services':['MSME Registration'], 'msmeRegistration':'Application assistance', 'companyRegistration':'Unselected', 'accountingProfile':'Irrelevant'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['msmeRegistration'], 'Application assistance')
        self.assertNotIn('companyRegistration', details)
        self.assertNotIn('accountingProfile', details)

    def test_accounting_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['accountingServices']:
            data = self.valid(); data['services'] = [service]
            key = self.schema['specific'][service][0]
            data[key] = 'Professional scope'
            self.assertEqual(self.save(data)[1], 200)
            for required in (key, 'accountingProfile', 'accountingEngagement', 'accountingPrivacy'):
                value = data[required]; data[required] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[required] = value

    def test_accounting_draft_scope(self):
        self.assertEqual(self.save({'services':['Bookkeeping'], 'bookkeeping':'Reconciliation', 'auditing':'Unselected', 'securityScope':'Irrelevant'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['bookkeeping'], 'Reconciliation')
        self.assertNotIn('auditing', details)
        self.assertNotIn('securityScope', details)

    def test_security_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['securityServices']:
            data = self.valid(); data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Authorised service scope'
            self.assertEqual(self.save(data)[1], 200)
            data['securityAuthorisation'] = ''
            self.assertEqual(self.save(data)[1], 400)
            data['securityAuthorisation'] = 'Written authorisation and data safeguards'
            data['securityMaintenance'] = 'Yes'; data['securityMaintenanceDetails'] = ''
            self.assertEqual(self.save(data)[1], 400)
            data['securityMaintenanceDetails'] = 'Hours, scope and renewal terms'
            self.assertEqual(self.save(data)[1], 200)

    def test_security_draft_scope(self):
        self.assertEqual(self.save({'services':['CCTV Installation'], 'cctvInstallation':'Cameras', 'cybersecurity':'Unselected', 'securityMaintenance':'No', 'securityMaintenanceDetails':'Stale'})[1], 200)
        self.handler.vendor_catering_onboarding(retail_store=True)
        details = self.result[0]['details']
        self.assertEqual(details['cctvInstallation'], 'Cameras')
        self.assertNotIn('cybersecurity', details)
        self.assertNotIn('securityMaintenanceDetails', details)

    def test_it_support_services(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['itSupportServices']:
            data = self.valid(); data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Support scope'
            self.assertEqual(self.save(data)[1], 200)
            data['itSla'] = ''
            self.assertEqual(self.save(data)[1], 400)
            data['itSla'] = 'Hours and response targets'
            data['itBackup'] = 'Yes'; data['itBackupDetails'] = ''
            self.assertEqual(self.save(data)[1], 400)
            data['itBackupDetails'] = 'Retention and tested recovery'
            self.assertEqual(self.save(data)[1], 200)

    def test_software_options(self):
        self.db.execute('INSERT INTO vendor_certificates VALUES (1)')
        for service in self.schema['softwareServices']:
            data = self.valid()
            data['services'] = [service]
            data[self.schema['specific'][service][0]] = 'Development scope'
            self.assertEqual(self.save(data)[1], 200)
            for key in ('softwareHosting','softwareIntegration','softwareMigration','softwareSupport','softwarePublishing','softwareCompliance'):
                data[key] = 'Yes'
                data[key+'Details'] = ''
                self.assertEqual(self.save(data)[1], 400)
                data[key+'Details'] = 'Scope, responsibilities and delivery terms'
                self.assertEqual(self.save(data)[1], 200)

    def test_healthcare_review_requires_approver(self):
        self.handler.require_approver = lambda: None
        self.handler.healthcare_review_details()
        self.assertFalse(hasattr(self, 'result'))
