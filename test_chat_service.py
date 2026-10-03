import sqlite3
import unittest
import chat_service as chat

class ChatTests(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:');self.db.row_factory=sqlite3.Row
        self.db.execute('CREATE TABLE accounts(id INTEGER PRIMARY KEY,first_name TEXT,phone TEXT)')
        self.db.executemany('INSERT INTO accounts VALUES(?,?,?)',[(1,'One','1111111111'),(2,'Two','2222222222'),(3,'Three','3333333333')])
        chat.schema(self.db)
        self.people=[dict(r) for r in self.db.execute('SELECT * FROM accounts')]
        self.ids=[chat.identity(self.db,p) for p in self.people]
    def do(self,index,**data): return chat.change(self.db,self.people[index],data)
    def connect(self):
        self.do(0,action='invite',userId=self.ids[1]);self.do(1,action='accept',id=1)
    def test_invitation_and_messages(self):
        self.connect();self.do(0,action='send',room=1,body='Hello')
        s=chat.state(self.db,self.people[1],1)
        self.assertEqual(s['messages'][0]['body'],'Hello')
        self.assertNotIn('phone',s['members'][0])
        with self.assertRaises(ValueError):chat.state(self.db,self.people[2],1)
        with self.assertRaises(ValueError):self.do(2,action='send',room=1,body='intrusion')
    def test_block(self):
        self.connect();self.do(1,action='block',userId=self.ids[0])
        with self.assertRaises(ValueError):self.do(0,action='send',room=1,body='blocked')
        self.assertEqual(chat.state(self.db,self.people[0])['rooms'],[])
    def test_group_privacy(self):
        self.connect();r=self.do(0,action='group',title='Friends',consent=True)['room']
        self.do(0,action='groupInvite',room=r,userId=self.ids[1])
        with self.assertRaises(ValueError):self.do(1,action='join',room=r,consent=False)
        self.do(1,action='join',room=r,consent=True)
        self.assertTrue(all('phone' in m for m in chat.state(self.db,self.people[0],r)['members']))
        self.assertTrue(all('phone' not in m for m in chat.state(self.db,self.people[1],r)['members']))
        with self.assertRaises(ValueError):self.do(2,action='join',room=r,consent=True)
    def test_phone_disabled(self):
        with self.assertRaises(ValueError):self.do(0,action='invite',phone='2222222222')
        self.assertNotIn('1111111111',self.ids[0])
    def test_group_icon_permissions(self):
        r=self.do(0,action='group',title='Test',consent=True)['room']
        self.do(0,action='groupIcon',room=r,icon='🎓')
        self.assertEqual(chat.state(self.db,self.people[0])['rooms'][0]['icon'],'🎓')
        with self.assertRaises(ValueError):self.do(1,action='groupIcon',room=r,icon='🏡')
        with self.assertRaises(ValueError):self.do(0,action='groupIcon',room=r,icon='<script>')
    def test_channels(self):
        self.do(0,action='channelCreate',name='Local news')
        c=chat.state(self.db,self.people[1])['channels'][0]
        self.assertFalse(c['admin']);self.assertFalse(c['following'])
        self.assertNotIn('owner',c);self.assertNotIn('members',c)
        with self.assertRaises(ValueError):self.do(1,action='channelPublish',channel=c['id'],body='Unauthorized')
        self.do(0,action='channelPublish',channel=c['id'],body='Welcome')
        p=chat.state(self.db,self.people[1])['channels'][0]['updates'][0]
        with self.assertRaises(ValueError):self.do(1,action='channelReact',channel=c['id'],update=p['id'],emoji='👍')
        self.do(1,action='channelFollow',channel=c['id'])
        self.do(1,action='channelFollow',channel=c['id'])
        self.do(1,action='channelReact',channel=c['id'],update=p['id'],emoji='👍')
        self.do(1,action='channelReact',channel=c['id'],update=p['id'],emoji='❤️')
        c=chat.state(self.db,self.people[1])['channels'][0]
        self.assertEqual(c['followers'],2)
        self.assertEqual(c['updates'][0]['reactions'],[{'emoji':'❤️','count':1}])
        self.do(1,action='channelReact',channel=c['id'],update=p['id'],emoji=None)
        self.do(1,action='channelUnfollow',channel=c['id'])
        self.assertEqual(chat.state(self.db,self.people[1])['channels'][0]['followers'],1)
    def test_community_privacy_and_approval(self):
        self.do(0,action='communityCreate',name='Neighbours')
        c=chat.state(self.db,self.people[0])['communities'][0]
        self.assertEqual(chat.state(self.db,self.people[1])['communities'],[])
        self.do(1,action='communityRequest',code=c['code'])
        with self.assertRaises(ValueError): self.do(1,action='communityAnnounce',community=c['id'],body='No')
        self.do(0,action='communityApprove',community=c['id'],userId=self.ids[1])
        public=chat.state(self.db,self.people[1])['communities'][0]
        self.assertNotIn('code',public)
        self.assertTrue(all('phone' not in m for m in public['members']))
        with self.assertRaises(ValueError): self.do(1,action='communityAnnounce',community=c['id'],body='No')
        self.do(0,action='communityAnnounce',community=c['id'],body='Welcome')
        self.assertEqual(chat.state(self.db,self.people[1])['communities'][0]['announcements'][0]['body'],'Welcome')
        self.do(0,action='communityTransfer',community=c['id'],userId=self.ids[1])
        self.do(0,action='communityLeave',community=c['id'])
        self.assertEqual(chat.state(self.db,self.people[0])['communities'],[])
    def test_community_group_link_does_not_grant_access(self):
        self.do(0,action='communityCreate',name='Test')
        c=chat.state(self.db,self.people[0])['communities'][0]
        self.do(1,action='communityRequest',code=c['code'])
        self.do(0,action='communityApprove',community=c['id'],userId=self.ids[1])
        r=self.do(0,action='group',title='Private',consent=True)['room']
        self.do(0,action='communityLink',community=c['id'],room=r)
        self.assertFalse(chat.state(self.db,self.people[1])['communities'][0]['groups'][0]['joined'])
        with self.assertRaises(ValueError):chat.state(self.db,self.people[1],r)
    def test_call_lifecycle(self):
        self.connect()
        call=self.do(0,action='call',room=1,video=False,description={'type':'offer','sdp':'local test'})['id']
        incoming=chat.state(self.db,self.people[1])['calls'][0]
        self.assertTrue(incoming['incoming'])
        self.assertEqual(chat.state(self.db,self.people[2])['calls'],[])
        with self.assertRaises(ValueError):self.do(2,action='answerCall',room=1,id=call,description={'type':'answer','sdp':'no'})
        with self.assertRaises(ValueError):self.do(0,action='answerCall',room=1,id=call,description={'type':'answer','sdp':'no'})
        self.do(1,action='answerCall',room=1,id=call,description={'type':'answer','sdp':'yes'})
        self.assertEqual(chat.state(self.db,self.people[0])['calls'][0]['answer']['sdp'],'yes')
        self.do(1,action='endCall',room=1,id=call)
        self.assertEqual(chat.state(self.db,self.people[0])['calls'],[])
    def test_blocked_call(self):
        self.connect();self.do(1,action='block',userId=self.ids[0])
        with self.assertRaises(ValueError):self.do(0,action='call',room=1,description={'type':'offer','sdp':'no'})

if __name__=='__main__':unittest.main()
