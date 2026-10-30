import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Heart, ImagePlus, Mail, MapPin, Pencil, Phone, Plus, Settings2, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store";
import { backend } from "../lib/supabase";
import type { PostCategory, PostVisibility, Profile } from "../lib/types";
import { Avatar, Empty, PageTitle, Skeleton } from "../components/common";
import { Button } from "../components/ui/button";
import { Modal } from "../components/ui/dialog";
import { PostCard } from "./Home";

type Interest = { category: "spot" | "hobby" | "travel_style"; value: string };

function getAge(birthdate: string | null | undefined) {
  if (!birthdate) return null;
  const birth = new Date(`${birthdate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

function displayDate(value: string | null | undefined) {
  if (!value) return "Not specified yet";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? "Not specified yet"
    : new Intl.DateTimeFormat("en-PH", { dateStyle: "long" }).format(date);
}

function Value({ children }: { children: React.ReactNode }) {
  return <span className="profile-value">{children || "Not specified yet"}</span>;
}

function InfoItem({ icon: Icon, label, children }: { icon: typeof Mail; label: string; children: React.ReactNode }) {
  return (
    <div className="profile-info-item">
      <span className="profile-info-icon"><Icon size={17} /></span>
      <span><small>{label}</small><Value>{children}</Value></span>
    </div>
  );
}

function PreferenceGroup({ title, values, empty = "Not specified yet" }: { title: string; values: string[]; empty?: string }) {
  return (
    <div className="profile-preference-group">
      <small>{title}</small>
      {values.length ? (
        <div className="profile-chips">{values.map((value) => <span key={value}>{value}</span>)}</div>
      ) : <p className="muted">{empty}</p>}
    </div>
  );
}

const postCategories: PostCategory[] = ["Travel Experience", "Tourist Spot", "Cultural Experience", "Festival", "Travel Tips"];

function CreatePostModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const s = useStore();
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [listingId, setListingId] = useState("");
  const [category, setCategory] = useState<PostCategory>("Travel Experience");
  const [visibility, setVisibility] = useState<PostVisibility>("public");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  function reset() {
    setBody(""); setFiles([]); setListingId(""); setCategory("Travel Experience"); setVisibility("public"); setError("");
  }
  function close() { if (!busy) { reset(); onOpenChange(false); } }
  function chooseFiles(next: File[]) {
    if (next.length > 3) return setError("Choose up to 3 photos per post.");
    if (next.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) return setError("Use JPEG, PNG or WebP images only.");
    if (next.some((file) => file.size > 5 * 1024 * 1024)) return setError("Each photo must be 5 MB or smaller.");
    setError(""); setFiles(next);
  }
  const profile = s.profile;
  const listing = s.listings.find((item) => item.id === listingId);
  return (
    <Modal open={open} onOpenChange={(next) => next ? onOpenChange(true) : close()} title="Share your island story">
      <form className="form-stack profile-composer" onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim() && !files.length) return setError("Add a story or at least one photo before publishing.");
        setBusy(true); setError("");
        void s.run(async () => {
          const media_urls: string[] = [];
          for (const file of files) media_urls.push(await s.upload(file));
          await s.publish({ body: body.trim() || "A new Marinduque adventure", listing_id: listingId || null, post_type: "social", municipality: listing?.municipality ?? "Boac", media_urls, category, visibility });
          reset(); onOpenChange(false);
        }, "Adventure published").finally(() => setBusy(false));
      }}>
        <div className="composer-author"><Avatar name={profile?.display_name} url={profile?.avatar_url} avatarType={profile?.avatar_type} avatarId={profile?.avatar_id} /><span><strong>{profile?.full_name || profile?.display_name || "Traveler"}</strong><small>@{profile?.username || "traveler"}</small></span></div>
        <label className="sr-only" htmlFor="profile-post-body">Your Marinduque adventure</label>
        <textarea id="profile-post-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={5000} rows={5} placeholder="Share your Marinduque adventure..." />
        {previews.length > 0 && <div className="composer-previews">{previews.map(({ file, url }) => <div className="composer-preview" key={url}><img src={url} alt={`Preview of ${file.name}`} /><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles((current) => current.filter((item) => item !== file))}><X size={15} /></button></div>)}</div>}
        <div className="composer-tools"><label className="composer-upload"><ImagePlus size={18} /> Add photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => chooseFiles([...files, ...Array.from(event.target.files ?? [])])} /></label><small>Up to 3 photos · 5 MB each</small></div>
        <div className="form-grid">
          <label>Tourist destination<select value={listingId} onChange={(event) => setListingId(event.target.value)}><option value="">No destination tag</option>{s.listings.filter((item) => item.listing_type === "destination" && item.moderation_status === "published").map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
          <label>Category<select value={category} onChange={(event) => setCategory(event.target.value as PostCategory)}>{postCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <label>Visibility<select value={visibility} onChange={(event) => setVisibility(event.target.value as PostVisibility)}><option value="public">Public · visible in Social Discovery</option><option value="private">Only Me · saved to your profile</option></select></label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="row end"><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button disabled={busy || (!body.trim() && !files.length)}>{busy ? "Publishing…" : "Publish post"}</Button></div>
      </form>
    </Modal>
  );
}

export function UserProfilePage() {
  const s = useStore();
  const [interests, setInterests] = useState<Interest[]>([]);
  const [interestError, setInterestError] = useState(false);

  useEffect(() => {
    if (!s.session) return;
    let active = true;
    void backend()
      .from("profile_interests")
      .select("category,value")
      .eq("profile_id", s.session.user.id)
      .then(({ data, error }) => {
        if (!active) return;
        setInterestError(!!error);
        setInterests((data ?? []) as Interest[]);
      });
    return () => { active = false; };
  }, [s.session?.user.id]);

  const profile = s.profile as Profile | null;
  const age = getAge(profile?.birthdate);
  const grouped = useMemo(() => ({
    spots: interests.filter((item) => item.category === "spot").map((item) => item.value),
    hobbies: interests.filter((item) => item.category === "hobby").map((item) => item.value),
    travelStyles: interests.filter((item) => item.category === "travel_style").map((item) => item.value),
  }), [interests]);
  const travelStyles = grouped.travelStyles.length ? grouped.travelStyles : profile?.travel_styles ?? [];
  const activities = profile?.preferred_activities ?? [];
  const email = s.session?.user.email;
  const fullName = profile?.full_name || profile?.display_name || "Traveler";
  const tagline = travelStyles[0] ? `${travelStyles[0]} exploring Marinduque` : "Explorer of Marinduque";
  const [composeOpen, setComposeOpen] = useState(false);
  const posts = useMemo(() => s.posts.filter((post) => post.author_id === s.session?.user.id && post.post_type === "social").sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)), [s.posts, s.session?.user.id]);

  if (s.loading && !profile) return <div className="narrow-page"><Skeleton /></div>;
  if (!profile) {
    return <div className="page"><Empty title="Your profile is almost ready"><p>Complete your registration to see your island identity here.</p><Button asChild><Link to="/settings">Complete profile</Link></Button></Empty></div>;
  }

  return (
    <div className="page profile-page">
      <PageTitle eyebrow="YOUR ISLAND IDENTITY" title="Your profile" description="A personal space for the journeys, interests and details that shape your DALUYAN experience." />
      <section className="profile-hero card">
        <div className="profile-hero-avatar"><Avatar name={fullName} url={profile.avatar_url} avatarType={profile.avatar_type} avatarId={profile.avatar_id} /></div>
        <div className="profile-hero-copy">
          <span className="eyebrow">MEMBER PROFILE</span>
          <h2>{fullName}</h2>
          <p className="profile-username">@{profile.username || "traveler"}</p>
          <p className="profile-tagline"><Sparkles size={16} />{tagline}</p>
          <div className="profile-actions"><Button onClick={() => setComposeOpen(true)}><Plus size={17} />Create Post</Button><Button asChild variant="outline"><Link to="/settings"><Pencil size={16} />Edit profile</Link></Button><Button asChild variant="ghost"><Link to="/settings"><Settings2 size={16} />Account settings</Link></Button></div>
        </div>
      </section>

      <div className="profile-grid">
        <section className="card profile-section">
          <div className="profile-section-heading"><div><span className="eyebrow">THE PERSON BEHIND THE JOURNEY</span><h2>About you</h2></div><Heart size={20} /></div>
          <div className="profile-info-grid">
            <InfoItem icon={Mail} label="Email address">{email}</InfoItem>
            <InfoItem icon={Phone} label="Phone number">{profile.phone_number}</InfoItem>
            <InfoItem icon={CalendarDays} label="Birthdate">{displayDate(profile.birthdate)}</InfoItem>
            <InfoItem icon={Sparkles} label="Age">{age === null ? "Not specified yet" : `${age} years old`}</InfoItem>
            <InfoItem icon={MapPin} label="Gender">{profile.gender}</InfoItem>
            <InfoItem icon={Heart} label="Member since">{displayDate(profile.created_at)}</InfoItem>
          </div>
        </section>

        <section className="card profile-section">
          <div className="profile-section-heading"><div><span className="eyebrow">YOUR MARINDUQUE COMPASS</span><h2>Tourist preferences</h2></div><MapPin size={20} /></div>
          {interestError && <p className="profile-note">Some interests could not be loaded. You can review them in Settings.</p>}
          <div className="profile-preferences">
            <PreferenceGroup title="Places you want to discover" values={grouped.spots} />
            <PreferenceGroup title="Hobbies and interests" values={grouped.hobbies} />
            <PreferenceGroup title="Preferred travel style" values={travelStyles} />
            <PreferenceGroup title="Preferred activities" values={activities} />
            <PreferenceGroup title="Travel budget" values={profile.travel_budget ? [profile.travel_budget] : []} />
          </div>
        </section>
      </div>
      <section className="profile-posts">
        <div className="profile-posts-heading"><div><span className="eyebrow">YOUR ISLAND STORIES</span><h2>My Posts</h2></div>{posts.length > 0 && <Button onClick={() => setComposeOpen(true)}><Plus size={17} />Create Post</Button>}</div>
        {posts.length ? posts.map((post) => <PostCard key={post.id} post={post} />) : <div className="card profile-empty-posts"><Sparkles size={28} /><h3>You haven't shared any adventures yet.</h3><p>Create your first post and inspire other explorers!</p><Button onClick={() => setComposeOpen(true)}><Plus size={17} />Create Your First Post</Button></div>}
      </section>
      <CreatePostModal open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  );
}
