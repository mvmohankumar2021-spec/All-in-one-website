import sqlite3
import unittest
import feedback_service as f

class FeedbackTests(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:');self.db.row_factory=sqlite3.Row
        self.db.execute('CREATE TABLE accounts(id INTEGER PRIMARY KEY,first_name TEXT)')
        self.db.executemany('INSERT INTO accounts VALUES(?,?)',[(i,'Test') for i in range(1,7)])
        f.schema(self.db)
    def tearDown(self): self.db.close()
    def actor(self,i=1,role='Customer'): return {'id':i,'role':role}
    def submit(self,i=1,title='Better search',role='Customer'):
        return f.change(self.db,self.actor(i,role),{'action':'submit','title':title,'body':'Please improve this search.','category':'Improvement'})['reference']
    def test_roles(self):
        for role in f.USERS:self.submit(role=role)
        for role in f.STAFF:
            with self.assertRaises(PermissionError): self.submit(role=role)
        with self.assertRaises(PermissionError):f.listing(self.db,self.actor(role='Unknown'))
    def test_unique_counts_and_private_bodies(self):
        self.submit();self.submit();self.submit(2,title='BETTER SEARCH')
        item=f.listing(self.db,self.actor())['topics'][0]
        self.assertEqual(item['count'],2);self.assertEqual(len(item['entries']),2)
        self.assertNotIn('account',item['entries'][0])
        self.assertEqual(f.listing(self.db,self.actor(3))['topics'],[])
        self.assertEqual(len(f.listing(self.db,self.actor(role='Admin'))['topics'][0]['entries']),3)
    def test_merge_preserves_entries_and_unique_counts(self):
        a=self.submit();b=self.submit(title='Improve finding products');self.submit(2,title='Improve finding products')
        f.change(self.db,self.actor(role='Employee'),{'action':'merge','topic':b,'target':a})
        items=f.listing(self.db,self.actor(2))['topics']
        self.assertEqual(len(items),1);self.assertEqual(items[0]['count'],2)
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM feedback_entries').fetchone()[0],3)
    def test_review_authorization_and_validation(self):
        tid=self.submit();data={'action':'review','topic':tid,'status':'Completed','reply':'Done'}
        with self.assertRaises(PermissionError):f.change(self.db,self.actor(),data)
        f.change(self.db,self.actor(role='Employee'),data)
        self.assertEqual(f.listing(self.db,self.actor())['topics'][0]['reply'],'Done')
        data.update(status='Not planned',reply='')
        with self.assertRaises(ValueError):f.change(self.db,self.actor(role='Admin'),data)
    def test_limits_and_invalid_merge(self):
        for _ in range(10):self.submit()
        with self.assertRaises(ValueError):self.submit()
        with self.assertRaises(ValueError):f.change(self.db,self.actor(role='Admin'),{'action':'merge','topic':1,'target':1})
        with self.assertRaises(ValueError):f.change(self.db,self.actor(2),{'action':'submit','title':'x','body':'x','category':'Bug'})

if __name__=='__main__':unittest.main()
