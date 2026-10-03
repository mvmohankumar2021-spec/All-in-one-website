"""Private communities: invite codes, approval, announcements, optional group links."""
import secrets
import time

def schema(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS communities(id INTEGER PRIMARY KEY,name TEXT,code TEXT UNIQUE);
    CREATE TABLE IF NOT EXISTS community_members(community INTEGER,account INTEGER,admin INTEGER DEFAULT 0,PRIMARY KEY(community,account));
    CREATE TABLE IF NOT EXISTS community_requests(community INTEGER,account INTEGER,PRIMARY KEY(community,account));
    CREATE TABLE IF NOT EXISTS community_posts(id INTEGER PRIMARY KEY,community INTEGER,body TEXT,created INTEGER);
    CREATE TABLE IF NOT EXISTS community_groups(community INTEGER,room INTEGER,PRIMARY KEY(community,room));
    ''')

def state(db, me):
    result=[]
    for c in db.execute('SELECT c.*,m.admin FROM communities c JOIN community_members m ON m.community=c.id WHERE m.account=?',(me,)):
        item={'id':c['id'],'name':c['name'],'admin':bool(c['admin'])}
        item['members']=[{'userId':m['user_id'],'admin':bool(m['admin'])} for m in db.execute('SELECT u.user_id,m.admin FROM community_members m JOIN chat_users u ON u.account_id=m.account WHERE community=?',(c['id'],))]
        item['announcements']=[dict(p) for p in db.execute('SELECT id,body,created FROM community_posts WHERE community=? ORDER BY id DESC LIMIT 50',(c['id'],))]
        # Existing group membership remains independent; never grant history access via a link.
        item['groups']=[{'id':r['id'],'title':r['title'],'joined':bool(r['joined'])} for r in db.execute('SELECT r.id,r.title,EXISTS(SELECT 1 FROM chat_members m WHERE m.room=r.id AND m.account=?) AS joined FROM community_groups g JOIN chat_rooms r ON r.id=g.room WHERE g.community=?',(me,c['id']))]
        if c['admin']:
            item['code']=c['code']
            item['requests']=[dict(r) for r in db.execute('SELECT u.user_id FROM community_requests q JOIN chat_users u ON u.account_id=q.account WHERE q.community=?',(c['id'],))]
        result.append(item)
    return result

def change(db, me, data):
    action=data['action']
    if action=='communityCreate':
        name=str(data.get('name','')).strip()
        if not 1<=len(name)<=80: raise ValueError('Enter a community name (up to 80 characters).')
        cid=db.execute('INSERT INTO communities(name,code) VALUES(?,?)',(name,secrets.token_urlsafe(12))).lastrowid
        db.execute('INSERT INTO community_members VALUES(?,?,1)',(cid,me));return {'ok':True}
    if action=='communityRequest':
        c=db.execute('SELECT id FROM communities WHERE code=?',(str(data.get('code','')).strip(),)).fetchone()
        if not c: raise ValueError('Invalid community invitation code.')
        if not db.execute('SELECT 1 FROM community_members WHERE community=? AND account=?',(c[0],me)).fetchone():
            db.execute('INSERT OR IGNORE INTO community_requests VALUES(?,?)',(c[0],me))
        return {'message':'Request sent. A community admin must approve it.'}
    cid=data.get('community')
    membership=db.execute('SELECT * FROM community_members WHERE community=? AND account=?',(cid,me)).fetchone()
    if not membership: raise ValueError('Community unavailable.')
    if action=='communityLeave':
        if membership['admin']: raise ValueError('Transfer admin ownership before leaving.')
        db.execute('DELETE FROM community_members WHERE community=? AND account=?',(cid,me));return {'ok':True}
    if not membership['admin']: raise ValueError('Only community admins can do this.')
    if action in ('communityApprove','communityReject','communityTransfer','communityRemove'):
        target=db.execute('SELECT account_id FROM chat_users WHERE user_id=?',(data.get('userId'),)).fetchone()
        if not target or target[0]==me: raise ValueError('Choose another member.')
        who=target[0]
        if action in ('communityApprove','communityReject'):
            if not db.execute('SELECT 1 FROM community_requests WHERE community=? AND account=?',(cid,who)).fetchone(): raise ValueError('Request unavailable.')
            if action=='communityApprove':
                if db.execute('SELECT 1 FROM chat_blocks WHERE (owner=? AND blocked=?) OR (owner=? AND blocked=?)',(me,who,who,me)).fetchone(): raise ValueError('Cannot approve a blocked user.')
                db.execute('INSERT OR IGNORE INTO community_members VALUES(?,?,0)',(cid,who))
            db.execute('DELETE FROM community_requests WHERE community=? AND account=?',(cid,who))
        elif action=='communityTransfer':
            if not db.execute('UPDATE community_members SET admin=1 WHERE community=? AND account=?',(cid,who)).rowcount: raise ValueError('Member unavailable.')
            db.execute('UPDATE community_members SET admin=0 WHERE community=? AND account=?',(cid,me))
        else: db.execute('DELETE FROM community_members WHERE community=? AND account=? AND admin=0',(cid,who))
        return {'ok':True}
    if action=='communityAnnounce':
        body=str(data.get('body','')).strip()
        if not 1<=len(body)<=4000: raise ValueError('Write an announcement of up to 4,000 characters.')
        db.execute('INSERT INTO community_posts(community,body,created) VALUES(?,?,?)',(cid,body,int(time.time())));return {'ok':True}
    if action=='communityRotate':
        db.execute('UPDATE communities SET code=? WHERE id=?',(secrets.token_urlsafe(12),cid));return {'ok':True}
    if action in ('communityLink','communityUnlink'):
        room=data.get('room')
        if action=='communityLink':
            if not db.execute("SELECT 1 FROM chat_members m JOIN chat_rooms r ON r.id=m.room WHERE m.room=? AND m.account=? AND m.admin=1 AND r.kind='group'",(room,me)).fetchone(): raise ValueError('You must administer the group to link it.')
            db.execute('INSERT OR IGNORE INTO community_groups VALUES(?,?)',(cid,room))
        else: db.execute('DELETE FROM community_groups WHERE community=? AND room=?',(cid,room))
        return {'ok':True}
    raise ValueError('Unknown community action.')
