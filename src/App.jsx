import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { Radar, Radio, MessageCircle, UserRound, Bell, Layers3, MapPin, Send, LogIn, LogOut, Plus, RefreshCw, Users, Heart, MessageSquare, Settings, Hash } from "lucide-react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

const tabs = [
  ["radar", "Radar", Radar], ["feed", "Feed", Radio], ["chats", "Chats", MessageCircle],
  ["alerts", "Alerts", Bell], ["profile", "Profile", UserRound]
];

function RadarMap({ layer }) {
  const map = useMap();
  useEffect(() => { map.invalidateSize(); }, [map]);
  const wms = "https://nowcoast.noaa.gov/geoserver/observations/weather_radar/wms";
  return <>
    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
    <TileLayer key={layer}
      url={`${wms}?service=WMS&version=1.1.1&request=GetMap&layers=${layer}&styles=&format=image/png&transparent=true&srs=EPSG:3857&width=512&height=512&bbox={bbox-epsg-3857}`}
      opacity={0.72} attribution="NOAA nowCOAST" />
  </>;
}

function AuthPanel({ onClose }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (!supabase) return setMessage("Connect Supabase in your .env file first.");
    const result = mode === "signup"
      ? await supabase.auth.signUp({ email, password, options: { data: { username } } })
      : await supabase.auth.signInWithPassword({ email, password });
    setMessage(result.error?.message || (mode === "signup" ? "Check your email to confirm your account." : "Signed in."));
  }
  return <div className="modal-backdrop"><form className="modal" onSubmit={submit}>
    <button type="button" className="x" onClick={onClose}>×</button>
    <div className="eyebrow">COLTWX ACCOUNT</div><h2>{mode === "signup" ? "Join the community" : "Welcome back"}</h2>
    {mode === "signup" && <label>Username<input required minLength="3" maxLength="24" value={username} onChange={e=>setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g,""))} placeholder="stormchaser123"/></label>}
    <label>Email<input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></label>
    <label>Password<input type="password" minLength="8" required value={password} onChange={e=>setPassword(e.target.value)} /></label>
    <button className="primary wide">{mode === "signup" ? "Create account" : "Sign in"}</button>
    <button type="button" className="text-button" onClick={()=>setMode(mode==="signup"?"signin":"signup")}>{mode==="signup"?"Already have an account? Sign in":"New here? Create an account"}</button>
    {message && <p className="notice">{message}</p>}
  </form></div>;
}

function App() {
  const [tab, setTab] = useState("radar");
  const [layer, setLayer] = useState("radar:radar_base_reflectivity");
  const [session, setSession] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [posts, setPosts] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("NOAA map overlay · verify freshness before operational use");
  const [profile, setProfile] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [profileBio, setProfileBio] = useState("");
  const [chatRooms, setChatRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [chatStatus, setChatStatus] = useState("");
  const [chaseGroups, setChaseGroups] = useState([]);
  const [activeChaseGroup, setActiveChaseGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupDraft, setGroupDraft] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDescription, setNewGroupDescription] = useState("");
  const [groupStatus, setGroupStatus] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [locationExpiry, setLocationExpiry] = useState("2");
  const [sharedCheckin, setSharedCheckin] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({data}) => setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!supabase || !session) { setProfile(null); return; }
    supabase.from("profiles").select("*").eq("id", session.user.id).single().then(({data}) => {
      if (data) { setProfile(data); setProfileName(data.display_name || ""); setProfileBio(data.bio || ""); }
    });
  }, [session]);

  async function loadPosts() {
    if (!supabase) return;
    setLoading(true);
    const {data, error} = await supabase.from("posts")
      .select("id, body, created_at, user_id, profiles(username, display_name)")
      .order("created_at", {ascending:false}).limit(50);
    if (error) setStatus(error.message); else setPosts(data || []);
    setLoading(false);
  }
  useEffect(() => { if (tab === "feed") loadPosts(); }, [tab]);

  async function createPost(e) {
    e.preventDefault();
    if (!supabase || !session) return setShowAuth(true);
    if (!draft.trim()) return;
    const {error} = await supabase.from("posts").insert({user_id: session.user.id, body:draft.trim()});
    if (error) setStatus(error.message); else { setDraft(""); loadPosts(); }
  }

  async function loadRooms() {
    if (!supabase) return;
    const {data, error} = await supabase.from("chat_rooms").select("*").order("name");
    if (error) setChatStatus(error.message); else {
      setChatRooms(data || []);
      if (!activeRoom && data?.length) setActiveRoom(data[0]);
    }
  }
  async function loadMessages(room) {
    if (!supabase || !room) return;
    const {data, error} = await supabase.from("room_messages")
      .select("id, body, created_at, user_id, profiles(username, display_name)")
      .eq("room_id", room.id).order("created_at", {ascending:true}).limit(100);
    if (error) setChatStatus(error.message); else setMessages(data || []);
  }
  useEffect(() => {
    if (tab === "chats" && supabase) loadRooms();
  }, [tab]);
  useEffect(() => {
    if (!supabase || !activeRoom || tab !== "chats") return;
    loadMessages(activeRoom);
    const channel = supabase.channel("room-" + activeRoom.id)
      .on("postgres_changes", {event:"INSERT", schema:"public", table:"room_messages", filter:"room_id=eq." + activeRoom.id},
        async () => loadMessages(activeRoom)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeRoom, tab]);
  async function sendMessage(e) {
    e.preventDefault();
    if (!session) return setShowAuth(true);
    if (!messageDraft.trim() || !activeRoom) return;
    const {error} = await supabase.from("room_messages").insert({room_id:activeRoom.id, user_id:session.user.id, body:messageDraft.trim()});
    if (error) setChatStatus(error.message); else setMessageDraft("");
  }
  async function loadChaseGroups() {
    if (!supabase || !session) return;
    const {data, error} = await supabase.from("chase_group_members")
      .select("group_id, chase_groups(id, name, description, created_at)")
      .eq("user_id", session.user.id);
    if (error) setGroupStatus(error.message);
    else {
      const groups = (data || []).map(row => row.chase_groups).filter(Boolean);
      setChaseGroups(groups);
      if (!activeChaseGroup && groups.length) setActiveChaseGroup(groups[0]);
    }
  }
  async function createChaseGroup(e) {
    e.preventDefault();
    if (!session) return setShowAuth(true);
    if (!newGroupName.trim()) return;
    const {data, error} = await supabase.from("chase_groups")
      .insert({name:newGroupName.trim(), description:newGroupDescription.trim(), created_by:session.user.id})
      .select().single();
    if (error) return setGroupStatus(error.message);
    setNewGroupName(""); setNewGroupDescription("");
    setGroupStatus("Group created. Invite trusted members using the group invite code.");
    await loadChaseGroups();
    setActiveChaseGroup(data);
  }
  async function loadGroupMessages(group) {
    if (!supabase || !group) return;
    const {data, error} = await supabase.from("chase_group_messages")
      .select("id, body, created_at, user_id, profiles(username, display_name)")
      .eq("group_id",group.id).order("created_at",{ascending:true}).limit(100);
    if (error) setGroupStatus(error.message); else setGroupMessages(data || []);
    const {data:loc} = await supabase.from("chase_group_checkins")
      .select("id, label, expires_at, created_at, profiles(username, display_name)")
      .eq("group_id",group.id).gt("expires_at",new Date().toISOString())
      .order("created_at",{ascending:false});
    setSharedCheckin(loc || []);
  }
  useEffect(() => {
    if (tab === "chats" && session) loadChaseGroups();
  }, [tab, session]);
  useEffect(() => {
    if (!supabase || !activeChaseGroup || tab !== "chats" || !session) return;
    loadGroupMessages(activeChaseGroup);
    const channel = supabase.channel("chase-group-" + activeChaseGroup.id)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"chase_group_messages",filter:"group_id=eq."+activeChaseGroup.id},
        () => loadGroupMessages(activeChaseGroup))
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"chase_group_checkins",filter:"group_id=eq."+activeChaseGroup.id},
        () => loadGroupMessages(activeChaseGroup)).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeChaseGroup, tab, session]);
  async function sendGroupMessage(e) {
    e.preventDefault();
    if (!session) return setShowAuth(true);
    if (!groupDraft.trim() || !activeChaseGroup) return;
    const {error} = await supabase.from("chase_group_messages").insert({
      group_id:activeChaseGroup.id,user_id:session.user.id,body:groupDraft.trim()
    });
    if (error) setGroupStatus(error.message); else setGroupDraft("");
  }
  async function shareApproximateCheckin(e) {
    e.preventDefault();
    if (!session) return setShowAuth(true);
    if (!activeChaseGroup || !locationLabel.trim()) return;
    const expires = new Date(Date.now() + Number(locationExpiry)*60*60*1000).toISOString();
    const {error} = await supabase.from("chase_group_checkins").insert({
      group_id:activeChaseGroup.id,user_id:session.user.id,label:locationLabel.trim(),expires_at:expires
    });
    if (error) setGroupStatus(error.message);
    else { setLocationLabel(""); setGroupStatus("Temporary area check-in shared with this group."); loadGroupMessages(activeChaseGroup); }
  }
  async function saveProfile(e) {
    e.preventDefault();
    if (!session || !supabase) return;
    const {error} = await supabase.from("profiles").update({display_name:profileName.trim(), bio:profileBio.trim()}).eq("id",session.user.id);
    setStatus(error ? error.message : "Profile saved.");
    if (!error) setProfile({...profile, display_name:profileName.trim(), bio:profileBio.trim()});
  }
  async function signOut() { await supabase?.auth.signOut(); setActiveRoom(null); setMessages([]); }

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><div className="brand-mark"><Radar size={22}/></div><div><strong>COLTWX <span>RADAR</span></strong><small>WEATHER • COMMUNITY • FIELD REPORTS</small></div></div>
      <div className="top-actions"><span className="live-dot">SYSTEM ONLINE</span>
        {session ? <button className="icon-btn" title="Sign out" onClick={signOut}><LogOut size={18}/></button> : <button className="sign-in" onClick={()=>setShowAuth(true)}><LogIn size={16}/> Sign in</button>}
      </div>
    </header>
    <main>
      {tab === "radar" && <section className="radar-page">
        <div className="section-heading"><div><div className="eyebrow">NATIONAL WEATHER RADAR</div><h1>Radar operations</h1></div><span className="pill"><i/> MAP MODE</span></div>
        <div className="radar-toolbar"><label className="select-wrap"><Layers3 size={16}/><select value={layer} onChange={e=>setLayer(e.target.value)}><option value="radar:radar_base_reflectivity">Reflectivity</option><option value="radar:radar_base_velocity">Velocity (if available)</option></select></label>
          <button className="outline-btn" onClick={()=>setStatus("Map refresh requested. Check NOAA service timestamp and availability.")}><RefreshCw size={15}/> Refresh</button></div>
        <div className="map-frame"><MapContainer center={[33.9,-86.0]} zoom={7} scrollWheelZoom={true}><RadarMap layer={layer}/></MapContainer>
          <div className="map-label"><MapPin size={13}/> NORTH ALABAMA · REGIONAL VIEW</div><div className="map-legend"><span>LIGHT</span><div className="legend-gradient"/><span>HEAVY</span></div></div>
        <div className="data-note">NOAA public map overlay starter. Not yet a certified Level-II ingestion system or volumetric 3D radar.</div>
        <div className="feature-grid"><div className="feature-card"><b>2D RADAR</b><span>Map and reflectivity overlay</span><small>STARTER ACTIVE</small></div><div className="feature-card disabled"><b>3D RAYCASTING</b><span>Volumetric radar renderer</span><small>PLANNED · LEVEL-II PIPELINE</small></div></div>
      </section>}

      {tab === "feed" && <section className="content-page">
        <div className="eyebrow">COMMUNITY NETWORK</div><h1>Storm feed</h1>
        <form className="composer" onSubmit={createPost}><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Share a weather observation or storm update…" maxLength={2000}/>
          <div className="composer-bottom"><span>{draft.length}/2000</span><button className="primary" type="submit"><Plus size={16}/> Publish post</button></div></form>
        <div className="feed-head"><b>RECENT POSTS</b><button className="text-button" onClick={loadPosts}>Refresh</button></div>
        {loading && <p className="muted">Loading posts…</p>}
        {!supabase && <p className="empty">Connect Supabase to enable community posts and accounts.</p>}
        {posts.map(post=><article className="post" key={post.id}><div className="post-avatar">{(post.profiles?.username || "C")[0].toUpperCase()}</div><div className="post-body"><b>{post.profiles?.display_name || "Storm chaser"} <span className="muted">@{post.profiles?.username || "user"}</span></b><time>{new Date(post.created_at).toLocaleString()}</time><p>{post.body}</p></div></article>)}
      </section>}


      {tab === "chats" && <section className="content-page chats-page">
        <div className="eyebrow">LIVE COMMUNITY</div><h1>Storm chats</h1>
        {!supabase && <div className="empty-card"><MessageCircle size={30}/><h3>Connect the free backend</h3><p>Public rooms and private chase-group chats need Supabase setup.</p></div>}
        {supabase && <>
          <div className="chat-layout">
            <aside className="room-list">
              <b className="room-heading"><Users size={15}/> PUBLIC ROOMS</b>
              {chatRooms.map(room=><button key={room.id} className={"room-button "+(activeRoom?.id===room.id?"selected":"")} onClick={()=>setActiveRoom(room)}><Hash size={15}/><span>{room.name}<small>{room.description}</small></span></button>)}
              <b className="room-heading chase-heading"><Radio size={15}/> MY CHASE GROUPS</b>
              {chaseGroups.map(group=><button key={group.id} className={"room-button "+(activeChaseGroup?.id===group.id?"selected":"")} onClick={()=>setActiveChaseGroup(group)}><Users size={15}/><span>{group.name}<small>{group.description || "Private group chat"}</small></span></button>)}
              {!session && <p className="muted">Sign in to create or join chase groups.</p>}
            </aside>
            <div className="chat-panel">
              <div className="chat-title"><div><b>{activeChaseGroup?.name || activeRoom?.name || "Choose a room"}</b><small>{activeChaseGroup ? "Private chase group" : activeRoom?.description || "Community chat"}</small></div><span className="live-dot">CHAT</span></div>
              <div className="messages">
                {activeChaseGroup ? groupMessages.map(m=><div className={"message "+(m.user_id===session?.user?.id?"mine":"")} key={"g"+m.id}><b>{m.profiles?.display_name || m.profiles?.username || "Storm chaser"}</b><p>{m.body}</p><time>{new Date(m.created_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</time></div>) :
                  messages.map(m=><div className={"message "+(m.user_id===session?.user?.id?"mine":"")} key={"r"+m.id}><b>{m.profiles?.display_name || m.profiles?.username || "Storm chaser"}</b><p>{m.body}</p><time>{new Date(m.created_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</time></div>)}
                {!activeChaseGroup && activeRoom && !messages.length && <div className="chat-empty">No messages yet. Start the conversation.</div>}
                {activeChaseGroup && !groupMessages.length && <div className="chat-empty">Your group's conversation starts here.</div>}
              </div>
              <form className="message-form" onSubmit={activeChaseGroup ? sendGroupMessage : sendMessage}>
                <input value={activeChaseGroup ? groupDraft : messageDraft} onChange={e=>activeChaseGroup?setGroupDraft(e.target.value):setMessageDraft(e.target.value)} placeholder={session?"Message the room…":"Sign in to chat"} maxLength={1500}/>
                <button className="primary" aria-label="Send message"><Send size={16}/></button>
              </form>
              {activeChaseGroup && <div className="checkin-panel">
                <b><MapPin size={14}/> TEMPORARY AREA CHECK-IN</b>
                <p>Share a town, county, or public meetup area with this group. This does not share live GPS or your home address.</p>
                <form onSubmit={shareApproximateCheckin} className="checkin-form">
                  <input value={locationLabel} onChange={e=>setLocationLabel(e.target.value)} placeholder="Example: near Gadsden, AL" maxLength={90}/>
                  <select value={locationExpiry} onChange={e=>setLocationExpiry(e.target.value)}><option value="1">1 hour</option><option value="2">2 hours</option><option value="4">4 hours</option><option value="8">8 hours</option></select>
                  <button className="outline-btn">Share area</button>
                </form>
                {(sharedCheckin || []).map(loc=><div className="shared-location" key={loc.id}><MapPin size={13}/><span><b>{loc.profiles?.display_name || loc.profiles?.username || "Member"}</b> · {loc.label}<small>Expires {new Date(loc.expires_at).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}</small></span></div>)}
              </div>}
              {chatStatus && <p className="notice">{chatStatus}</p>}
              {groupStatus && <p className="notice">{groupStatus}</p>}
            </div>
          </div>
          <form className="create-group" onSubmit={createChaseGroup}>
            <div><b><Users size={16}/> Create a storm-chasing group</b><p>Make a private group for your trusted team, with its own chat and temporary area check-ins.</p></div>
            <input value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="Group name" maxLength={50} required/>
            <input value={newGroupDescription} onChange={e=>setNewGroupDescription(e.target.value)} placeholder="Description (optional)" maxLength={120}/>
            <button className="primary"><Plus size={15}/> Create group</button>
          </form>
          <p className="chat-footnote">Location sharing is opt-in, approximate and temporary. Only share a general public area, never a home address. Group chats are for communication and check-ins, not coordinating unsafe driving or entering hazardous areas. Follow official warnings and local safety guidance.</p>
        </>}
      </section>}
      {tab === "alerts" && <section className="content-page"><div className="eyebrow">WEATHER NOTIFICATIONS</div><h1>Alerts</h1><div className="empty-card"><Bell size={30}/><h3>Official alerts are next</h3><p>NWS warning ingestion and push notifications are planned for a later stage.</p></div></section>}

      {tab === "profile" && <section className="content-page"><div className="eyebrow">YOUR ACCOUNT</div><h1>My profile</h1>
        {!session ? <div className="empty-card"><UserRound size={30}/><h3>Your storm-chaser profile</h3><p>Create an account to publish posts and join public storm rooms.</p><button className="primary" onClick={()=>setShowAuth(true)}>Create account</button></div> :
        <form className="profile-card" onSubmit={saveProfile}><div className="profile-top"><div className="profile-avatar">{(profile?.username||"W")[0].toUpperCase()}</div><div><b>@{profile?.username || "loading"}</b><small>COLTWX COMMUNITY MEMBER</small></div></div>
          <label>Display name<input value={profileName} onChange={e=>setProfileName(e.target.value)} placeholder="Your display name" maxLength={50}/></label>
          <label>Bio<textarea value={profileBio} onChange={e=>setProfileBio(e.target.value)} placeholder="Weather interests, region, spotter experience…" maxLength={240}/></label>
          <button className="primary"><Settings size={15}/> Save profile</button><p className="notice">{status}</p>
        </form>}
      </section>}
    </main>
    <nav className="bottom-nav">{tabs.map(([id,label,Icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><Icon size={20}/><span>{label}</span></button>)}</nav>
    {showAuth && <AuthPanel onClose={()=>setShowAuth(false)}/>}
  </div>;
}
export default App;
