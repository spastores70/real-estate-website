(function(){
  const fallback=()=>window.TEXAS_HOME_LISTINGS||[];
  const normalize=(row)=>({
    id:Number(row.id),title:row.title,address:row.address||'',city:row.city,state:row.state||'TX',zip:row.zip,
    county:row.county||'',price:Number(row.price||0),beds:Number(row.beds||0),baths:Number(row.baths||0),sqft:Number(row.sqft||0),
    lot_sqft:Number(row.lot_sqft||0),year_built:Number(row.year_built||0),type:row.property_type||row.type||'Single Family',
    category:row.category||'Residential',status:row.badge||String(row.status||'Active').replace(/^./,c=>c.toUpperCase()),
    dbStatus:row.status||'active',badge:row.badge||'',description:row.description||'',features:row.features||[],featured:Boolean(row.featured),
    published:row.published!==false,images:(row.property_images||[]).sort((a,b)=>a.sort_order-b.sort_order).map(x=>x.image_url),
    image:(row.property_images||[]).sort((a,b)=>(Number(b.is_primary)-Number(a.is_primary))||(a.sort_order-b.sort_order))[0]?.image_url||row.image||''
  });
  async function getClient(){return window.THHPropertyEngagement?.getClient?.()||null}
  async function listPublic(){
    const client=await getClient(); if(!client)return fallback();
    const {data,error}=await client.from('properties').select('*,property_images(*)').eq('published',true).neq('status','archived').order('featured',{ascending:false}).order('created_at',{ascending:false});
    if(error){console.warn('Using demo property inventory:',error.message);return fallback()}
    return data?.length?data.map(normalize):fallback();
  }
  async function getById(id){
    const client=await getClient();
    if(client){const {data,error}=await client.from('properties').select('*,property_images(*)').eq('id',id).maybeSingle();if(!error&&data)return normalize(data)}
    return fallback().find(x=>Number(x.id)===Number(id))||fallback()[0]||null;
  }
  async function listAdmin(){const client=await getClient();if(!client)throw new Error('Supabase is not configured.');const {data,error}=await client.from('properties').select('*,property_images(*)').order('created_at',{ascending:false});if(error)throw error;return(data||[]).map(normalize)}
  window.THHPropertyRepository={listPublic,getById,listAdmin,getClient,normalize};
})();
