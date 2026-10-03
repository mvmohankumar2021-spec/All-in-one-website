"""Signed-in public text channels; follower identities never leave this module."""
import time

def schema(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS chat_channels(id INTEGER PRIMARY KEY,name TEXT NOT NULL,owner INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS channel_followers(channel INTEGER,account INTEGER,PRIMARY KEY(channel,account));
    CREATE TABLE IF NOT EXISTS channel_updates(id INTEGER PRIMARY KEY,channel INTEGER,body TEXT,created INTEGER);
    CREATE TABLE IF NOT EXISTS channel_reactions(update_id INTEGER,account INTEGER,emoji TEXT,PRIMARY KEY(update_id,account));
    ''')

def state(db, me):
    channels=[]
    for c in db.execute('SELECT * FROM chat_channels ORDER BY id DESC'):
        item={'id':c['id'],'name':c['name'],'admin':c['owner']==me,
              'following':bool(db.execute('SELECT 1 FROM channel_followers WHERE channel=? AND account=?',(c['id'],me)).fetchone()),
              'followers':db.execute('SELECT COUNT(*) FROM channel_followers WHERE channel=?',(c['id'],)).fetchone()[0]}
        item['updates']=[]
        for p in db.execute('SELECT id,body,created FROM channel_updates WHERE channel=? ORDER BY id DESC LIMIT 50',(c['id'],)):
            post=dict(p)
            post['reactions']=[dict(r) for r in db.execute('SELECT emoji,COUNT(*) AS count FROM channel_reactions WHERE update_id=? GROUP BY emoji',(p['id'],))]
            own=db.execute('SELECT emoji FROM channel_reactions WHERE update_id=? AND account=?',(p['id'],me)).fetchone()
            post['mine']=own[0] if own else None
            item['updates'].append(post)
        channels.append(item)
    return channels

def change(db, me, data):
    action=data['action']
    if action=='channelCreate':
        name=str(data.get('name','')).strip()
        if not 1<=len(name)<=80: raise ValueError('Enter a channel name of up to 80 characters.')
        if db.execute('SELECT COUNT(*) FROM chat_channels WHERE owner=?',(me,)).fetchone()[0]>=20: raise ValueError('Local preview supports up to 20 channels per account.')
        cid=db.execute('INSERT INTO chat_channels(name,owner) VALUES(?,?)',(name,me)).lastrowid
        db.execute('INSERT INTO channel_followers VALUES(?,?)',(cid,me));return {'ok':True}
    cid=data.get('channel')
    c=db.execute('SELECT * FROM chat_channels WHERE id=?',(cid,)).fetchone()
    if not c: raise ValueError('Channel unavailable.')
    if action=='channelFollow':
        db.execute('INSERT OR IGNORE INTO channel_followers VALUES(?,?)',(cid,me));return {'ok':True}
    if action=='channelUnfollow':
        db.execute('DELETE FROM channel_followers WHERE channel=? AND account=?',(cid,me));return {'ok':True}
    if action=='channelPublish':
        if c['owner']!=me: raise ValueError('Only the channel admin can publish updates.')
        body=str(data.get('body','')).strip()
        if not 1<=len(body)<=4000: raise ValueError('Write an update of up to 4,000 characters.')
        db.execute('INSERT INTO channel_updates(channel,body,created) VALUES(?,?,?)',(cid,body,int(time.time())));return {'ok':True}
    if action=='channelReact':
        if not db.execute('SELECT 1 FROM channel_followers WHERE channel=? AND account=?',(cid,me)).fetchone(): raise ValueError('Follow this channel to react.')
        pid=data.get('update')
        if not db.execute('SELECT 1 FROM channel_updates WHERE id=? AND channel=?',(pid,cid)).fetchone(): raise ValueError('Update unavailable.')
        emoji=data.get('emoji')
        if emoji not in ('👍','❤️','🎉','😂',None): raise ValueError('Unsupported reaction.')
        db.execute('DELETE FROM channel_reactions WHERE update_id=? AND account=?',(pid,me))
        if emoji: db.execute('INSERT INTO channel_reactions VALUES(?,?,?)',(pid,me,emoji))
        return {'ok':True}
    raise ValueError('Unknown channel action.')
