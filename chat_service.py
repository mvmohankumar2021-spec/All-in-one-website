"""Independent, invitation-based chat. No public phone directory or E2EE claims."""
import re
import secrets
import time
import json
import chat_communities
import chat_channels


def schema(db):
    chat_communities.schema(db)
    chat_channels.schema(db)
    db.executescript('''
    CREATE TABLE IF NOT EXISTS chat_users(account_id INTEGER PRIMARY KEY REFERENCES accounts(id), user_id TEXT UNIQUE NOT NULL);
    CREATE TABLE IF NOT EXISTS chat_invites(id INTEGER PRIMARY KEY, sender INTEGER NOT NULL, recipient INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at INTEGER NOT NULL, UNIQUE(sender,recipient));
    CREATE TABLE IF NOT EXISTS chat_contacts(a INTEGER,b INTEGER,PRIMARY KEY(a,b));
    CREATE TABLE IF NOT EXISTS chat_rooms(id INTEGER PRIMARY KEY,title TEXT NOT NULL,kind TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS chat_members(room INTEGER,account INTEGER,admin INTEGER NOT NULL DEFAULT 0,phone_consent INTEGER NOT NULL DEFAULT 0,last_read INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(room,account));
    CREATE TABLE IF NOT EXISTS chat_messages(id INTEGER PRIMARY KEY,room INTEGER NOT NULL,sender INTEGER NOT NULL,body TEXT NOT NULL,created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS chat_messages_room ON chat_messages(room,id);
    CREATE TABLE IF NOT EXISTS chat_blocks(owner INTEGER,blocked INTEGER,PRIMARY KEY(owner,blocked));
    CREATE TABLE IF NOT EXISTS chat_group_invites(room INTEGER,recipient INTEGER,sender INTEGER,PRIMARY KEY(room,recipient));
    CREATE TABLE IF NOT EXISTS chat_calls(id INTEGER PRIMARY KEY,room INTEGER,caller INTEGER,callee INTEGER,video INTEGER,offer TEXT,answer TEXT,status TEXT,expires INTEGER);
    CREATE TABLE IF NOT EXISTS chat_group_icons(room INTEGER PRIMARY KEY,icon TEXT NOT NULL);
    ''')


def identity(db, actor):
    row = db.execute('SELECT user_id FROM chat_users WHERE account_id=?', (actor['id'],)).fetchone()
    if row: return row['user_id']
    name = re.sub('[^a-z0-9]', '', actor['first_name'].lower())[:20] or 'member'
    uid = name + '#' + secrets.token_hex(4)
    db.execute('INSERT OR IGNORE INTO chat_users VALUES(?,?)', (actor['id'], uid))
    return db.execute('SELECT user_id FROM chat_users WHERE account_id=?', (actor['id'],)).fetchone()['user_id']


def blocked(db, a, b):
    return db.execute('SELECT 1 FROM chat_blocks WHERE (owner=? AND blocked=?) OR (owner=? AND blocked=?)', (a,b,b,a)).fetchone() is not None


def member(db, room, actor):
    row = db.execute('SELECT * FROM chat_members WHERE room=? AND account=?', (room,actor)).fetchone()
    if not row: raise ValueError('Conversation unavailable.')
    return row


def state(db, actor, room=None):
    me=actor['id']; uid=identity(db,actor)
    rooms=[]
    for row in db.execute('SELECT r.*,m.last_read FROM chat_rooms r JOIN chat_members m ON r.id=m.room WHERE m.account=? ORDER BY r.id DESC',(me,)):
        peers=list(db.execute('SELECT u.user_id,m.account FROM chat_members m JOIN chat_users u ON u.account_id=m.account WHERE m.room=? AND m.account<>?',(row['id'],me)))
        if row['kind']=='direct' and any(blocked(db,me,p['account']) for p in peers): continue
        unread=db.execute('SELECT COUNT(*) FROM chat_messages WHERE room=? AND id>? AND sender<>?',(row['id'],row['last_read'],me)).fetchone()[0]
        rooms.append({'id':row['id'],'title':row['title'] if row['kind']=='group' else ', '.join(p['user_id'] for p in peers),'kind':row['kind'],'unread':unread})
        icon=db.execute('SELECT icon FROM chat_group_icons WHERE room=?',(row['id'],)).fetchone()
        rooms[-1]['icon']=icon[0] if icon else '👥'
    invites=[dict(r) for r in db.execute("SELECT i.id,u.user_id FROM chat_invites i JOIN chat_users u ON u.account_id=i.sender WHERE i.recipient=? AND i.status='pending' AND NOT EXISTS(SELECT 1 FROM chat_blocks b WHERE (b.owner=i.sender AND b.blocked=i.recipient) OR (b.owner=i.recipient AND b.blocked=i.sender))",(me,))]
    contacts=[{'userId':r['user_id']} for r in db.execute('SELECT u.user_id,u.account_id FROM chat_contacts c JOIN chat_users u ON u.account_id=c.b WHERE c.a=?',(me,)) if not blocked(db,me,r['account_id'])]
    result={'userId':uid,'rooms':rooms,'invites':invites,'contacts':contacts,'groupInvites':[dict(r) for r in db.execute('SELECT r.id,r.title FROM chat_group_invites i JOIN chat_rooms r ON r.id=i.room WHERE i.recipient=?',(me,))]}
    if room is not None:
        membership=member(db,room,me)
        if not any(r['id']==room for r in rooms): raise ValueError('Conversation unavailable.')
        result['messages']=[{'id':r['id'],'userId':r['user_id'],'mine':r['sender']==me,'body':r['body'],'createdAt':r['created_at']} for r in reversed(list(db.execute('SELECT m.*,u.user_id FROM chat_messages m JOIN chat_users u ON u.account_id=m.sender WHERE m.room=? ORDER BY m.id DESC LIMIT 200',(room,))))]
        result['members']=[]
        for r in db.execute('SELECT m.*,u.user_id,a.phone FROM chat_members m JOIN chat_users u ON u.account_id=m.account JOIN accounts a ON a.id=m.account WHERE m.room=?',(room,)):
            item={'userId':r['user_id'],'admin':bool(r['admin'])}
            if membership['admin'] and r['phone_consent']: item['phone']=r['phone']
            result['members'].append(item)
        result['admin']=bool(membership['admin'])
    result['calls']=[]
    for c in db.execute("SELECT c.*,u.user_id FROM chat_calls c JOIN chat_users u ON u.account_id=c.caller WHERE (caller=? OR callee=?) AND expires>? AND status IN ('ringing','accepted')",(me,me,int(time.time()))):
        if blocked(db,c['caller'],c['callee']): continue
        result['calls'].append({'id':c['id'],'room':c['room'],'incoming':c['callee']==me,'userId':c['user_id'],'video':bool(c['video']),'status':c['status'],'offer':json.loads(c['offer']) if c['callee']==me else None,'answer':json.loads(c['answer']) if c['answer'] and c['caller']==me else None})
    result['communities']=chat_communities.state(db,me)
    result['channels']=chat_channels.state(db,me)
    return result


def change(db, actor, data):
    me=actor['id'];identity(db,actor);action=data.get('action');now=int(time.time())
    if isinstance(action,str) and action.startswith('channel'):
        return chat_channels.change(db,me,data)
    if isinstance(action,str) and action.startswith('community'):
        return chat_communities.change(db,me,data)
    if action=='invite':
        if data.get('phone'): raise ValueError('Phone invitations require verified phone numbers and are not enabled yet. Use a user ID.')
        target=db.execute('SELECT account_id FROM chat_users WHERE user_id=?',(str(data.get('userId','')).strip().lower(),)).fetchone()
        if db.execute('SELECT COUNT(*) FROM chat_invites WHERE sender=? AND created_at>?',(me,now-3600)).fetchone()[0]>=10: raise ValueError('Invitation limit reached. Try again later.')
        if target and target[0]!=me and not blocked(db,me,target[0]):
            db.execute('INSERT OR IGNORE INTO chat_invites(sender,recipient,created_at) VALUES(?,?,?)',(me,target[0],now))
        return {'message':'If the user ID is eligible, an invitation is available in their inbox.'}
    if action in ('accept','decline'):
        invitation=db.execute("SELECT * FROM chat_invites WHERE id=? AND recipient=? AND status='pending'",(data.get('id'),me)).fetchone()
        if not invitation or blocked(db,me,invitation['sender']): raise ValueError('Invitation unavailable.')
        db.execute('UPDATE chat_invites SET status=? WHERE id=?',(action,data['id']))
        if action=='accept':
            other=invitation['sender']
            if not db.execute('SELECT 1 FROM chat_contacts WHERE a=? AND b=?',(me,other)).fetchone():
                db.executemany('INSERT OR IGNORE INTO chat_contacts VALUES(?,?)',[(me,other),(other,me)])
                room=db.execute("INSERT INTO chat_rooms(title,kind) VALUES('','direct')").lastrowid
                db.executemany('INSERT INTO chat_members(room,account) VALUES(?,?)',[(room,me),(room,other)])
        return {'ok':True}
    if action=='block':
        target=db.execute('SELECT account_id FROM chat_users WHERE user_id=?',(data.get('userId'),)).fetchone()
        if not target or target[0]==me: raise ValueError('Choose another user.')
        db.execute('INSERT OR IGNORE INTO chat_blocks VALUES(?,?)',(me,target[0]));return {'ok':True}
    if action=='group':
        title=str(data.get('title','')).strip()
        if not 1<=len(title)<=80 or data.get('consent') is not True: raise ValueError('Enter a group name and agree to admin contact-number access.')
        room=db.execute("INSERT INTO chat_rooms(title,kind) VALUES(?,'group')",(title,)).lastrowid
        db.execute('INSERT INTO chat_members(room,account,admin,phone_consent) VALUES(?,?,1,1)',(room,me));return {'room':room}
    room=data.get('room')
    if not isinstance(room,int): raise ValueError('Choose a conversation.')
    if action=='join':
        inv=db.execute('SELECT * FROM chat_group_invites WHERE room=? AND recipient=?',(room,me)).fetchone()
        if not inv or blocked(db,me,inv['sender']) or not db.execute('SELECT 1 FROM chat_members WHERE room=? AND account=? AND admin=1',(room,inv['sender'])).fetchone() or data.get('consent') is not True: raise ValueError('Invitation unavailable or admin contact-number consent missing.')
        db.execute('INSERT OR IGNORE INTO chat_members(room,account,phone_consent) VALUES(?,?,1)',(room,me));db.execute('DELETE FROM chat_group_invites WHERE room=? AND recipient=?',(room,me));return {'ok':True}
    membership=member(db,room,me)
    kind=db.execute('SELECT kind FROM chat_rooms WHERE id=?',(room,)).fetchone()[0]
    if kind=='direct':
        peer=db.execute('SELECT account FROM chat_members WHERE room=? AND account<>?',(room,me)).fetchone()
        if not peer or blocked(db,me,peer[0]): raise ValueError('Conversation unavailable.')
    if action=='send':
        body=str(data.get('body','')).strip()
        if not 1<=len(body)<=4000: raise ValueError('Write a message of up to 4,000 characters.')
        db.execute('INSERT INTO chat_messages(room,sender,body,created_at) VALUES(?,?,?,?)',(room,me,body,now));return {'ok':True}
    if action in ('call','answerCall','endCall'):
        if kind!='direct': raise ValueError('Local calls are available in direct conversations only.')
        db.execute('DELETE FROM chat_calls WHERE expires<?',(now,))
        if action=='endCall':
            db.execute("UPDATE chat_calls SET status='ended',offer='{}',answer=NULL WHERE id=? AND room=? AND (caller=? OR callee=?)",(data.get('id'),room,me,me));return {'ok':True}
        description=data.get('description')
        expected='offer' if action=='call' else 'answer'
        if not isinstance(description,dict) or description.get('type')!=expected or not isinstance(description.get('sdp'),str) or not 1<=len(description['sdp'])<=60000: raise ValueError('Invalid call description.')
        encoded=json.dumps({'type':expected,'sdp':description['sdp']})
        if action=='call':
            # Serialize busy checks and creation across simultaneous callers.
            db.execute('UPDATE chat_users SET user_id=user_id WHERE account_id=?',(me,))
            if db.execute("SELECT 1 FROM chat_calls WHERE status IN ('ringing','accepted') AND expires>? AND (caller IN (?,?) OR callee IN (?,?))",(now,me,peer[0],me,peer[0])).fetchone(): raise ValueError('One of you is already in a call.')
            call=db.execute("INSERT INTO chat_calls(room,caller,callee,video,offer,status,expires) VALUES(?,?,?,?,?,'ringing',?)",(room,me,peer[0],int(data.get('video') is True),encoded,now+60)).lastrowid
            return {'id':call}
        changed=db.execute("UPDATE chat_calls SET answer=?,status='accepted',expires=? WHERE id=? AND room=? AND callee=? AND status='ringing' AND expires>?",(encoded,now+3600,data.get('id'),room,me,now)).rowcount
        if not changed: raise ValueError('Call has ended.')
        return {'ok':True}
    if action=='read':
        db.execute('UPDATE chat_members SET last_read=COALESCE((SELECT MAX(id) FROM chat_messages WHERE room=?),0) WHERE room=? AND account=?',(room,room,me));return {'ok':True}
    if action=='leave' and kind=='group':
        if membership['admin'] and db.execute('SELECT COUNT(*) FROM chat_members WHERE room=?',(room,)).fetchone()[0]>1: raise ValueError('Admin handover is not available yet; contact support to leave this group.')
        db.execute('DELETE FROM chat_members WHERE room=? AND account=?',(room,me))
        if membership['admin']: db.execute('DELETE FROM chat_group_invites WHERE room=?',(room,))
        return {'ok':True}
    if action=='groupIcon' and membership['admin'] and kind=='group':
        icon=data.get('icon')
        if icon not in ('👥','🏡','🎓','💼','🛍️','🎉','⚽','🌸','🎵','❤️','🌍','⭐'): raise ValueError('Choose an available group icon.')
        db.execute('INSERT INTO chat_group_icons(room,icon) VALUES(?,?) ON CONFLICT(room) DO UPDATE SET icon=excluded.icon',(room,icon));return {'ok':True}
    if action=='groupInvite' and membership['admin'] and kind=='group':
        target=db.execute('SELECT u.account_id FROM chat_users u JOIN chat_contacts c ON c.b=u.account_id WHERE c.a=? AND u.user_id=?',(me,data.get('userId'))).fetchone()
        if not target or blocked(db,me,target[0]): raise ValueError('Invite an accepted contact.')
        if db.execute('SELECT 1 FROM chat_members WHERE room=? AND account=?',(room,target[0])).fetchone(): raise ValueError('This user is already a group member.')
        db.execute('INSERT OR IGNORE INTO chat_group_invites VALUES(?,?,?)',(room,target[0],me));return {'ok':True}
    raise ValueError('Action unavailable.')
