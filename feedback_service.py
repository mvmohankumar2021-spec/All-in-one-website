"""Role-scoped feedback and unique contributor aggregation."""
import time

STAFF={'Admin','Employee'}
USERS={'Customer','Vendor','Agent'}
STATUSES=('New','Under review','Planned','In progress','Completed','Not planned')
CATEGORIES=('Bug','Improvement','New feature','General feedback')
THANKS='Thank you for your valuable feedback. Your suggestion helps us improve SHAKALPA.'

def schema(db):
    db.executescript('''
    CREATE TABLE IF NOT EXISTS feedback_topics(id INTEGER PRIMARY KEY,title TEXT,category TEXT,status TEXT DEFAULT 'New',reply TEXT DEFAULT '',created INTEGER,merged_into INTEGER);
    CREATE TABLE IF NOT EXISTS feedback_entries(id INTEGER PRIMARY KEY,topic INTEGER,account INTEGER,body TEXT,created INTEGER);
    CREATE INDEX IF NOT EXISTS feedback_entries_topic ON feedback_entries(topic,account);
    CREATE TABLE IF NOT EXISTS feedback_events(id INTEGER PRIMARY KEY,topic INTEGER,message TEXT,created INTEGER);
    ''')

def listing(db, actor):
    staff=actor['role'] in STAFF
    if not staff and actor['role'] not in USERS: raise PermissionError('Feedback is unavailable for this account.')
    query='SELECT * FROM feedback_topics WHERE merged_into IS NULL'
    args=()
    if not staff:
        query+=' AND id IN (SELECT topic FROM feedback_entries WHERE account=?)';args=(actor['id'],)
    result=[]
    for r in db.execute(query+' ORDER BY id DESC',args):
        item=dict(r);item.pop('merged_into')
        item['count']=db.execute('SELECT COUNT(DISTINCT account) FROM feedback_entries WHERE topic=?',(r['id'],)).fetchone()[0]
        item['entries']=[dict(e) for e in db.execute('SELECT body,created'+(',account' if staff else '')+' FROM feedback_entries WHERE topic=?'+('' if staff else ' AND account=?')+' ORDER BY id',(r['id'],) if staff else (r['id'],actor['id']))]
        item['events']=[dict(e) for e in db.execute('SELECT message,created FROM feedback_events WHERE topic=? ORDER BY id DESC LIMIT 20',(r['id'],))]
        result.append(item)
    return {'staff':staff,'topics':result}

def change(db,actor,data):
    role=actor['role'];me=actor['id'];now=int(time.time());action=data.get('action')
    if action=='submit':
        if role not in USERS: raise PermissionError('Only Customers, Vendors and Agents can submit feedback.')
        title=str(data.get('title','')).strip();body=str(data.get('body','')).strip();category=data.get('category')
        if not 3<=len(title)<=120 or not 5<=len(body)<=4000 or category not in CATEGORIES: raise ValueError('Enter a title, category and description within the limits.')
        if db.execute('SELECT COUNT(*) FROM feedback_entries WHERE account=? AND created>?',(me,now-3600)).fetchone()[0]>=10: raise ValueError('Feedback limit reached. Please try again later.')
        # Serialize exact-duplicate grouping. Similar wording is merged only by staff.
        db.execute('UPDATE accounts SET first_name=first_name WHERE id=?',(me,))
        row=db.execute('SELECT id FROM feedback_topics WHERE lower(title)=lower(?) AND category=? AND merged_into IS NULL',(title,category)).fetchone()
        tid=row[0] if row else db.execute('INSERT INTO feedback_topics(title,category,created) VALUES(?,?,?)',(title,category,now)).lastrowid
        db.execute('INSERT INTO feedback_entries(topic,account,body,created) VALUES(?,?,?,?)',(tid,me,body,now))
        return {'message':THANKS,'reference':tid}
    if role not in STAFF: raise PermissionError('Only Admins and Employees can review feedback.')
    tid=data.get('topic')
    if not isinstance(tid,int) or not db.execute('SELECT 1 FROM feedback_topics WHERE id=? AND merged_into IS NULL',(tid,)).fetchone(): raise ValueError('Feedback unavailable.')
    if action=='review':
        status=data.get('status');reply=str(data.get('reply','')).strip()
        if status not in STATUSES or len(reply)>2000: raise ValueError('Choose a valid status and a reply up to 2,000 characters.')
        if status=='Not planned' and not reply: raise ValueError('Explain why this feedback is not planned.')
        db.execute('UPDATE feedback_topics SET status=?,reply=? WHERE id=?',(status,reply,tid))
        db.execute('INSERT INTO feedback_events(topic,message,created) VALUES(?,?,?)',(tid,status,now))
        return {'message':'Feedback updated.'}
    if action=='merge':
        target=data.get('target')
        if not isinstance(target,int) or target==tid or not db.execute('SELECT 1 FROM feedback_topics WHERE id=? AND merged_into IS NULL',(target,)).fetchone(): raise ValueError('Choose a different active feedback reference.')
        db.execute('UPDATE feedback_entries SET topic=? WHERE topic=?',(target,tid))
        db.execute('UPDATE feedback_events SET topic=? WHERE topic=?',(target,tid))
        db.execute('UPDATE feedback_topics SET merged_into=? WHERE id=?',(target,tid))
        db.execute('INSERT INTO feedback_events(topic,message,created) VALUES(?,?,?)',(target,'Similar feedback combined.',now))
        return {'message':'Feedback combined. Each user is counted once.'}
    raise ValueError('Unknown feedback action.')
