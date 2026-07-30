(() => {
  const localKey = 'texasHomeHubSavedHomes';
  const config = window.THH_SUPABASE_CONFIG || {};
  const client = window.supabase && config.url && config.anonKey && !config.url.includes('YOUR-')
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;

  const readLocal = () => {
    try { return JSON.parse(localStorage.getItem(localKey) || '[]').map(Number); }
    catch { return []; }
  };
  const writeLocal = (ids) => localStorage.setItem(localKey, JSON.stringify([...new Set(ids.map(Number))]));

  async function currentUser() {
    if (!client) return null;
    const { data } = await client.auth.getUser();
    return data.user || null;
  }

  async function getSavedIds() {
    const user = await currentUser();
    if (!user) return readLocal();
    const { data, error } = await client.from('saved_properties').select('property_id').eq('user_id', user.id);
    if (error) throw error;
    return data.map((row) => Number(row.property_id));
  }

  async function toggleSaved(propertyId) {
    const id = Number(propertyId);
    const user = await currentUser();
    if (!user) {
      const ids = readLocal();
      const next = ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
      writeLocal(next);
      return next.includes(id);
    }
    const { data } = await client.from('saved_properties').select('id').eq('user_id', user.id).eq('property_id', id).maybeSingle();
    if (data) await client.from('saved_properties').delete().eq('id', data.id);
    else await client.from('saved_properties').insert({ user_id: user.id, property_id: id });
    return !data;
  }

  async function submitShowing(payload) {
    const user = await currentUser();
    if (!client) {
      localStorage.setItem('texasHomeHubLatestShowingRequest', JSON.stringify({ ...payload, createdAt: new Date().toISOString() }));
      return { mode: 'local' };
    }
    const { error } = await client.from('showing_requests').insert({ ...payload, user_id: user?.id || null });
    if (error) throw error;
    return { mode: 'supabase' };
  }

  window.THHPropertyEngagement = { getSavedIds, toggleSaved, submitShowing, hasSupabase: Boolean(client) };
})();