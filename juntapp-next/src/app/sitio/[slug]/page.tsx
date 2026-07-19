import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import WebsiteRenderer from '@/components/website/WebsiteRenderer';
import { DEFAULT_CONTENT, DEFAULT_THEME } from '@/lib/website';
export default async function PublicCommunityPage({params}:PageProps<'/sitio/[slug]'>){const {slug}=await params;const supabase=await createClient();const {data:page}=await supabase.rpc('get_public_website',{p_slug:slug});if(!page)notFound();return <WebsiteRenderer name={page.name} template={page.template} content={{...DEFAULT_CONTENT,...page.content}} theme={{...DEFAULT_THEME,...page.theme}} logo={page.logo_url} hero={page.hero_image_url} gallery={page.gallery??[]}/>}
