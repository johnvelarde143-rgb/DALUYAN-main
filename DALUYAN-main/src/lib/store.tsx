import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { backend, supabase } from "./supabase";
import type {
  Listing,
  Post,
  ActivityEvent,
  SavedItem,
  Itinerary,
  Profile,
  PostCategory,
  PostVisibility,
} from "./types";
import { classify } from "./intelligence";
type NewPost = Pick<
  Post,
  "body" | "listing_id" | "municipality" | "post_type"
> &
  Partial<
    Pick<
      Post,
      "rating" | "parent_id" | "media_urls" | "category" | "feedback_status"
    >
  > & { visibility?: PostVisibility; category?: PostCategory | string | null };
function useStoreValue() {
  const requestVersion = useRef(0);
  const currentUser = useRef<string | undefined>(undefined);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [saved, setSaved] = useState<SavedItem[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsMfa, setNeedsMfa] = useState(false);
  const [role, setRole] = useState("tourist");
  const [aal, setAal] = useState("aal1");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [interests, setInterestState] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const notify = useCallback((s: string) => setToast(s), []);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(""), 6500);
      return () => clearTimeout(timer);
    }
  }, [toast]);
  useEffect(() => {
    if (!supabase) {
      setError(
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to use DALUYAN.",
      );
      setAuthReady(true);
      return;
    }
    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      if (currentUser.current !== s?.user.id) {
        currentUser.current = s?.user.id;
        requestVersion.current++;
        setPosts([]);
        setEvents([]);
        setSaved([]);
        setItineraries([]);
        setProfile(null);
        setRole("tourist");
        setAal("aal1");
        setNeedsMfa(false);
      }
      setSession(s);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  const uid = session?.user.id;
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("daluyan.interests." + (uid ?? "guest")) ?? "[]",
      );
      setInterestState(
        Array.isArray(saved)
          ? saved.filter((x): x is string => typeof x === "string")
          : [],
      );
    } catch {
      setInterestState([]);
    }
  }, [uid]);
  function setInterests(next: string[]) {
    setInterestState(next);
    try {
      localStorage.setItem(
        "daluyan.interests." + (uid ?? "guest"),
        JSON.stringify(next),
      );
    } catch {
      notify(
        "Preferences apply to this visit; browser storage is unavailable.",
      );
    }
  }
  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    const isCurrent = () => version === requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const client = backend();
      const queries = await Promise.all([
        client.from("listings").select("*").order("name"),
        client
          .from("posts")
          .select("*,profiles!posts_author_id_fkey(display_name,avatar_url,avatar_type,avatar_id)")
          .order("created_at", { ascending: false })
          .limit(500),
        client
          .from("activity_events")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      queries.forEach((r) => {
        if (r.error) throw r.error;
      });
      if (!isCurrent()) return;
      setListings(queries[0].data as Listing[]);
      setPosts(queries[1].data as Post[]);
      setEvents(queries[2].data as ActivityEvent[]);
      if (uid) {
        const q = await Promise.all([
          client.from("saved_items").select("*").eq("user_id", uid),
          client.from("itineraries").select("*").eq("user_id", uid),
          client.from("profiles").select("*").eq("id", uid).single(),
          client
            .from("user_roles")
            .select("role")
            .eq("user_id", uid)
            .single(),
          client.auth.mfa.getAuthenticatorAssuranceLevel(),
        ]);
        q.forEach((r) => {
          if (r.error) throw r.error;
        });
        if (!isCurrent()) return;
        setSaved(q[0].data as SavedItem[]);
        setItineraries(q[1].data as Itinerary[]);
        setProfile(q[2].data as Profile);
        setRole(q[3].data?.role ?? "tourist");
        setAal(q[4].data?.currentLevel ?? "aal1");
        setNeedsMfa(
          q[4].data?.nextLevel === "aal2" && q[4].data.currentLevel !== "aal2",
        );
      } else {
        setSaved([]);
        setItineraries([]);
        setProfile(null);
        setRole("tourist");
        setAal("aal1");
        setNeedsMfa(false);
      }
    } catch (e) {
      if (!isCurrent()) return;
      setError(
        e instanceof Error
          ? e.message
          : String((e as { message?: string }).message ?? e),
      );
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [uid]);
  useEffect(() => {
    if (authReady) void refresh();
  }, [authReady, refresh]);
  useEffect(() => {
    if (!supabase || !uid) return;
    const channel = supabase
      .channel("personal-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_events",
          filter: `recipient_id=eq.${uid}`,
        },
        () => {
          void refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase?.removeChannel(channel);
    };
  }, [uid, refresh]);
  async function run(task: () => Promise<unknown>, message = "Saved") {
    try {
      await task();
      notify(message);
      await refresh();
      return true;
    } catch (e) {
      notify(
        e instanceof Error
          ? e.message
          : String((e as { message?: string }).message ?? e),
      );
      return false;
    }
  }
  function requireUser() {
    if (!uid) throw new Error("Sign in to save, publish or interact.");
    if (needsMfa)
      throw new Error(
        "Complete your authenticator challenge in the sign-in page first.",
      );
    return uid;
  }
  async function publish(p: NewPost) {
    const author_id = requireUser();
    const { error } = await backend()
      .from("posts")
      .insert({
        ...p,
        author_id,
        rating: p.rating ?? null,
        parent_id: p.parent_id ?? null,
        media_urls: p.media_urls ?? [],
        visibility: p.visibility ?? "public",
        category: p.category ?? null,
        sentiment_label: classify(p.body),
        feedback_status: p.post_type === "feedback" ? "Received" : null,
      });
    if (error) throw error;
  }
  async function editPost(id: string, body: string) {
    const { error } = await backend()
      .from("posts")
      .update({ body, sentiment_label: classify(body) })
      .eq("id", id);
    if (error) throw error;
  }
  async function removePost(id: string, mediaUrls: string[] = []) {
    const paths = mediaUrls.flatMap((url) => {
      const marker = "/object/public/post-media/";
      const index = url.indexOf(marker);
      return index >= 0 ? [decodeURIComponent(url.slice(index + marker.length))] : [];
    });
    if (paths.length) {
      const { error } = await backend().storage.from("post-media").remove(paths);
      if (error) throw error;
    }
    const { error } = await backend().from("posts").delete().eq("id", id);
    if (error) throw error;
  }
  async function interact(post_id: string, event_type: string, reason = "") {
    requireUser();
    const { error } = await backend().rpc("interact", {
      target: post_id,
      kind: event_type,
      reason,
    });
    if (error) throw error;
  }
  async function toggleSave(kind: "listing" | "post", id: string) {
    const user_id = requireUser();
    const existing = saved.find((s) =>
      kind === "listing" ? s.listing_id === id : s.post_id === id,
    );
    const { error } = existing
      ? await backend().from("saved_items").delete().eq("id", existing.id)
      : await backend()
          .from("saved_items")
          .insert({ user_id, [kind + "_id"]: id });
    if (error) throw error;
  }
  async function markRead(id?: string) {
    const { error } = await backend().rpc("mark_notifications_read", {
      target: id ?? null,
    });
    if (error) throw error;
  }
  async function upload(file: File, bucket = "post-media") {
    const user = requireUser();
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 10 * 1024 * 1024
    )
      throw new Error("Use a JPEG, PNG or WebP image under 10 MB.");
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing unavailable");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Cannot compress image"))),
        "image/webp",
        0.82,
      ),
    );
    const path = `${user}/${crypto.randomUUID()}.webp`;
    const { error } = await backend()
      .storage.from(bucket)
      .upload(path, blob, { contentType: "image/webp", upsert: false });
    if (error) throw error;
    return bucket === "feedback-evidence"
      ? path
      : backend().storage.from(bucket).getPublicUrl(path).data.publicUrl;
  }
  return {
    interests,
    setInterests,
    session,
    authReady,
    profile,
    role,
    aal,
    needsMfa,
    isAdmin: role === "admin" && aal === "aal2",
    listings,
    posts,
    events,
    saved,
    itineraries,
    loading,
    error,
    toast,
    notify,
    refresh,
    run,
    publish,
    editPost,
    removePost,
    interact,
    toggleSave,
    markRead,
    upload,
    requireUser,
  };
}
const Context = createContext<ReturnType<typeof useStoreValue> | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useStore() {
  const value = useContext(Context);
  if (!value) throw new Error("Missing StoreProvider");
  return value;
}
