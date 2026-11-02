const isLive=import.meta.env.PUBLIC_SITE_LIVE==="true";
export const GET=()=>new Response(isLive?"User-agent: *\nAllow: /\n\nSitemap: https://klyuchevoe-reshenie.ru/sitemap.xml\n":"User-agent: *\nDisallow: /\n",{headers:{"Content-Type":"text/plain; charset=utf-8"}});
